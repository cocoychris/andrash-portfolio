import { randomBytes } from "crypto";
import { Socket } from "socket.io";
import Room from "./Room";
import Transmitter, {
  IConnectErrorEvent,
  IConnectEvent,
} from "../frontend/src/lib/events/Transmitter";
import Destroyable, {
  IWillDestroyEvent,
} from "../frontend/src/lib/Destroyable";
import { IEventType } from "../frontend/src/lib/events/AnyEvent";
import FruitNameGenerator from "../frontend/src/lib/FruitNameGenerator";

export interface ISessionAddedEvent extends IEventType {
  type: "added";
  data: {
    room: Room;
  };
}

export interface ISessionRemovedEvent extends IEventType {
  type: "removed";
  data: {
    room: Room;
  };
}

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DEFAULT_LIFETIME = 2 * HOUR;
const SESSION_DICT: { [id: string]: Session } = {};
const MAX_CONNECT_ERROR_COUNT = 3;

let _gcIntervalID: NodeJS.Timeout | null = null;

export default class Session extends Destroyable {
  public static get(id: string): Session | null {
    return SESSION_DICT[id] || null;
  }
  /**
   * Start the garbage collector.
   * Will destroy all expired sessions every interval.
   * @param interval
   * @returns
   */
  public static startGC(interval: number): void {
    if (_gcIntervalID) {
      return;
    }
    _gcIntervalID = setInterval(() => {
      let ids = Object.keys(SESSION_DICT);
      for (let id of ids) {
        let session = SESSION_DICT[id];
        if (session.isExpired) {
          console.log(`[Session ${id}] Session expired.`);
          session.destroy();
        }
      }
    }, interval);
  }
  /**
   * Stop the garbage collector.
   */
  public static stopGC(): void {
    if (_gcIntervalID) {
      clearInterval(_gcIntervalID);
      _gcIntervalID = null;
    }
  }

  private _id: string;
  private _transmitter: Transmitter<Socket>;
  private _ownRoom: Room;
  private _currentRoom: Room | null = null;
  private _prevRoom: Room | null = null;

  /**
   * The name of the session.
   */
  public name: string;
  /**
   * Whether the client is ready to start the game and receive game data.
   */
  public isReady: boolean = false;
  /**
   * The player ID that the session is using in the game.
   */
  public playerID: number = -1;

  /**
   * The maximum lifetime of the session in milliseconds.
   */
  public maxLifetime: number = DEFAULT_LIFETIME;
  /**
   * The timestamp of when the session expires.
   */
  public expireTime: number = 0;
  /**
   * A proxy that forwards all events emitted by the socket.
   * Please add event listeners to this object instead of the socket.
   */
  public get transmitter(): Transmitter<Socket> {
    return this._transmitter;
  }
  /**
   * The session ID of the session.
   */
  public get id(): string {
    return this._id;
  }
  /**
   * Remaining lifetime of the session in milliseconds.
   */
  public get lifetime(): number {
    return this.expireTime - Date.now();
  }
  public set lifetime(time: number) {
    this.expireTime = Date.now() + time;
  }
  /**
   * Whether the session is expired.
   */
  public get isExpired(): boolean {
    return this.expireTime <= Date.now();
  }
  /**
   * The default room that the session owns.
   */
  public get ownRoom(): Room {
    return this._ownRoom;
  }
  /**
   * The room that the session is currently in.
   * If the session is not in any room, this value is null.
   * If the session is in their own room, this value is the same as ownRoom.
   */
  public get currentRoom(): Room | null {
    return this._currentRoom;
  }
  public set currentRoom(room: Room | null) {
    if (room === this._currentRoom) {
      return;
    }
    if (this._currentRoom) {
      this._prevRoom = this._currentRoom;
      this._currentRoom.remove(this);
    }
    if (room) {
      room.add(this);
    }
  }
  public get prevRoom(): Room | null {
    return this._prevRoom;
  }

  constructor(socket: Socket, maxLifetime: number = DEFAULT_LIFETIME) {
    super();
    this._transmitter = new Transmitter<Socket>(socket);
    this._id = _generateSessionID();
    this.name = FruitNameGenerator.newName();
    SESSION_DICT[this._id] = this;
    this._ownRoom = new Room(this);
    this.maxLifetime = maxLifetime;
    this.lifetime = maxLifetime;

    // Disconnect the socket when connect_error is emitted too many times.
    let connectErrorCount = 0;
    this._transmitter.on<IConnectEvent>("connect", () => {
      console.log(`[Session ${this._id}] Socket reconnected.`);
      connectErrorCount = 0;
    });
    this._transmitter.on<IConnectErrorEvent>("connect_error", (event) => {
      connectErrorCount++;
      console.log(
        `[Session ${this._id}] Socket connect error(#${connectErrorCount}/${MAX_CONNECT_ERROR_COUNT}): ${event.data.error.message}`
      );
      if (connectErrorCount > MAX_CONNECT_ERROR_COUNT) {
        console.log(
          `[Session ${this._id}] Disconnecting socket, too many connect errors.`
        );
        this._transmitter.disconnect();
      }
    });
    // Clean up when the session is removed from a room.
    this.on<ISessionRemovedEvent>("removed", (event) => {
      this._transmitter.cancelWaiting(); // Stop waiting for response to all events.
    });
    // Clean up when the session is destroyed.
    this.on<IWillDestroyEvent>("willDestroy", () => {
      console.log(`[Session ${this._id}] Session destroyed.`);
      if (this._ownRoom.sessionList.length == 0) {
        this._ownRoom.destroy();
      }
      this._transmitter.disconnect();
      delete SESSION_DICT[this._id];
    });
  }

  /**
   * Will set lifetime to maxLifetime.
   */
  public touch(): void {
    this.lifetime = this.maxLifetime;
    // console.log(`[Session ${this._id}] Touched.`);
  }
}

function _generateSessionID(): string {
  let id;
  do {
    id = randomBytes(16).toString("base64");
  } while (SESSION_DICT[id]);
  return id;
}
