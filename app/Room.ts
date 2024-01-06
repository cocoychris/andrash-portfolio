import { randomInt } from "crypto";
import Session, { ISessionAddedEvent, ISessionRemovedEvent } from "./Session";
import Game, { IGameData } from "../frontend/src/lib/Game";
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

import Destroyable, {
  IDidDestroyEvent,
  IWillDestroyEvent,
} from "../frontend/src/lib/Destroyable";
import { IDisconnectEvent } from "../frontend/src/lib/events/Transmitter";
import FruitNameGenerator from "../frontend/src/lib/FruitNameGenerator";
import { applyDefault } from "../frontend/src/lib/data/util";
import path from "path";
import { readFile } from "fs/promises";

const EVENT_TIMEOUT = 3000;
const EVENT_RETRY_COUNT = 3;
const EVENT_RETRY_INTERVAL = 200;
const ROOM_DICT: { [publicID: string]: Room } = {};
const MAPS_BASE_DIR = path.join(__dirname, "../../frontend/public/maps");
let _allowNew: boolean = false;

export default class Room extends Destroyable {
  /**
   * Get a room by its public ID.
   */
  public static get(publicID: string): Room | null {
    return ROOM_DICT[publicID] || null;
  }
  /**
   * Create a new room.
   * @param session
   * @returns
   */
  public static async new(session: Session) {
    let gameData: IGameData = await loadGameMap();
    _allowNew = true;
    let room = new Room(session, await new Game(gameData).init());
    _allowNew = false;
    return room;
  }

  private _publicID: string;
  private _ownerSession: Session;
  private _sessionList: Array<Session> = [];
  private _playerSessionList: Array<Session> = [];
  private _game: Game;
  private _isOpen: boolean = true;

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
  public get ownerSession(): Session {
    return this._ownerSession;
  }

  /**
   * Whether the room is full.
   * You can not added a room that is full even if it is open.
   * There is always one slot reserved for the owner.
   */
  public get isFull(): boolean {
    if (!this._game) {
      return true;
    }
    return (
      _removeDuplicates([...this._sessionList, this.ownerSession]).length >=
      this._game.playerGroup.length
    );
  }
  /**
   * Whether the room is open for other session to added.
   * You can not added a room that is full even if it is open.
   */
  public get isOpen(): boolean {
    return this._isOpen;
  }
  /**
   * The list of sessions in the room.
   */
  public get sessionList(): Array<Session> {
    return [...this._sessionList];
  }

  constructor(session: Session, game: Game) {
    super();
    if (!_allowNew) {
      throw new Error("Creating Room without using Room.new()");
    }
    this._ownerSession = session;
    this._game = game;
    this._publicID = _generatePublicID();
    ROOM_DICT[this._publicID] = this;

    // Bind callback funcions
    this._onGameTick = this._onGameTick.bind(this);
    this._onGameDidDestroy = this._onGameDidDestroy.bind(this);

    // Handle game destroy
    this._game.once<IDidDestroyEvent>("didDestroy", this._onGameDidDestroy);
    // Handle owner session destroy
    this._ownerSession.once<IWillDestroyEvent>("willDestroy", () => {
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
      this._game.destroy();
      delete ROOM_DICT[this._publicID];
      console.log(`[Room ${this.publicID}] Room destroyed.`);
    });
    // Add owner session as a member of the room
    this.add(this._ownerSession);
  }

