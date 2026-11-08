package app.scalewaymanager.loginreceiver

import android.system.ErrnoException
import android.system.OsConstants
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import kotlin.concurrent.thread

// Scaleway redirects to http://localhost:<port>/callback, so we try these ports in order.
private const val FIRST_PORT = 47815
private const val LAST_PORT = 47830
private const val MAX_REQUEST_BYTES = 64 * 1024
private const val REQUEST_TIMEOUT_MS = 10_000L

private const val REPLY_PAGE =
  """<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=scalewaymanager://auth/done"><title>Scaleway Manager</title></head><body><p>Login received. Returning to Scaleway Manager…</p><p><a href="scalewaymanager://auth/done">Return to the app</a></p></body></html>"""

private val PAGE_BYTES = REPLY_PAGE.toByteArray(Charsets.UTF_8)
private val PAGE_RESPONSE =
  ("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${PAGE_BYTES.size}\r\n" +
    "Cache-Control: no-store\r\nConnection: close\r\n\r\n").toByteArray(Charsets.UTF_8) + PAGE_BYTES
private val NOT_FOUND_RESPONSE =
  "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".toByteArray(Charsets.UTF_8)

// Catches the login redirect on 127.0.0.1 and ::1 while the user signs in.
// Never logs the request target: it holds the session token.
class LoginReceiverModule : Module() {
  // All the state below is guarded by this lock.
  private val lock = Any()
  private var servers: List<ServerSocket> = emptyList()
  private val clients = mutableSetOf<Socket>()
  private var callback: String? = null
  private val waiters = mutableListOf<Promise>()

  override fun definition() = ModuleDefinition {
    Name("LoginReceiver")

    AsyncFunction("start") { promise: Promise ->
      shutDown()
      // Both loopback addresses on one port, so no other app can take the IPv6 one.
      val sockets = (FIRST_PORT..LAST_PORT).firstNotNullOfOrNull { port ->
        val ipv4 = try {
          ServerSocket(port, 4, InetAddress.getByName("127.0.0.1"))
        } catch (e: IOException) {
          return@firstNotNullOfOrNull null
        }
        try {
          listOf(ipv4, ServerSocket(port, 4, InetAddress.getByName("::1")))
        } catch (e: IOException) {
          // No IPv6 loopback: IPv4 alone is fine. Anything else counts as busy (another app
          // could be waiting on ::1), so try the next port.
          if ((e.cause as? ErrnoException)?.errno == OsConstants.EADDRNOTAVAIL) {
            listOf(ipv4)
          } else {
            ipv4.close()
            null
          }
        }
      }
      if (sockets == null) {
        promise.reject("NO_PORT", "No free port between $FIRST_PORT and $LAST_PORT", null)
        return@AsyncFunction
      }
      synchronized(lock) { servers = sockets }
      sockets.forEach { socket -> thread(name = "LoginReceiver", isDaemon = true) { serve(socket) } }
      promise.resolve(mapOf("port" to sockets.first().localPort))
    }

    AsyncFunction("nextCallback") { promise: Promise ->
      val (current, running) = synchronized(lock) {
        if (callback == null && servers.isNotEmpty()) {
          waiters.add(promise)
        }
        callback to servers.isNotEmpty()
      }
      if (current != null) {
        promise.resolve(current)
      } else if (!running) {
        promise.reject("NOT_STARTED", "The login receiver is not running", null)
      }
    }

    Function("received") {
      synchronized(lock) { callback }
    }

    AsyncFunction("stop") {
      shutDown()
    }

    OnDestroy {
      shutDown()
    }
  }

  // Accepts connections until stop() closes the server socket.
  private fun serve(socket: ServerSocket) {
    while (true) {
      val client = try {
        socket.accept()
      } catch (e: IOException) {
        return
      }
      // stop() may have run while accept() was returning.
      val running = synchronized(lock) { socket in servers && clients.add(client) }
      if (!running) {
        runCatching { client.close() }
        return
      }
      thread(isDaemon = true) { handle(client) }
    }
  }

  // The first GET /callback is kept; every callback gets the page, anything else a 404.
  private fun handle(client: Socket) {
    try {
      client.use {
        val head = readHead(client) ?: return
        val parts = head.substringBefore("\r\n").split(" ")
        val target = if (parts.size == 3 && parts[0] == "GET") parts[1] else ""
        val isCallback = target == "/callback" || target.startsWith("/callback?")
        val ready = synchronized(lock) {
          // Ignored if stop() already dropped this connection.
          if (!isCallback || callback != null || client !in clients) {
            return@synchronized emptyList<Promise>()
          }
          callback = target
          waiters.toList().also { waiters.clear() }
        }
        // The page goes out first; only then does the app hear about the callback.
        try {
          client.getOutputStream().apply {
            write(if (isCallback) PAGE_RESPONSE else NOT_FOUND_RESPONSE)
            flush()
          }
        } finally {
          ready.forEach { it.resolve(target) }
        }
      }
    } catch (e: IOException) {
      // Timed out, too big or closed by stop(): drop it.
    } finally {
      synchronized(lock) { clients.remove(client) }
    }
  }

  // Reads up to the end of the headers: at most 64 KB within 10 s, else null.
  private fun readHead(client: Socket): String? {
    val buffer = ByteArray(MAX_REQUEST_BYTES)
    val input = client.getInputStream()
    val deadline = System.currentTimeMillis() + REQUEST_TIMEOUT_MS
    var size = 0
    while (size < MAX_REQUEST_BYTES) {
      val left = deadline - System.currentTimeMillis()
      if (left <= 0) {
        return null
      }
      client.soTimeout = left.toInt()
      val read = input.read(buffer, size, MAX_REQUEST_BYTES - size)
      if (read < 0) {
        return null
      }
      size += read
      val text = String(buffer, 0, size, Charsets.UTF_8)
      val end = text.indexOf("\r\n\r\n")
      if (end >= 0) {
        return text.substring(0, end)
      }
    }

    return null
  }

  // Closes everything and forgets the callback. Safe to call twice.
  private fun shutDown() {
    val (oldServers, oldClients, oldWaiters) = synchronized(lock) {
      val old = Triple(servers, clients.toList(), waiters.toList())
      servers = emptyList()
      clients.clear()
      waiters.clear()
      callback = null
      old
    }
    oldServers.forEach { runCatching { it.close() } }
    oldClients.forEach { runCatching { it.close() } }
    oldWaiters.forEach { it.reject("STOPPED", "The login receiver was stopped", null) }
  }
}
