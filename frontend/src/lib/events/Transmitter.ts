import AnyEventEmitter, { AnyEventListener } from "./AnyEventEmitter";
import { delay, withTimeout } from "../data/util";
import TransEvent, { ICancelResponse, ITransEventType } from "./TransEvent";

/**
 * A socket that is compatible with socket.io server and client socket.
 */
interface ISocket {
  id: string;
  on: Function;
  off: Function;
  onAny: Function;
  offAny: Function;
  emit: Function;
  connected: boolean;
  connect?: Function;
  disconnect: Function;
  timeout: (value: number) => ISocket;
  emitWithAck: (event: string, ...args: any) => Promise<any>;
}
/**
 * Converted from socket.io native event: connect
 */
export interface IConnectEvent extends ITransEventType {
  type: "connect";
  data: null;
}
/**
 * Converted from socket.io native event: disconnect
 */
export interface IDisconnectEvent extends ITransEventType {
  type: "disconnect";
  data: { reason: string };
}
/**
 * Converted from socket.io native event: disconnecting
 */
export interface IDisconnectingEvent extends ITransEventType {
  type: "disconnecting";
  data: { reason: string };
}
/**
 * Converted from socket.io native event: connect_error
 */
export interface IConnectErrorEvent extends ITransEventType {
  type: "connect_error";
  data: { error: Error };
}
/**
 * Will be transmitted when the socket is changed by setting the socket property.
 */
export interface ISocketChangeEvent extends ITransEventType {
  type: "socketChange";
  data: null;
}

/**
 * A wrapper class for socket.io and socket.io-client socket.
 * Transmitter proxies all socket events and turns them into TransEvent objects so that custom events can be declared with typeScript interfaces.
 * Also, this allows you to transmit events with promises that resolve when a response is received.
 */
export default class Transmitter<
  Socket extends ISocket
