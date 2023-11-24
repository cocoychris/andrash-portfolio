import Game, { IGameData, IGameDef } from "./Game";
import { io, Socket } from "socket.io-client";
import {
  IAuthenticateEvent,
  IGameStopEvent,
  IGameTickEvent,
  ILoadGameEvent,
  IStartGameEvent,
  IStopGameEvent,
  IUpdatePlayerEvent,
} from "./events/transEventTypes";
import Transmitter, {
  IConnectErrorEvent,
  IConnectEvent,
  IDisconnectEvent,
} from "./events/Transmitter";
import TransEvent from "./events/TransEvent";
import AnyEventEmitter from "./events/AnyEventEmitter";
import AnyEvent, { IEventType } from "./events/AnyEvent";
import DEFAULT_GAME_DATA from "../assets/gameData/default";
import tileDefPack from "../assets/gameDef/tile";
import charaterDefPack from "../assets/gameDef/character";
import itemDefPack from "../assets/gameDef/item";
import { delay } from "./data/util";
import { IDataChangeEvent } from "./DataHolder";
import { IDestroyEvent } from "./Destroyable";
import FruitNameGenerator from "./FruitNameGenerator";

let DEFAULT_GAME_DEF: IGameDef = {
  charaterDefPack,
  tileDefPack,
  itemDefPack,
};

export interface ILoadGameOptions {
  isLocalGame?: boolean;
  tickInterval?: number;
  mapID?: string;
}

export interface IErrorEvent extends IEventType {
  type: "error";
  data: {
    error: Error;
    continuable: boolean;
  };
}

// export interface IWillNewGameEvent extends IEventType {
//   type: "willNewGame";
//   data: null;
// }
export interface IDidNewGameEvent extends IEventType {
  type: "didNewGame";
  data: null;
}

const EVENT_TIMEOUT = 5000;
const EVENT_RETRY_COUNT = 3;
const EVENT_RETRY_INTERVAL = 200;

/**
 * Client that connects to the server and keeps local status synchronized with the server.
 */
export default class GameClient extends AnyEventEmitter {
  public static readonly DEFAULT_MAP_ID: string =
    DEFAULT_GAME_DATA.mapData?.id || "default";
  private _game: Game | null = null;
  private _gameDef: IGameDef;
  private _isLocalGame: boolean = false; // Whether the game is running in local without connecting to the server.
  private _isSyncing: boolean = false;
  private _localSession: LocalSession;
  private _isAuthenticated: boolean = false;
  private _transmitter: Transmitter<Socket>;
  private _isHost: boolean = false;
  private _gameStopTimeoutID: NodeJS.Timeout | null = null;

  /**
   * The game that is currently running.
   * The value is null if no game is running.
   */
  public get game(): Game | null {
    return this._game;
  }
  /**
   * Whether the game is running in local without connecting to the server.
   * This property is updated after loading a game.
   */
  public get isLocalGame(): boolean {
    return this._isLocalGame;
  }
  /**
   * Whether there is local game data stored in the client.
   */
  public get hasLocalGameData(): boolean {
    return this._localSession.gameData != null;
  }

