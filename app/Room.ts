import { randomInt } from "crypto";
import Session, { ISessionAddedEvent, ISessionRemovedEvent } from "./Session";
import Game, { IGameDef, IGameData } from "../frontend/src/lib/Game";
import Player, { IPlayerData } from "../frontend/src/lib/Player";
import {
  IGameStopEvent,
  IGameTickEvent,
  ILoadGameEvent,
  IStartGameEvent,
  IStopGameEvent,
  IUpdatePlayerEvent,
} from "../frontend/src/lib/events/transEventTypes";
import AnyEvent from "../frontend/src/lib/events/AnyEvent";
import TransEvent from "../frontend/src/lib/events/TransEvent";

import DEFAULT_GAME_DATA from "../frontend/src/assets/gameData/default";
import tileDefPack from "../frontend/src/assets/gameDef/tile";
import characterDefPack from "../frontend/src/assets/gameDef/character";
import itemDefPack from "../frontend/src/assets/gameDef/item";
import Destroyable, {
  IWillDestroyEvent,
} from "../frontend/src/lib/Destroyable";
import { IDisconnectEvent } from "../frontend/src/lib/events/Transmitter";
import { filterObjectByKey } from "../frontend/src/lib/data/util";
import FruitNameGenerator from "../frontend/src/lib/FruitNameGenerator";

interface INewGameOptions {
  mapID?: string;
  isOpen?: boolean;
  isLocalGame?: boolean;
  tickInterval?: number;
}

const DEFAULT_GAME_DEF: IGameDef = {
  characterDefPack,
  tileDefPack,
  itemDefPack,
};
const DEFAULT_MAP_ID = "default";
const EVENT_TIMEOUT = 3000;
const EVENT_RETRY_COUNT = 3;
const EVENT_RETRY_INTERVAL = 200;
const ROOM_DICT: { [publicID: string]: Room } = {};

export default class Room extends Destroyable {
  public static get(publicID: string): Room | null {
    return ROOM_DICT[publicID] || null;
  }

  private _publicID: string;
  private _owner: Session;
  private _sessionList: Array<Session> = [];
  private _playerSessionList: Array<Session> = [];
  private _game: Game;
  private _isOpen: boolean = true;
  private _isLocalGame: boolean = false;
  private _mapID: string = DEFAULT_MAP_ID;

  /**
   * An unique ID that clients can use to added the room.
   */
  public get publicID(): string {
    return this._publicID;
  }
  /**
   * The owner session of the room.
   * This will not change even if the owner leaves the room.
   */
  public get owner(): Session {
    return this._owner;
  }

  public get game(): Game {
    return this._game;
  }

  /**
   * Whether the room is full.
   * You can not added a room that is full even if it is open.
   * There is always one slot reserved for the owner.
   */
  public get isFull(): boolean {
    return (
      _removeDuplicates([...this._sessionList, this.owner]).length >=
      this.game.playerGroup.length
    );
  }
  /**
   * Whether the room is open for other session to added.
   * You can not added a room that is full even if it is open.
   */
  public get isOpen(): boolean {
    return !this._isLocalGame && this._isOpen;
  }
  /**
   * The list of sessions in the room.
   */
  public get sessionList(): Array<Session> {
    return [...this._sessionList];
  }

  constructor(session: Session) {
    super();
    this._owner = session;
    this._publicID = _generatePublicID();
    ROOM_DICT[this._publicID] = this;
    this._game = this._newGame({ isLocalGame: false });
    this._onTick = this._onTick.bind(this);
    this.add(session);

    this._owner.once<IWillDestroyEvent>("willDestroy", () => {
      if (this._sessionList.length == 0 && !this.isDestroyed) {
        console.log(
          `[Room ${this.publicID}] Owner session destroyed. Destroying empty room...`
        );
        this.destroy();
      }
    });
    this.once<IWillDestroyEvent>("willDestroy", () => {
      console.log(`[Room ${this.publicID}] Destroying room...`);
      this._sessionList.forEach((session) => {
        this.remove(session);
      });
      this.game.destroy();
      delete ROOM_DICT[this._publicID];
      console.log(`[Room ${this.publicID}] Room destroyed.`);
    });
  }

