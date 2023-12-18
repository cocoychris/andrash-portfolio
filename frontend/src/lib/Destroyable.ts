import AnyEvent, { IEventType } from "./events/AnyEvent";
import AnyEventEmitter from "./events/AnyEventEmitter";

export interface IWillDestroyEvent extends IEventType {
  type: "willDestroy";
  data: null;
}
/**
 * Will be emitted when the object is destroyed.
 */
export interface IDidDestroyEvent extends IEventType {
  type: "didDestroy";
  data: null;
}
/**
 * An object that can be destroyed and emit a destroy event when it is destroyed.
 *
 * This is useful to clearly indicate that an object's lifecycle has ended and a cleanup and release of resources can be performed.
 *
 * To use this class, simply extend it and attach a destroy event listener to the object for whatever it needs to be done when the object's lifecycle ends.
 */
export default abstract class Destroyable extends AnyEventEmitter {
  private _didDestroy: boolean = false;
  private _willDestroy: boolean = false;
  /**
   * Indicate if the object is destroyed.
   */
  public get isDestroyed(): boolean {
    return this._didDestroy;
  }
  /**
   * Destroy the object.
   * This will mark the object as destroyed and emit a destroy event.
   * This is a one-way operation. Once an object is destroyed, it cannot be undone.
   */
  public destroy(): void {
    if (this._didDestroy || this._willDestroy) {
      return;
    }
    this._willDestroy = true;
    this.emit<IWillDestroyEvent>(new AnyEvent("willDestroy", null));
    this._willDestroy = false;
    this._didDestroy = true;
    this.emit<IDidDestroyEvent>(new AnyEvent("didDestroy", null));
  }

  /**
   * Check if this object is destroyed.
   */
  protected checkDestroyed() {
    if (this.isDestroyed) {
      throw new Error("Failed to perform operation on destroyed object.");
    }
  }
}
