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
  private _isDistroyed: boolean = false;
  /**
   * Whether the object is destroyed.
   */
  public get isDestroyed(): boolean {
    return this._isDistroyed;
  }

  /**
   * Destroy the object.
   * This will mark the object as destroyed and emit a destroy event.
   * This is a one-way operation. Once an object is destroyed, it cannot be undone.
   */
  public destroy(): void {
    if (this._isDistroyed) {
      return;
    }
    this.emit<IWillDestroyEvent>(new AnyEvent("willDestroy", null));
    this._isDistroyed = true;
    this.emit<IDidDestroyEvent>(new AnyEvent("didDestroy", null));
  }
}