  public add(session: Session): void {
    console.log(`[Room ${this.publicID}] Adding session ${session.id}`);
    let isOwner = this._owner == session;
    if (this.isDestroyed) {
      throw new Error("Room is destroyed");
    }
    if (session.isDestroyed) {
      throw new Error("Session is destroyed");
    }
    if (session.currentRoom) {
      throw new Error("Session already in a room");
    }
    if (this._sessionList.includes(session)) {
      throw new Error("Session already exists");
    }
    if (this.isFull && !isOwner) {
      throw new Error("Room is full");
    }
    if (!this.isOpen && !isOwner) {
      throw new Error("Room is not open");
    }
    session.transmitter.cancelWaiting(); // This prevents the interference from previous room.
    session.isReady = false;
    this._sessionList.push(session);
    session["_currentRoom"] = this;
    session.touch();

    let onLoadGame = (event: TransEvent<ILoadGameEvent>) => {
      console.log(`[Room ${this.publicID}] onLoadGame`, session.id, event.data);
      let { data, callback } = event;
      try {
        // Only load a new game if the mapID is provided.
        if (data.mapID) {
          if (!isOwner) {
            throw new Error("Only the host can start a new game");
          }
          this._kick(
            this._playerSessionList,
            true,
            "Host is ending this game to start a new one. Please rejoin the room later."
          );
          this._newGame(data);
        }
        this._assignPlayer(session);
        // Send the game data to the client.
        callback({
          error: null,
          playerID: session.playerID,
          gameData: this.game.getData(),
          isOpen: this.isOpen,
          isLocalGame: this._isLocalGame,
          tickInterval: this.game.tickInterval,
          tickNum: this.game.tickNum,
        });
        console.log(
          `[Room ${this.publicID}] Game loaded for session ${session.id}`
        );
      } catch (error) {
        callback({ error: (error as Error).message || String(error) });
        console.log(`[Room ${this.publicID}] Failed to load game: ${error}`);
      }
    };

    let onStartGame = (event: TransEvent<IStartGameEvent>) => {
      console.log(
        `[Room ${this.publicID}] onStartGame`,
        session.id,
        event.data
      );
      let { data, callback } = event;
      try {
        session.isReady = true;
        let unreadySessions: Array<Session> = this._startGame(
          data.force && isOwner
        );
        callback({
          error: null,
          isStarted: this.game.isRunning,
          waitingPlayerNames: unreadySessions.map(
            (session) =>
              this.game.playerGroup.get(session.playerID)?.name ||
              `Player ${session.playerID}`
          ),
        });
      } catch (error) {
        callback({ error: (error as Error).message || String(error) });
        console.log(`[Room ${this.publicID}] Failed to start game: ${error}`);
      }
    };

    let onStopGame = (event: TransEvent<IStopGameEvent>) => {
      console.log(`[Room ${this.publicID}] onStopGame`, session.id, event.data);
      let { data, callback } = event;
      try {
        if (!isOwner) {
          throw new Error("Only the owner can stop the game");
        }
        if (data.type == "pause") {
          session.isReady = false;
          console.log(`[Room ${this.publicID}] Game paused by host`);
        } else if (data.type == "end") {
          session.isReady = false;
          this.game.stop();
          this._isOpen = false;
          this._kick(this._sessionList, true, "Host ended the game");
          console.log(`[Room ${this.publicID}] Game ended by host`);
        } else {
          throw new Error("Invalid stop type");
        }
        callback({
          error: null,
          isStopped: !this.game.isRunning,
        });
      } catch (error) {
        callback({ error: (error as Error).message || String(error) });
        console.log(`[Room ${this.publicID}] Failed to stop game: ${error}`);
      }
    };
    let onUpdatePlayer = (event: TransEvent<IUpdatePlayerEvent>) => {
      console.log(
        `[Room ${this.publicID}] onUpdatePlayer`,
        session.id,
        event.data
      );
      let { data, callback } = event;
      try {
        if (session.playerID != data.playerID) {
          throw new Error("PlayerID does not match");
        }
        this._updatePlayer(session.playerID, data.playerData);
        session.touch();
        callback({ error: null });
      } catch (error) {
        callback({ error: (error as Error).message || String(error) });
      }
    };
    let onSessionDisconnect = () => {
      console.log(
        `[Room ${this.publicID}] Session disconnected: ${session.id}`
      );
      this.remove(session);
    };
    let onSessionDestroy = () => {
      this.remove(session);
    };
    // Remove event listeners when the session is removed.
    let onSessionRemoved = () => {
      session.transmitter.off<ILoadGameEvent>("loadGame", onLoadGame);
      session.transmitter.off<IStartGameEvent>("startGame", onStartGame);
      session.transmitter.off<IStopGameEvent>("stopGame", onStopGame);
      session.transmitter.off<IUpdatePlayerEvent>(
        "updatePlayer",
        onUpdatePlayer
      );
      session.transmitter.off<IDisconnectEvent>(
        "disconnect",
        onSessionDisconnect
      );
      session.off<IWillDestroyEvent>("willDestroy", onSessionDestroy);
      session.off<ISessionRemovedEvent>("removed", onSessionRemoved);
    };
    // Set up event listeners.
    session.transmitter.on<ILoadGameEvent>("loadGame", onLoadGame);
    session.transmitter.on<IStartGameEvent>("startGame", onStartGame);
    session.transmitter.on<IStopGameEvent>("stopGame", onStopGame);
    session.transmitter.on<IUpdatePlayerEvent>("updatePlayer", onUpdatePlayer);
    session.transmitter.on<IDisconnectEvent>("disconnect", onSessionDisconnect);
    session.on<IWillDestroyEvent>("willDestroy", onSessionDestroy);
    session.on<ISessionRemovedEvent>("removed", onSessionRemoved);
    // Added
    session.emit<ISessionAddedEvent>(new AnyEvent("added", { room: this }));
  }

