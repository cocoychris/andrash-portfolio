import { Socket } from "socket.io";
import Room from "./Room";
import PlayerEvent from "./PlayerEvent";
import PlayerManager from "./PlayerManager";
import IOEvent, { ITargetData } from "../frontend/src/lib/events/IOEvent";

interface InternalProps {
  setRoom: (room: Room | null) => void;
}

export default class Player extends EventTarget {
  private _id: string;
  private _name: string | null;
  private _socket: Socket;
  private _room: Room | null = null;
  private _destroyed: boolean = false;
  private _manager: PlayerManager;

  public readonly internal: InternalProps = {
    setRoom: this._setRoom.bind(this),
  };

  public get id(): string {
    return this._id;
  }

  public get name(): string | null {
    return this._name;
  }

  public get room(): Room | null {
    return this._room;
  }

  constructor(manager: PlayerManager, socket: Socket) {
    super();
    this._manager = manager;
    this._socket = socket;
    this._id = socket.id;
    this._name = null;
    socket.addListener(IOEvent.TARGET, (data: ITargetData) => {
      console.log(`Event ${IOEvent.TARGET}`);
      console.log(data);
    });
  }

  public destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true; //Important for preventing infinite loops
    this._setRoom(null);
    this._socket.disconnect(true);
    this.dispatchEvent(new PlayerEvent(PlayerEvent.DESTROY));
  }

  private _setRoom(room: Room | null) {
    if (this._room === room) {
      return;
    }
    if (this._room) {
      this._socket.leave(this._id);
      this._room = null;
      this.dispatchEvent(new PlayerEvent(PlayerEvent.LEAVE_ROOM));
    }
    if (!room) {
      return;
    }
    this._socket.join(room.id);
    this._room = room;
    this.dispatchEvent(new PlayerEvent(PlayerEvent.JOIN_ROOM));
  }
}
