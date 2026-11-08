import { requireNativeModule } from 'expo';

// Native side: ios/LoginReceiverModule.swift and android/.../LoginReceiverModule.kt.
type LoginReceiverModule = {
  start(): Promise<{ port: number }>;
  nextCallback(): Promise<string>;
  received(): string | null;
  stop(): Promise<void>;
};

const LoginReceiver = requireNativeModule<LoginReceiverModule>('LoginReceiver');

// Starts listening on 127.0.0.1 and ::1 (port 47815, or the next port free on both, up to 47830).
export const start = () => LoginReceiver.start();

// Resolves with the first callback's request target, e.g. `/callback?token=…`.
export const nextCallback = () => LoginReceiver.nextCallback();

// The first callback's request target, or null if none arrived yet.
export const received = () => LoginReceiver.received();

// Closes the listener and every connection. Safe to call twice.
export const stop = () => LoginReceiver.stop();