  public remove(session: Session): void {
    console.log(`[Room ${this.publicID}] Removing session ${session.id}`);
    let index = this._sessionList.indexOf(session);
    if (index < 0) {
      console.warn(
        `[Room ${this.publicID}] Failed to remove session ${session.id}: Session is not in the room`
      );
      return;
    }
    session.isReady = false;
    this._sessionList.splice(index, 1);
    //Release the player.
    this._releasePlayer(session);
    session["_currentRoom"] = null;
    session.emit<ISessionRemovedEvent>(new AnyEvent("removed", { room: this }));
    // Destroy the room if it is empty and the owner session is destroyed.
    if (this._sessionList.length == 0) {
      this._game.stop();
      if (this._owner.isDestroyed) {
        console.log(`[Room ${this.publicID}] Destroying empty room...`);
        this.destroy();
      }
      return;
    }
    // Try start game for sessions that are still in this room.
    this._startGame();
  }

  private _kick(
    session: Session | Array<Session>,
    excludeOwner: boolean,
    reason?: string
  ): void {
    let sessionList = Array.isArray(session) ? session : [session];
    if (excludeOwner) {
      sessionList = sessionList.filter((session) => session != this._owner);
    }
    console.log(
      `[Room ${this.publicID}] Kicking ${
        sessionList.length
      } sessions: ${sessionList.map((session) => session.id).join(", ")}`
    );
    sessionList.forEach((session) => {
      session.transmitter
        .transmit<IGameStopEvent>(
          "gameStop",
          {
            type: "end",
            reason: reason || "You are kicked by the host",
            waitingPlayerNames: [],
          },
          EVENT_TIMEOUT,
          EVENT_RETRY_COUNT,
          EVENT_RETRY_INTERVAL
        )
        .then((response) => {
          if (response.error) {
            throw new Error(response.error);
          }
        })
        .catch((error) => {
          console.log(
            `[Room ${this.publicID}] Failed to send gameStop event to session ${
              session.id
            }: ${error.message || error}`
          );
        })
        .finally(() => {
          this.remove(session);
        });
    });
  }

