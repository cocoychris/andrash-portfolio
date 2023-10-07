export default class EventDispatcher extends EventTarget {
  /**
   * Dispatches a synthetic event event to target and returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
   */
  public dispatchEvent(event: Event): boolean {
    return super.dispatchEvent(event);
  }
  /**
   * Add an event listener to the event dispatcher.
   * @param type The event type to listen for.
   * @param callback The function to call when the event is dispatched.
   */
  public addEventListener<E extends Event>(
    type: string,
    callback: (event: E) => void
  ): void {
    super.addEventListener(type, callback as EventListener);
  }
  /**
   * Remove an event listener from the event dispatcher.
   * @param type The event type to remove.
   * @param callback The function to remove.
   */
  public removeEventListener<E extends Event>(
    type: string,
    callback: (event: E) => void
  ): void {
    super.removeEventListener(type, callback as EventListener);
  }
  /**
   * An alias of dispatchEvent.
   * Dispatches a synthetic event event to target and returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
   */
  public emit(event: Event): boolean {
    return super.dispatchEvent(event);
  }
  /**
   * An alias of addEventListener.
   * Add an event listener to the event dispatcher.
   * @param type The event type to listen for.
   * @param callback The function to call when the event is dispatched.
   */
  public on<E extends Event>(type: string, callback: (event: E) => void): void {
    super.addEventListener(type, callback as EventListener);
  }
  /**
   * An alias of removeEventListener.
   * Remove an event listener from the event dispatcher.
   * @param type The event type to remove.
   * @param callback The function to remove.
   */
  public off<E extends Event>(
    type: string,
    callback: (event: E) => void
  ): void {
    super.removeEventListener(type, callback as EventListener);
  }
  /**
   * Add an event listener that will be called only once.
   * @param type The event type to listen for.
   * @param callback The function to call when the event is dispatched.
   */
  public once<E extends Event>(
    type: string,
    callback: (event: E) => void
  ): void {
    let wrappedCallback = (event: E) => {
      callback(event);
      super.removeEventListener(type, wrappedCallback as EventListener);
    };
    super.addEventListener(type, wrappedCallback as EventListener);
  }
}
