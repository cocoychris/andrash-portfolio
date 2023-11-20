import AnyEvent, { IEventType } from "./AnyEvent";

export type AnyEventListener<T extends IEventType> = (
  event: AnyEvent<T>
) => void;
/**
 * A wrapper class for EventTarget that provides a more convenient interface and better type checking.
 * This allows you to declare an event type and its data type in one place with AnyEvent and IEventType interfaces.
 */
export default class AnyEventEmitter extends EventTarget {
  private _emitFunc = <T extends IEventType>(event: AnyEvent<T>) => {
    this.emit(new AnyEvent(event.type, event.data));
  };

  constructor() {
    super();
  }
  /**
   * Use emit() instead.
   * This function exists for compatibility with the EventTarget interface.
   * Dispatches a synthetic event event to target and returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
   */
  public dispatchEvent<E extends Event>(event: E): boolean {
    return super.dispatchEvent(event);
  }
  /**
   * Use on() instead.
   * This function exists for compatibility with the EventTarget interface.
   * @param type The event type to listen for.
   * @param listener The function to call when the event is dispatched.
   */
  public addEventListener<E extends Event>(
    type: string,
    listener: (event: E) => void
  ): void {
    super.addEventListener(type, listener as EventListener);
  }
  /**
   * Use off() instead.
   * This function exists for compatibility with the EventTarget interface.
   * @param type The event type to remove.
   * @param listener The function to remove.
   */
  public removeEventListener<E extends Event>(
    type: string,
    listener: (event: E) => void
  ): void {
    super.removeEventListener(type, listener as EventListener);
  }
  /**
   * Dispatches a synthetic event event to target and returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
   */
  public emit<T extends IEventType>(event: AnyEvent<T>): boolean {
    return super.dispatchEvent(event);
  }
  /**
   * Add an event listener to the event dispatcher.
   * @param type The event type to listen for.
   * @param listener The function to call when the event is dispatched.
   */
  public on<T extends IEventType>(
    type: T["type"],
    listener: AnyEventListener<T>
  ): void {
    super.addEventListener(type, listener as EventListener);
  }
  /**
   * Remove an event listener from the event dispatcher.
   * @param type The event type to remove.
   * @param listener The function to remove.
   */
  public off<T extends IEventType>(
    type: T["type"],
    listener: AnyEventListener<T>
  ): void {
    super.removeEventListener(type, listener as EventListener);
  }
  /**
   * Add an event listener that will be called only once.
   * @param type The event type to listen for.
   * @param listener The function to call when the event is dispatched.
   */
  public once<T extends IEventType>(
    type: T["type"],
    listener: AnyEventListener<T>
  ): void {
    let wrappedCallback = (event: AnyEvent<T>) => {
      listener(event);
      super.removeEventListener(type, wrappedCallback as EventListener);
    };
    super.addEventListener(type, wrappedCallback as EventListener);
  }
  /**
   * Forward events from another event dispatcher to this event dispatcher.
   * @param eventList
   * @param target
   */
  public forward(eventList: Array<string>, source: AnyEventEmitter) {
    eventList.forEach((event) => {
      source.on(event, this._emitFunc);
    });
  }
  /**
   * Stop forwarding events from another event dispatcher to this event dispatcher.
   * @param eventList
   * @param target
   */
  public unforward(eventList: Array<string>, source: AnyEventEmitter) {
    eventList.forEach((event) => {
      source.off(event, this._emitFunc);
    });
  }
}