  private _newGame(options: INewGameOptions): Game {
    // console.log(
    //   `[Room ${this.publicID}] Creating new game (mapID: ${
    //     options.mapID || "default"
    //   })`
    // );
    if (options.isLocalGame !== undefined) {
      this._isLocalGame = options.isLocalGame;
    }
    this._isOpen = options.isOpen !== undefined ? options.isOpen : true;

    // TO DO: should load gameData and gameDef dynamically by options.mapID
    // if(options.mapID !== undefined){
    //   this._mapID = options.mapID || DEFAULT_MAP_ID;
    // }
    this._mapID = DEFAULT_MAP_ID; // Use default map for now.
    let gameData: IGameData = DEFAULT_GAME_DATA; // Use default gameData for now.
    let gameDef: IGameDef = DEFAULT_GAME_DEF; // Use default gameDef for now.
    // Create the game.
    this._game?.destroy();
    this._game = new Game(gameDef, gameData);
    this._game.init(0, options.tickInterval);
    // Clear all player sessions.
    this._playerSessionList = [];

    console.log(
      `[Room ${this.publicID}] New game created (id: ${this.game.id}, mapID: ${this._mapID})`
    );
    return this._game;
  }

  private _onTick(tick: (gameData?: IGameData | null) => IGameData | null) {
    //Handle unready sessions
    this._startGame(); // Will stop the game if any player session is not ready
    if (!this.game.isRunning) {
      return;
    }
    //Handle waiting sessions
    if (this._waitingSessions()) {
      return;
    }
    // Go next tick and propagate the update to all sessions.
    let gameData = tick();

    console.log(
      `[Room ${this.publicID}] Updating to tick ${this.game.tickNum} for ${this._playerSessionList.length} sessions`
    );
    this._playerSessionList.forEach((session) => {
      session.transmitter
        .transmit<IGameTickEvent>(
          "gameTick",
          {
            tickNum: this.game.tickNum,
            gameData,
            waitingPlayerNames: [],
          },
          EVENT_TIMEOUT,
          EVENT_RETRY_COUNT,
          EVENT_RETRY_INTERVAL
        )
        .then((response) => {
          if (response.error) {
            throw new Error(response.error);
          }
          // session.touch();
        })
        .catch((error) => {
          console.log(
            `[Room ${this.publicID}] removing unreachable session ${
              session.id
            }: ${error.message || error}`
          );
          this.remove(session);
        });
    });
  }
  /**
   * Start/Stop the game according to the readiness of all player sessions.
   * Will start the game if all player sessions are ready.
   * will stop the game if any player session is not ready.
   * @returns unreadySessions
   */
  private _startGame(force: boolean = false): Array<Session> {
    // No Session to play the game
    if (this._playerSessionList.length == 0) {
      this.game.stop();
      return [];
    }
    // Check if all sessions are ready
    let unreadySessions: Array<Session> = this._playerSessionList.filter(
      (session) => !session.isReady
    );
    // All sessions are ready - run the game if it is not running yet
    if (unreadySessions.length == 0) {
      if (!this.game.isRunning) {
        this.game.run(this._onTick);
      }
      return [];
    }
    // Some sessions are not ready - force start the game
    if (force) {
      console.log(`[Room ${this.publicID}] Starting game by force`);
      this._kick(
        unreadySessions,
        true,
        "You are kicked because the host is forcing to start the game without all players ready"
      );
      return unreadySessions;
    }
    // // Some sessions are not ready - do nothing as it is already stopped
    // if (!this.game.isRunning) {
    //   return unreadySessions;
    // }
    // Some sessions are not ready - stop the game and send event
    this.game.stop();
    let waitingPlayerNames = unreadySessions.map(
      (session) =>
        this.game.playerGroup.get(session.playerID)?.name ||
        `Player ${session.playerID}`
    );
    let data: IGameStopEvent["data"];
    if (!this.owner.isReady) {
      console.log(`[Room ${this.publicID}] Pausing game for the host`);
      data = {
        type: "pause",
        reason: `Game is paused by the host (${this.owner.name})`,
        waitingPlayerNames,
      };
    } else {
      console.log(
        `[Room ${this.publicID}] Waiting for ${unreadySessions.length} sessions to be ready`
      );
      data = {
        type: "waiting",
        reason: `Waiting for ${unreadySessions.length} player${
          unreadySessions.length > 1 ? "s" : ""
        } to be ready`,
        waitingPlayerNames,
      };
    }
    this._playerSessionList.forEach((session) => {
      session.transmitter
        .transmit<IGameStopEvent>(
          "gameStop",
          data,
          EVENT_TIMEOUT,
          EVENT_RETRY_COUNT,
          EVENT_RETRY_INTERVAL
        )
        .then((response) => {
          if (response.error) {
            throw new Error(response.error);
          }
          session.touch();
        })
        .catch((error) => {
          console.log(
            `[Room ${this.publicID}] Removing unreachable session ${
              session.id
            }: ${error.message || error}`
          );
          this.remove(session);
        });
    });
    return unreadySessions;
  }

