// Local web server that catches the login callback.
export type LoginReceiver = {
  callbackUrl: string;
  nextCallback(): Promise<string>;
  received(): string | null;
  stop(): Promise<void>;
};

export type LoginReceiverPort = {
  start(): Promise<LoginReceiver>;
};