  /**
   * Whether the client is authenticated with the server.
   */
  public get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }
  /**
   * Whether the client is the owner of the room/game.
   */
  public get isHost(): boolean {
    return this._isLocalGame || this._isHost;
  }

  /**
   * Initialize a new GameClient instance.
   * @param serverURL The URL of the game server.
   */
  constructor(serverURL: string) {
    super();
    let socket = io(serverURL, { autoConnect: false });
    this._transmitter = new Transmitter(
      socket,
      EVENT_TIMEOUT,
      EVENT_RETRY_COUNT,
      EVENT_RETRY_INTERVAL
    );
    this._gameDef = DEFAULT_GAME_DEF;
    this._localSession = new LocalSession();

    this._transmitter.on<IConnectEvent>("connect", async (event) => {
      console.log("Connected");
      this._isAuthenticated = false;
    });
    this._transmitter.on<IConnectErrorEvent>("connect_error", (event) => {
      console.log("connect error: " + event.data.error);
      this._isAuthenticated = false;
      this._stopSyncing();
      this.emit<IErrorEvent>(
        new AnyEvent("error", {
          error: new Error(
            `Socket connection error: ${event.data.error.message}`
          ),
          continuable: false,
        })
      );
    });
    this._transmitter.on<IDisconnectEvent>("disconnect", (event) => {
      console.log("Disconnected: " + event.data.reason);
      this._isAuthenticated = false;
      this._stopSyncing();
      // this.emit<IErrorEvent>(
      //   new AnyEvent("error", {
      //     error: new Error(`Connection lost: ${event.data.reason}`),
      //     continuable: false,
      //   })
      // );
    });

    this._transmitter.on<IGameStopEvent>(
      "gameStop",
      this._onGameStop.bind(this)
    );
    this.forward(
      ["connect", "disconnect", "gameStop", "gameTick"],
      this._transmitter
    );

    this._onGameTick = this._onGameTick.bind(this);
    this._onMainPlayerDataChange = this._onMainPlayerDataChange.bind(this);
    console.log("GameClient created");
  }
  /**
   * Start the client and connect to the server.
   */
  public connect(): void {
    this._transmitter.connect();
  }
  /**
   * Will clear the session ID stored at the client.
   * The next time you call `authenticate()`, the client will get a new session instead of trying to reconnect the old session.
   */
  public clearSession(): void {
    this._localSession.clear();
  }
  /**
   * Will clear the game data stored at the client.
   * This will prevent the client from running the game in offline mode when loading/reloading the page.
   */
  public clearGameData(): void {
    this._localSession.gameData = null;
  }
  /**
   * Will clear the public ID stored at the client.
   * The next time you call `authenticate()`, the client will join the default room instead of the room in the URL.
   */
  public clearPublicID(): void {
    this._localSession.publicID = "";
  }
  /**
   * Authenticate the client with the server.
   * Will create new session if the client is not authenticated.
   * Client will be joined to a room when authenticated.
   * `publicID` and `sessionID` property will be updated after authentication.
   * The room ID in the URL will be updated after authentication.
   */
  public async authenticate(): Promise<IAuthenticateEvent["response"]> {
    console.log("authenticate");
    if (!this._transmitter.isConnected) {
      throw new Error("Client not connected");
    }
    this._isAuthenticated = false;
    let response = await this._transmitter.transmit<IAuthenticateEvent>(
      "authenticate",
      {
        sessionID: this._localSession.sessionID,
        publicID: this._localSession.publicID,
      }
    );
    if (response.error) {
      throw new Error(response.error);
    }
    console.log(`authenticate response`, response);
    this._localSession.sessionID = response.sessionID;
    this._localSession.publicID = response.publicID;
    this._isHost = response.isHost;
    this._isAuthenticated = true;
    console.log(`authenticated`, this._localSession);
    return response;
  }

  /**
   * Load game data from the server and create a new game with the data.
   * Property `game` will be updated after loading.
   * @param options
   * @returns
   */
  public async loadGame(options: ILoadGameOptions): Promise<Game> {
    console.log("loadGame");
    // Loading default map from local
    let loadPreviousGame = !options.mapID; // No mapID means load previous game
    let isDefaultMap = options.mapID == GameClient.DEFAULT_MAP_ID;
    if (options.isLocalGame && (loadPreviousGame || isDefaultMap)) {
      this._transmitter.disconnect();
      this._localSession.publicID = "";
      let newGameOptions = {
        gameData:
          (loadPreviousGame && this._localSession.gameData) ||
          DEFAULT_GAME_DATA,
        isLocalGame: true,
        tickInterval: options.tickInterval,
        playerID: 0,
      };
      console.log("Creating new local game...", newGameOptions);
      return await this._newGame(newGameOptions);
    }
    // Loading other map from server
    if (!this._isAuthenticated) {
      throw new Error("Client not authenticated");
    }
    let response = await this._transmitter.transmit<ILoadGameEvent>(
      "loadGame",
      {
        ...options,
      }
    );
    if (response.error) {
      throw new Error(response.error);
    }
    if (response.isLocalGame) {
      this._transmitter.disconnect();
      this._localSession.publicID = "";
    }
    console.log("Creating new game from server...", response);
    return await this._newGame(response);
  }

  public async startGame(force: boolean = false): Promise<void> {
    console.log("startGame");
    if (!this._game) {
      throw new Error("No game has been loaded");
    }
    // Run the game locally
    if (this.isLocalGame) {
      this._game.run((tick) => {
        tick();
        this._localSession.gameData = this._game?.getCurrentData() || null;
      });
      return;
    }
    // Run the game on the server
    if (!this._isAuthenticated) {
      throw new Error("Client not authenticated");
    }
    // Request to start the game
    let response = await this._transmitter.transmit<IStartGameEvent>(
      "startGame",
      {
        force,
      }
    );
    if (response.error) {
      throw new Error(response.error);
    }
    this._startSyncing();
    if (response.isStarted) {
      this._setGameTickTimeout();
    } else {
      this._clearGameTickTimeout();
    }
  }

  public async stopGame(endGame: boolean = false): Promise<void> {
    console.log("stopGame");
    if (!this._game) {
      throw new Error("No game has been loaded");
    }
    // Stop the game locally
    if (this.isLocalGame) {
      this._game.stop();
      this.emit<IGameStopEvent>(
        new AnyEvent("gameStop", {
          type: "pause",
          reason: "Local user paused the game",
          waitingPlayerNames: [],
        })
      );
      return;
    }
    // Stop the game on the server
    if (!this._isAuthenticated) {
      throw new Error("Client not authenticated");
    }
    // Request to stop the game
    let response = await this._transmitter.transmit<IStopGameEvent>(
      "stopGame",
      {
        type: endGame ? "end" : "pause",
      }
    );
    if (response.error) {
      throw new Error(response.error);
    }
    this._stopSyncing();
  }

  public destroy(): void {
    this._game?.destroy();
    this._transmitter.disconnect();
    console.log("GameClient destroyed");
  }

  private async _newGame(options: {
    gameData: IGameData;
    isLocalGame: boolean;
    tickInterval?: number;
    playerID: number;
    tickNum?: number;
  }): Promise<Game> {
    // this.emit<IWillNewGameEvent>(new AnyEvent("willNewGame", null));
    await delay(50); // Important: Wait for the event to be handled by the UI.
    if (this._game) {
      this._game.destroy();
    }
    this._isLocalGame = options.isLocalGame;
    // Create the game.
    this._game = new Game(this._gameDef, options.gameData);
    this._game.init(options.tickNum, options.tickInterval, options.playerID);
    console.log(
      `New ${this._isLocalGame ? "local" : "remote"} game created`,
      this._game.id
    );
    // Monitor the data change of the main player and update it to the game.
    let player = this._game?.playerGroup.mainPlayer;
    if (!player) {
      throw new Error("Client main player not found");
    }
    // Assign local player
    if (this._isLocalGame) {
      player.isOccupied = true;
      player.name = FruitNameGenerator.newName();
      this._game.hostPlayerID = player.id;
    }
    player.dataChangeEventDelay = 10;
    player.on<IDataChangeEvent>("dataChange", this._onMainPlayerDataChange);
    player.on<IDestroyEvent>("destroy", () => {
      player?.off<IDataChangeEvent>("dataChange", this._onMainPlayerDataChange);
    });
    // Clean up the game when it is destroyed.
    this._game.once<IDestroyEvent>("destroy", async (event) => {
      this._stopSyncing();
      this._game = null;
    });

    this.emit<IDidNewGameEvent>(new AnyEvent("didNewGame", null));
    return this._game;
  }

  private _startSyncing() {
    if (this._isSyncing) {
      return;
    }
    if (!this._game) {
      throw new Error("Client game not found");
    }

    // Listen to server events
    this._transmitter.on<IGameTickEvent>("gameTick", this._onGameTick);
    // Sync started
    this._isSyncing = true;
    console.log("Game sync started");
  }

  private _stopSyncing() {
    if (!this._isSyncing) {
      return;
    }
    // Stop listening to server events
    this._transmitter.off<IGameTickEvent>("gameTick", this._onGameTick);
    this._clearGameTickTimeout();
    // Sync stopped
    this._isSyncing = false;
    console.log("Game sync stopped");
  }

  /**
   * Triggered when the server sends an update.
   * @param data
   * @returns
   */
  private async _onGameTick(event: TransEvent<IGameTickEvent>) {
    const { data, callback } = event;
    try {
      if (!this._game) {
        throw new Error("Client game not found");
      }
      let expectedTick = this._game.tickNum + 1;
      // Got next tick - go to next tick
      if (data.tickNum == expectedTick) {
        this._game.tick(data.gameData);
        // console.log(`Game updated to tick ${data.tickNum}`, data.gameData);
        this._setGameTickTimeout();
        // Got current tick - server is waiting for other players to catch up
      } else if (data.tickNum == this._game.tickNum) {
        // Showing error window might disrupt the game - just log the error
        // this.emit<IErrorEvent>(
        //   new AnyEvent("error", {
        //     error: new Error(`Server is waiting for other players to catch up`),
        //     continuable: true,
        //   })
        // );
        console.log(`Server is waiting for other players to catch up`);
        this._setGameTickTimeout();
        // Got unexpected tick - throw error
      } else {
        throw new Error(
          `Tick mismatch: expected ${expectedTick}, got ${data.tickNum}`
        );
      }
      // Response as success
      // await delay(Math.random() * 1000); // Test
      callback({ error: null });
    } catch (error) {
      callback({ error: (error as Error).message || String(error) });
    }
  }

  private _onGameStop(event: TransEvent<IGameStopEvent>) {
    const { data, callback } = event;
    try {
      console.log(`Game stopped - Type: ${data.type}, Reason: ${data.reason}`);
      if (data.type == "end") {
        this._stopSyncing();
      } else if (data.type == "waiting" || data.type == "pause") {
        this._clearGameTickTimeout();
      } else {
        throw new Error(`Unknown game stop type: ${data.type}`);
      }
      callback({
        error: null,
      });
    } catch (error) {
      callback({ error: (error as Error).message || String(error) });
    }
  }

  private _onMainPlayerDataChange = () => {
    let player = this._game?.playerGroup.mainPlayer;
    if (!player) {
      throw new Error("Client main player not found");
    }
    let playerData = player.getUpdate();
    if (!playerData) {
      return;
    }
    // Local game
    if (this._isLocalGame) {
      player.updateCharacter();
      return;
    }
    // Remote game
    if (this._isSyncing) {
      // Send the update to the server.
      this._transmitter
        .transmit<IUpdatePlayerEvent>("updatePlayer", {
          playerID: player.id,
          playerData,
        })
        .then((response) => {
          if (response.error) {
            throw new Error(response.error);
          }
        })
        .catch((error) => {
          this.emit<IErrorEvent>(
            new AnyEvent("error", {
              error: new Error(
                `Failed to send player update to server: ${error.message}. Please check your network connection.`
              ),
              continuable: true,
            })
          );
        });
    }
  };

  private _setGameTickTimeout() {
    this._clearGameTickTimeout();
    if (!this._game) {
      return;
    }
    if (!this._isSyncing) {
      return;
    }
    this._gameStopTimeoutID = setTimeout(() => {
      this.game?.stop();
      this.emit<IErrorEvent>(
        new AnyEvent("error", {
          error: new Error(
            "Failed to receive game update from server. Please check your network connection."
          ),
          continuable: true,
        })
      );
    }, this._game.tickInterval * 3);
  }

  private _clearGameTickTimeout() {
    if (this._gameStopTimeoutID) {
      clearTimeout(this._gameStopTimeoutID);
      this._gameStopTimeoutID = null;
    }
  }
}

