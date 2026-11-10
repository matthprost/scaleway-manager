import ExpoModulesCore
import Network
import UIKit

// Scaleway redirects to http://localhost:<port>/callback, so we try these ports in order.
private let firstPort: UInt16 = 47815
private let lastPort: UInt16 = 47830
private let maxRequestBytes = 64 * 1024
private let requestTimeout: TimeInterval = 10
private let headerEnd = Data("\r\n\r\n".utf8)

private let replyPage = #"<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=scalewaymanager://auth/done"><title>Scaleway Manager</title></head><body><p>Login received. Returning to Scaleway Manager…</p><p><a href="scalewaymanager://auth/done">Return to the app</a></p></body></html>"#

// Catches the login redirect on 127.0.0.1 and ::1 while the user signs in.
// Never logs the request target: it holds the session token.
public class LoginReceiverModule: Module {
  // All the state below is only touched on this queue.
  private let queue = DispatchQueue(label: "app.scalewaymanager.loginreceiver")
  private var port: UInt16?
  private var listeners: [NWListener] = []
  // iOS 27: a plain socket holding ::1 when Network won't open it next to 127.0.0.1 (see bindLoopback)
  private var heldIPv6: Int32?
  // Listeners still binding, kept alive until they report.
  private var binding: [ObjectIdentifier: (listener: NWListener, report: (NWListener?, NWError?) -> Void)] = [:]
  private var generation = 0
  private var pendingStart: Promise?
  private var rebindWhenActive = false
  private var connections: [ObjectIdentifier: NWConnection] = [:]
  private var callback: String?
  private var waiters: [Promise] = []

  public func definition() -> ModuleDefinition {
    Name("LoginReceiver")

    AsyncFunction("start") { (promise: Promise) in
      self.queue.async {
        self.shutDown()
        self.pendingStart = promise
        self.start(from: firstPort)
      }
    }

    AsyncFunction("nextCallback") { (promise: Promise) in
      self.queue.async {
        if let callback = self.callback {
          promise.resolve(callback)
        } else if self.port == nil && self.pendingStart == nil {
          promise.reject("NOT_STARTED", "The login receiver is not running")
        } else {
          self.waiters.append(promise)
        }
      }
    }

    Function("received") { () -> String? in
      self.queue.sync { self.callback }
    }

    AsyncFunction("stop") { (promise: Promise) in
      self.queue.async {
        self.shutDown()
        promise.resolve()
      }
    }

    // Second chance for a listener the system took back while the app was away.
    OnAppBecomesActive {
      self.queue.async { self.lastRebind() }
    }

    OnDestroy {
      self.queue.sync { self.shutDown() }
    }
  }

  // Tries `port`, then the next ones, until both loopback addresses are free.
  private func start(from port: UInt16) {
    guard let promise = pendingStart else {
      return
    }
    guard port <= lastPort else {
      // Also fails the nextCallback() calls made while it was looking.
      ([promise] + waiters).forEach { $0.reject("NO_PORT", "No free port between \(firstPort) and \(lastPort)") }
      pendingStart = nil
      waiters = []
      return
    }
    bindLoopback(port) { bound in
      guard let bound else {
        self.start(from: port + 1)
        return
      }
      self.port = port
      self.listeners = bound.listeners
      self.heldIPv6 = bound.heldIPv6
      self.pendingStart = nil
      promise.resolve(["port": Int(port)])
    }
  }