> extends AnyEventEmitter {
  private _socket: Socket;
  private _eventTimeout: number;
  private _retryCount: number;
  private _retryInterval: number;
  private _waitingEventDict: { [event: string]: Function };
  private _clearProxy: Function | null = null;

  /**
   * The ID of the socket.
   */
  public get socketID(): string {
    return this._socket.id;
  }
  /**
   * Whether the client is connected to the server.
   */
  public get isConnected(): boolean {
    return this._socket.connected;
  }

  constructor(
    socket: Socket,
    eventTimeout: number = 1000,
    retryCount: number = 1,
    retryInterval: number = 200
  ) {
    super();
    this._waitingEventDict = {};
    this._socket = this._setProxy(socket);
    this._eventTimeout = eventTimeout;
    this._retryCount = retryCount;
    this._retryInterval = retryInterval;
  }
  /**
   * Connect the socket.
   * This function is only available on the client side when socket.io-client is used.
   */
  public connect() {
    if (!this._socket.connect) {
      throw new Error(
        "Cannot connect socket. This function is only available on the client side when socket.io-client is used."
      );
    }
    this._socket.connect();
  }
  /**
   * Disconnect the socket.
   */
  public disconnect() {
    this._socket.disconnect();
  }
  /**
   * Indicates whether the transmitter is waiting for a response to a socket event.
   * You can check this property before transmitting a socket event to prevent transmitting events while previous events are still waiting for response.
   * Ignore the event parameter to check if any event is waiting for response.
   */
  public isWaiting(event?: string): boolean {
    if (!event) {
      return Object.keys(this._waitingEventDict).length > 0;
    }
    return this._waitingEventDict[event] != undefined;
  }
  /**
   * Cancel waiting for response to a socket event.
   * Ignore the event parameter to cancel waiting for all events.
   */
  public cancelWaiting(event?: string) {
    if (!event) {
      // console.log("cancelWaiting", "all");
      let resolveList = Object.values(this._waitingEventDict);
      this._waitingEventDict = {};
      resolveList.forEach((resolve: Function) => {
        resolve({ isCancelled: true, error: null });
      });
      return;
    }
    // console.log("cancelWaiting", event);
    let resolve = this._waitingEventDict[event];
    if (resolve) {
      delete this._waitingEventDict[event];
      resolve({ isCancelled: true, error: null });
    }
  }
  /**
   * List all the events that are waiting for response.
   */
  public listWaiting(): Array<string> {
    return Object.keys(this._waitingEventDict);
  }
  /**
   * Emit an event with a promise that resolves when a response is received.
   * Supports timeout and retry.
   * Emitting an event while the same event is waiting for response will reject the existing promise.
   */
  public async transmit<T extends ITransEventType>(
    event: T["type"],
    data: T["data"],
    timeout: number = this._eventTimeout,
    retryCount: number = this._retryCount,
    retryInterval: number = this._retryInterval
  ): Promise<T["response"] & ICancelResponse> {
    // If the event is already waiting for response, reject the existing promise.
    this.cancelWaiting(event);
    // Create a new promise.
    let promise: Promise<T["response"] & ICancelResponse> = new Promise(
      async (resolve, reject) => {
        // console.log(`[Transmitter ${this.socketID}] Emitting event: ${event}`);
        this._waitingEventDict[event] = resolve;
        let response;
        while (true) {
          try {
            // Emit and wait for response.
            response = await this._socket
              .timeout(timeout)
              .emitWithAck(event, data);
            break;
            // Retry if error
          } catch (error) {
            // Check if the event is still waiting for response.
            if (this._waitingEventDict[event] !== resolve) {
              return;
            }
            // Retry count reached. Reject the promise.
            if (retryCount <= 0) {
              delete this._waitingEventDict[event];
              reject(error);
              return;
            }
            // Retry count not reached. Retry.
            retryCount--;
            await delay(retryInterval);
            // Check if the event is still waiting for response.
            if (this._waitingEventDict[event] !== resolve) {
              return;
            }
            // Entering next retry loop.
            // console.log(
            //   `[Transmitter ${this.socketID}] Resending event: ${event}`
            // );
          }
        }
        // Check if the event is still waiting for response.
        if (this._waitingEventDict[event] !== resolve) {
          return;
        }
        // Got response.
        delete this._waitingEventDict[event];
        resolve(response);
        return;
      }
    );

    // Register the event as waiting.
    return promise;
  }

  /**
   * Listen to socket events including native socket events and custom events.
   */
  public on<T extends ITransEventType>(
    event: T["type"],
    listener: (event: TransEvent<T>) => void
  ) {
    super.on(event, listener as AnyEventListener<T>);
  }
  /**
   * Listen to socket events including native socket events and custom events once.
   */
  public once<T extends ITransEventType>(
    event: T["type"],
    listener: (event: TransEvent<T>) => void
  ) {
    super.once(event, listener as AnyEventListener<T>);
  }
  /**
   * Stop listening to socket events including native socket events and custom events.
   * @param event
   * @param listener
   */
  public off<T extends ITransEventType>(
    event: T["type"],
    listener: (event: TransEvent<T>) => void
  ) {
    super.off(event, listener as AnyEventListener<T>);
  }
  /**
   * Update the socket that is being used.
   * Old socket will be disconnected.
   * @param socket
   */
  public setSocket(socket: Socket) {
    if (this._socket && this._socket.id == socket.id) {
      return;
    }
    let oldSocket = this._socket;
    this._socket = this._setProxy(socket);
    oldSocket.disconnect();
    this.emit(new TransEvent<ISocketChangeEvent>("socketChange", null));
  }

  /**
   * Proxy socket events to Transmitter.
   */
  private _setProxy(socket: Socket): Socket {
    // Clear previous proxy
    if (this._clearProxy) {
      this._clearProxy();
    }
    // Proxy custom events.
    let onAny = (event: string, ...args: Array<any>) => {
      this.emit(new TransEvent(event, args[0], args[1]));
    };
    // Proxy native socket events
    let onConnect = () => {
      this.emit(new TransEvent<IConnectEvent>("connect", null));
    };
    let onConnectError = (error: Error) => {
      this.emit(
        new TransEvent<IConnectErrorEvent>("connect_error", {
          error,
        })
      );
    };
    let onDisconnecting = (reason: string) => {
      this.emit(
        new TransEvent<IDisconnectingEvent>("disconnecting", { reason })
      );
    };
    let onDisconnect = (reason: string) => {
      clearProxy();
      this.emit(new TransEvent<IDisconnectEvent>("disconnect", { reason }));
    };
    let clearProxy = () => {
      socket.offAny(onAny);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnecting", onDisconnecting);
      socket.off("disconnect", onDisconnect);
    };
    // Set up proxy
    socket.onAny(onAny);
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnecting", onDisconnecting);
    socket.on("disconnect", onDisconnect);
    // Set up clear proxy function
    this._clearProxy = clearProxy;
    return socket;
  }
}