  public add(session: Session): void {
    console.log(`[Room ${this.publicID}] Adding session ${session.id}`);
    let isOwner = this._ownerSession == session;
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

    let onLoadGame = async (event: TransEvent<ILoadGameEvent>) => {
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
          // Create new game
          this._isOpen = false;
          let gameData: IGameData = await loadGameMap(data.mapID);
          this._game.destroy();
          this._game = await new Game(gameData).init();
          this._game.once<IDidDestroyEvent>(
            "didDestroy",
            this._onGameDidDestroy
          );
          this._isOpen = true;
          console.log(
            `[Room ${this.publicID}] New game created (id: ${this._game.id}, mapID: ${data.mapID})`
          );
        }
        this._assignPlayer(session);
        // Send the game data to the client.
        callback({
          error: null,
          playerID: session.playerID,
          gameData: this._game.getData(),
          tickInterval: this._game.tickInterval,
          tickNum: this._game.tickNum,
        });
        console.log(
          `[Room ${this.publicID}] Game loaded for session ${session.id}`
        );
      } catch (error) {
        callback({ error: (error as Error).message || String(error) });
        console.log(
          `[Room ${this.publicID}] Failed to load game: ${
            (error as Error).stack || error
          }`
        );
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
        let game = this._game as Game;
        if (!game) {
          throw new Error("Game not found");
        }
        session.isReady = true;
        let unreadySessions: Array<Session> = this._startGame(
          data.force && isOwner
        );
        callback({
          error: null,
          isStarted: game.isRunning,
          waitingPlayerNames: unreadySessions.map(
            (session) =>
              game.playerGroup.get(session.playerID)?.name ||
              `Player ${session.playerID}`
          ),
        });
      } catch (error) {
        callback({ error: (error as Error).message || String(error) });
        console.log(
          `[Room ${this.publicID}] Failed to start game: ${
            (error as Error).stack || error
          }`
        );
      }
    };

    let onStopGame = (event: TransEvent<IStopGameEvent>) => {
      console.log(`[Room ${this.publicID}] onStopGame`, session.id, event.data);
      let { data, callback } = event;
      try {
        if (!isOwner) {
          throw new Error("Only the owner can stop the game");
        }
        let game = this._game as Game;
        if (!game) {
          throw new Error("Game not found");
        }
        if (data.type == "pause") {
          session.isReady = false;
          console.log(`[Room ${this.publicID}] Game paused by host`);
        } else if (data.type == "end") {
          session.isReady = false;
          game.stop();
          this._isOpen = false;
          this._kick(this._sessionList, true, "Host ended the game");
          console.log(`[Room ${this.publicID}] Game ended by host`);
        } else {
          throw new Error("Invalid stop type");
        }
        callback({
          error: null,
          isStopped: !game.isRunning,
        });
      } catch (error) {
        callback({ error: (error as Error).message || String(error) });
        console.log(
          `[Room ${this.publicID}] Failed to stop game: ${
            (error as Error).stack || error
          }`
        );
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
      if (this._ownerSession.isDestroyed) {
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
      sessionList = sessionList.filter(
        (session) => session != this._ownerSession
      );
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

  private _onGameDidDestroy() {
    this._playerSessionList = [];
  }

  private _onGameTick(tick: (gameData?: IGameData | null) => IGameData | null) {
    let game = this._game as Game;
    //Handle unready sessions
    this._startGame(); // Will stop the game if any player session is not ready
    if (!game.isRunning) {
      return;
    }
    //Handle waiting sessions
    if (this._waitForSessions(game)) {
      return;
    }
    // Go next tick and propagate the update to all sessions.
    let gameData = tick();

    console.log(
      `[Room ${this.publicID}] Updating to tick ${game.tickNum} for ${this._playerSessionList.length} sessions`
    );
    this._playerSessionList.forEach((session) => {
      session.transmitter
        .transmit<IGameTickEvent>(
          "gameTick",
          {
            tickNum: game.tickNum,
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
    let game = this._game as Game;
    if (!game) {
      throw new Error("Game not found");
    }
    // No Session to play the game
    if (this._playerSessionList.length == 0) {
      game.stop();
      return [];
    }
    // Check if all sessions are ready
    let unreadySessions: Array<Session> = this._playerSessionList.filter(
      (session) => !session.isReady
    );
    // All sessions are ready - run the game if it is not running yet
    if (unreadySessions.length == 0) {
      if (!game.isRunning) {
        game.run(this._onGameTick);
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
    // if (!game.isRunning) {
    //   return unreadySessions;
    // }
    // Some sessions are not ready - stop the game and send event
    game.stop();
    let waitingPlayerNames = unreadySessions.map(
      (session) =>
        game.playerGroup.get(session.playerID)?.name ||
        `Player ${session.playerID}`
    );
    let data: IGameStopEvent["data"];
    if (!this.ownerSession.isReady) {
      console.log(`[Room ${this.publicID}] Pausing game for the host`);
      data = {
        type: "pause",
        reason: `Game is paused by the host (${this.ownerSession.name})`,
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

  private _waitForSessions(game: Game): boolean {
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
        game.playerGroup.get(session.playerID)?.name ||
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
            tickNum: game.tickNum,
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
    let game = this._game as Game;
    if (!game) {
      throw new Error("Game not found");
    }
    let player = game.playerGroup.get(playerID);
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
    let game = this._game as Game;
    if (!game) {
      throw new Error("Game not found");
    }
    // Session already has a player.
    if (this._playerSessionList.includes(session)) {
      return;
    }
    let player: Player | null = null;
    // Session is the owner - assign the host player.
    if (session == this.ownerSession) {
      player = game.playerGroup.hostPlayer;
      // Session come back to the same room - try assign the same player.
    } else if (session.prevRoom == this) {
      player = game.playerGroup.get(session.playerID);
      if (!player || player.stagedIsOccupied) {
        player = null;
      }
    }
    // Session is new to the room - try assign a random player.
    if (!player) {
      // Get an available player for the session.
      let playerList = game.playerGroup.getUnoccupiedPlayers(true);
      if (playerList.length == 0) {
        throw new Error(`No available player for session ${session.id}`);
      }
      player = playerList[Math.floor(Math.random() * playerList.length)];
    }
    // Get a name for the player while avoiding duplicates with other players in the room.
    let existNames = game.playerGroup
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
    if (session == this.ownerSession) {
      game.hostPlayerID = session.playerID;
    }
  }

  private _releasePlayer(session: Session): void {
    let game = this._game as Game;
    if (!game) {
      throw new Error("Game not found");
    }
    let index = this._playerSessionList.indexOf(session);
    if (index < 0) {
      return;
    }
    let player = game.playerGroup.get(session.playerID);
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

async function loadGameMap(
  mapID: string = Game.DEFAULT_MAP_ID
): Promise<IGameData> {
  let filePath = path.normalize(path.join(MAPS_BASE_DIR, `${mapID}.json`));
  return JSON.parse(await readFile(filePath, "utf-8"));
}