  // Binds 127.0.0.1 then ::1 on `port`. Fails unless both are ours (another app could be
  // waiting on ::1); only a phone with no IPv6 loopback gets IPv4 alone. Dropped after stop().
  private func bindLoopback(_ port: UInt16, done: @escaping ((listeners: [NWListener], heldIPv6: Int32?)?) -> Void) {
    let current = generation
    // After stop() or a new start, whatever got bound is closed instead of reported.
    let finish = { (bound: (listeners: [NWListener], heldIPv6: Int32?)?) in
      if current == self.generation {
        done(bound)
      } else {
        bound?.listeners.forEach { $0.cancel() }
        if let held = bound?.heldIPv6 {
          close(held)
        }
      }
    }
    listen(.ipv4(.loopback), port) { ipv4, _ in
      guard let ipv4 else {
        finish(nil)
        return
      }
      guard current == self.generation else {
        ipv4.cancel()
        return
      }
      self.listen(.ipv6(.loopback), port) { ipv6, error in
        let bound = [ipv4, ipv6].compactMap { $0 }
        let noSuchAddress = error == .posix(.EADDRNOTAVAIL)
        // iOS 27: Network won't open ::1 on a port it already holds on 127.0.0.1, yet another app still could.
        // A plain socket holds ::1 instead (bound, not listening): no one else can take it, and the browser,
        // finding no answer there, reaches us on 127.0.0.1. Fails if ::1 is really someone else's.
        var held: Int32?
        if ipv6 == nil && error == .posix(.EADDRINUSE) {
          let socket = Darwin.socket(AF_INET6, SOCK_STREAM, 0)
          var ipv6Only: Int32 = 1
          var address = sockaddr_in6()
          address.sin6_len = UInt8(MemoryLayout<sockaddr_in6>.size)
          address.sin6_family = sa_family_t(AF_INET6)
          address.sin6_port = port.bigEndian
          address.sin6_addr = in6addr_loopback
          let bound = socket >= 0
            && setsockopt(socket, IPPROTO_IPV6, IPV6_V6ONLY, &ipv6Only, socklen_t(MemoryLayout<Int32>.size)) == 0
            && withUnsafePointer(to: &address, {
              $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.bind(socket, $0, socklen_t(MemoryLayout<sockaddr_in6>.size))
              }
            }) == 0
          if bound {
            held = socket
          } else if socket >= 0 {
            close(socket)
          }
        }
        // 127.0.0.1 may have died while ::1 was binding.
        if ipv4.state == .ready && (ipv6 != nil || noSuchAddress || held != nil) {
          finish((listeners: bound, heldIPv6: held))
        } else {
          bound.forEach { $0.cancel() }
          if let held {
            close(held)
          }
          finish(nil)
        }
      }
    }
  }

  // Starts one listener and reports once: ready, or nil plus why it failed.
  private func listen(_ host: NWEndpoint.Host, _ port: UInt16, done: @escaping (NWListener?, NWError?) -> Void) {
    let parameters = NWParameters.tcp
    // No `acceptLocalOnly`: on the simulator it resets every connection, even from Safari.
    parameters.requiredInterfaceType = .loopback
    parameters.requiredLocalEndpoint = .hostPort(host: host, port: NWEndpoint.Port(rawValue: port) ?? .any)
    guard let listener = try? NWListener(using: parameters) else {
      done(nil, nil)
      return
    }
    binding[ObjectIdentifier(listener)] = (listener, done)
    listener.newConnectionHandler = { [weak self] connection in
      self?.accept(connection)
    }
    listener.stateUpdateHandler = { [weak self, weak listener] state in
      guard let self, let listener else {
        return
      }
      if let report = self.binding[ObjectIdentifier(listener)]?.report {
        switch state {
        case .ready:
          self.binding[ObjectIdentifier(listener)] = nil
          report(listener, nil)
        case .failed(let error), .waiting(let error):
          self.binding[ObjectIdentifier(listener)] = nil
          listener.cancel()
          report(nil, error)
        case .cancelled:
          // Cancelled while binding: counts as busy.
          self.binding[ObjectIdentifier(listener)] = nil
          report(nil, nil)
        default:
          break
        }
      } else if self.listeners.contains(where: { $0 === listener }) {
        switch state {
        case .failed, .cancelled:
          self.relisten()
        default:
          break
        }
      }
    }
    listener.start(queue: queue)
  }

  // The system dropped a listener (for example while the app was suspended).
  // Keep the waiters and the port: the browser already has the address.
  private func relisten() {
    let old = listeners
    listeners = []
    old.forEach { $0.cancel() }
    // Freed first, or our own hold would block the new one
    releaseHeldIPv6()
    rebind(lastChance: false)
  }

  private func rebind(lastChance: Bool) {
    guard let port else {
      return
    }
    bindLoopback(port) { bound in
      if let bound {
        self.listeners = bound.listeners
        self.heldIPv6 = bound.heldIPv6
      } else if lastChance {
        let lost = self.waiters
        self.waiters = []
        self.shutDown()
        lost.forEach { $0.reject("LISTENER_LOST", "The login receiver lost its port") }
      } else {
        // Last try when the app becomes active, or in a second if it already is (no event then).
        self.rebindWhenActive = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
          if UIApplication.shared.applicationState == .active {
            self.queue.async { self.lastRebind() }
          }
        }
      }
    }
  }

  // The last try at the same port, if one is still due.
  private func lastRebind() {
    guard rebindWhenActive else {
      return
    }
    rebindWhenActive = false
    rebind(lastChance: true)
  }

  private func accept(_ connection: NWConnection) {
    // Arrived after stop(): drop it.
    guard port != nil else {
      connection.cancel()
      return
    }
    let id = ObjectIdentifier(connection)
    connections[id] = connection
    connection.stateUpdateHandler = { [weak self, weak connection] state in
      switch state {
      case .failed:
        connection?.cancel()
      case .cancelled:
        self?.connections[id] = nil
      default:
        break
      }
    }
    connection.start(queue: queue)
    queue.asyncAfter(deadline: .now() + requestTimeout) { [weak connection] in
      connection?.cancel()
    }
    read(connection, into: Data())
  }

  // Reads up to the end of the headers, at most 64 KB.
  private func read(_ connection: NWConnection, into buffer: Data) {
    connection.receive(minimumIncompleteLength: 1, maximumLength: maxRequestBytes - buffer.count) {
      [weak self] data, _, isComplete, error in
      guard let self else {
        return
      }
      let request = buffer + (data ?? Data())
      if let end = request.range(of: headerEnd) {
        self.reply(to: connection, head: request[..<end.lowerBound])
      } else if error != nil || isComplete || request.count >= maxRequestBytes {
        connection.cancel()
      } else {
        self.read(connection, into: request)
      }
    }
  }

  // The first GET /callback is kept; every callback gets the page, anything else a 404.
  private func reply(to connection: NWConnection, head: Data) {
    // stop() already dropped this connection.
    guard connections[ObjectIdentifier(connection)] != nil else {
      connection.cancel()
      return
    }
    let requestLine = String(decoding: head, as: UTF8.self).split(separator: "\r\n").first ?? ""
    let parts = requestLine.split(separator: " ")
    let target = parts.count == 3 && parts[0] == "GET" ? String(parts[1]) : ""
    let isCallback = target == "/callback" || target.hasPrefix("/callback?")
    let isFirst = isCallback && callback == nil
    let ready = isFirst ? waiters : []
    if isFirst {
      callback = target
      waiters = []
    }
    let response = isCallback
      ? "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n"
        + "Content-Length: \(Data(replyPage.utf8).count)\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n"
        + replyPage
      : "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
    // The page goes out first; only then does the app hear about the callback.
    connection.send(content: Data(response.utf8), completion: .contentProcessed { _ in
      ready.forEach { $0.resolve(target) }
      connection.cancel()
    })
  }

  // Lets go of ::1, if we hold it.
  private func releaseHeldIPv6() {
    if let held = heldIPv6 {
      close(held)
    }
    heldIPv6 = nil
  }

  // Closes everything and forgets the callback. Safe to call twice.
  private func shutDown() {
    generation += 1
    port = nil
    rebindWhenActive = false
    let old = listeners
    listeners = []
    old.forEach { $0.cancel() }
    releaseHeldIPv6()
    binding.values.forEach { $0.listener.cancel() }
    connections.values.forEach { $0.cancel() }
    connections.removeAll()
    callback = nil
    pendingStart?.reject("STOPPED", "The login receiver was stopped")
    pendingStart = nil
    waiters.forEach { $0.reject("STOPPED", "The login receiver was stopped") }
    waiters.removeAll()
  }
}