class LocalSession {
  private _gameData: IGameData | null;
  private _sessionID: string;
  private _publicID: string;

  public get sessionID(): string {
    return this._sessionID;
  }
  public set sessionID(sessionID: string) {
    this._sessionID = sessionID;
    if (sessionID) {
      localStorage.setItem("sessionID", sessionID);
    } else {
      localStorage.removeItem("sessionID");
    }
  }
  public get publicID(): string {
    return this._publicID;
  }
  public set publicID(publicID: string) {
    this._publicID = publicID;
    if (publicID) {
      window.history.pushState("", "", `/?room=${publicID}`);
    } else {
      window.history.pushState("", "", `/`);
    }
  }
  public get gameData(): IGameData | null {
    return this._gameData;
  }
  public set gameData(gameData: IGameData | null) {
    this._gameData = gameData;
    if (gameData) {
      localStorage.setItem("gameData", JSON.stringify(gameData));
    } else {
      localStorage.removeItem("gameData");
    }
  }

  constructor() {
    this._sessionID = localStorage.getItem("sessionID") || "";
    this._publicID =
      new URL(window.location.href).searchParams.get("room") || "";
    let gameDataString = localStorage.getItem("gameData");
    this._gameData = gameDataString ? JSON.parse(gameDataString) : null;
  }

  public clear() {
    this.sessionID = "";
    this.publicID = "";
    this.gameData = null;
  }
}