  private _waitingSessions(): boolean {
    // Check if any session is not ready.
    let waitingSessions: Array<Session> = this._playerSessionList.filter(
      (session) => !session.isReady || session.transmitter.isWaiting("gameTick")
    );
    if (waitingSessions.length == 0) {
      return false;
    }
    // Tell sessions to wait for the next tick
    let waitingPlayerNames = waitingSessions.map(
      (session) =>
        this.game.playerGroup.get(session.playerID)?.name ||
        `Player ${session.playerID}`
    );
    let readySessions = this._playerSessionList.filter(
      (session) => session.isReady && !session.transmitter.isWaiting("gameTick")
    );
    readySessions.forEach((session) => {
      session.transmitter
        .transmit<IGameTickEvent>(
          "gameTick",
          {
            tickNum: this.game.tickNum,
            gameData: null,
            waitingPlayerNames,
          },
          EVENT_TIMEOUT,
          EVENT_RETRY_COUNT,
          EVENT_RETRY_INTERVAL
        )
        .then((response) => {
          if (response.error) {
            throw new Error(response.error);
          }
          // session.touch();
        })
        .catch((error) => {
          console.log(
            `[Room ${this.publicID}] Removing unreachable session ${
              session.id
            }: ${error.message || error}`
          );
          this.remove(session);
        });
    });
    return true;
  }

  private _updatePlayer(playerID: number, playerData?: IPlayerData) {
    let player = this.game.playerGroup.get(playerID);
    if (!player) {
      throw new Error(`Player ${playerID} not found.`);
    }
    if (playerData) {
      // Only update some of the properties that are allowed to be updated from the client.
      player.target = playerData.target || null;
    }
    player.updateCharacter();
  }

  private _assignPlayer(session: Session): void {
    // Session already has a player.
    if (this._playerSessionList.includes(session)) {
      return;
    }
    let player: Player | null = null;
    // Session is the owner - assign the host player.
    if (session == this.owner) {
      player = this.game.playerGroup.hostPlayer;
      // Session come back to the same room - try assign the same player.
    } else if (session.prevRoom == this) {
      player = this.game.playerGroup.get(session.playerID);
      if (!player || player.stagedIsOccupied) {
        player = null;
      }
    }
    // Session is new to the room - try assign a random player.
    if (!player) {
      // Get an available player for the session.
      let playerList = this.game.playerGroup.getUnoccupiedPlayers(true);
      if (playerList.length == 0) {
        throw new Error(`No available player for session ${session.id}`);
      }
      player = playerList[Math.floor(Math.random() * playerList.length)];
    }
    // Get a name for the player while avoiding duplicates with other players in the room.
    let existNames = this.game.playerGroup
      .list()
      .filter((p) => p != player && (p.stagedIsOccupied || p.isHost))
      .map((player) => player.name);
    player.name = FruitNameGenerator.differentiateName(
      session.name,
      existNames
    );
    // Set up the player.
    player.isOccupied = true;
    this._updatePlayer(player.id);
    this._playerSessionList.push(session);
    session.playerID = player.id;
    if (session == this.owner) {
      this.game.hostPlayerID = session.playerID;
    }
  }

  private _releasePlayer(session: Session): void {
    let index = this._playerSessionList.indexOf(session);
    if (index < 0) {
      return;
    }
    let player = this.game.playerGroup.get(session.playerID);
    if (!player) {
      throw new Error(`Player ${session.playerID} not found.`);
    }
    // player.name = "";
    player.target = null;
    player.isOccupied = false;
    this._updatePlayer(session.playerID);
    this._playerSessionList.splice(index, 1);
  }
}

function _generatePublicID(): string {
  let id;
  do {
    id = randomInt(0, 1000000).toString().padStart(6, "0");
  } while (ROOM_DICT[id]);
  return id;
}

function _removeDuplicates<T>(array: Array<T>): Array<T> {
  return [...new Set(array)];
}
