import { Server } from "socket.io";
import Player from "./Player";
import PlayerEvent from "./PlayerEvent";
import RoomEvent from "./RoomEvent";

interface PlayerDict {
  [key: string]: Player;
}

export default class Room extends EventTarget {
  private _id: string;
  private _io: Server;
  private _playerDict: PlayerDict = {};
  private _destroyed: boolean = false;

  public get id(): string {
    return this._id;
  }

  public get playerList(): Player[] {
    return Object.values(this._playerDict);
  }

  constructor(io: Server, id: string) {
    super();
    this._id = id;
    this._io = io;
  }

  public add(player: Player): void {
    if (this._playerDict[player.id]) {
      return;
    }
    this._playerDict[player.id] = player;
    player.internal.setRoom(this);
    player.addEventListener(PlayerEvent.LEAVE_ROOM, () => {
      delete this._playerDict[player.id];
      this.dispatchEvent(new RoomEvent(RoomEvent.PLAYER_LEAVE));
    });
    this.dispatchEvent(new RoomEvent(RoomEvent.PLAYER_JOIN));
  }

  public remove(player: Player): void {
    if (!this._playerDict[player.id]) {
      return;
    }
    player.internal.setRoom(null);
  }

  public get(playerId: string): Player {
    return this._playerDict[playerId] || null;
  }

  public broadcast(event: string, data: any): void {
    this._io.to(this._id).emit(event, data);
  }

  public destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true; //Important for preventing infinite loops
    this.playerList.forEach((player) => {
      player.internal.setRoom(null);
    });
    this.dispatchEvent(new RoomEvent(RoomEvent.DESTROY));
  }
}
