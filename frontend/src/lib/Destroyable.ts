import AnyEvent, { IEventType } from "./events/AnyEvent";
import AnyEventEmitter from "./events/AnyEventEmitter";

export interface IDestroyEvent extends IEventType {
  type: "destroy";
  data: null;
}

export default class Destroyable extends AnyEventEmitter {
  private _isDistroyed: boolean = false;
  /**
   * Whether the object is destroyed.
   */
  public get isDestroyed(): boolean {
    return this._isDistroyed;
  }

  /**
   * Destroy the session and disconnect the socket.
   */
  public destroy(): void {
    if (this._isDistroyed) {
      return;
    }
    this._isDistroyed = true;
    this.emit<IDestroyEvent>(new AnyEvent("destroy", null));
  }
}
