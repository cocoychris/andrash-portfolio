import Editor from "../lib/Editor";
import Game, { IGameData } from "./Game";
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
import { applyDefault, delay, randomInterger, withTimeout } from "./data/util";
import { IDataChangeEvent } from "./data/DataHolder";
import { IWillDestroyEvent } from "./Destroyable";
import FruitNameGenerator from "./FruitNameGenerator";
import AssetPack from "./data/AssetPack";
import Player, { IPlayerData } from "./Player";

export interface IErrorEvent extends IEventType {
  type: "error";
  data: {
    error: Error;
    continuable: boolean;
  };
}

export interface IWillNewGameEvent extends IEventType {
  type: "willNewGame";
  data: null;
}
export interface IDidNewGameEvent extends IEventType {
  type: "didNewGame";
  data: { game: Game };
}

const MAPS_BASE_URL = "/maps";
const CONNECTION_TIMEOUT = 5000;
const EVENT_TIMEOUT = 5000;
const EVENT_RETRY_COUNT = 3;
const EVENT_RETRY_INTERVAL = 200;
/**
 * Client that connects to the server and keeps local status synchronized with the server.
 */
export default class GameClient extends AnyEventEmitter {
  public static readonly MODE_LOCAL: string = "local";
  public static readonly MODE_ONLINE: string = "online";
  public static readonly MODE_EDITOR: string = "editor";
  public static readonly DEFAULT_MODE: string = GameClient.MODE_LOCAL;
  public static readonly INIT_STATE_NONE: string = "none";
  public static readonly INIT_STATE_INITIALIZING: string = "initializing";
  public static readonly INIT_STATE_READY: string = "ready";
  public static readonly INIT_STATE_FAILED: string = "failed";

  private static readonly _VALID_MODES: Array<string> = [
    GameClient.MODE_LOCAL,
    GameClient.MODE_ONLINE,
    GameClient.MODE_EDITOR,
  ];

  private _mode: string = "";
  private _game: Game | null = null;
  private _isSyncing: boolean = false;
  private _localSession: LocalSession;
  private _isAuthenticated: boolean = false;
  private _transmitter: Transmitter<Socket>;
  private _isHost: boolean = false;
  private _gameStopTimeoutID: NodeJS.Timeout | null = null;
  private _defaultMapData: IGameData | null = null;
  private _currentMapData: IGameData | null = null;
  private _joinRoomWarning: string = "";
  private _initState: string = GameClient.INIT_STATE_NONE;

  /**
   * The mode of the game client.
   */
  public get mode(): string {
    return this._mode;
  }
  /**
   * The initial state of the game client.
   */
  public get initState(): string {
    return this._initState;
  }
  /**
   * Set the mode of the game client.
   * Note that this will reload the page.
   */
  public set mode(value: string) {
    if (!GameClient._VALID_MODES.includes(value)) {
      throw new Error(`Invalid mode: ${value}`);
    }
    //Change and go to new URL
    let url = new URL(window.location.href);
    url.searchParams.set("mode", value);
    window.location.assign(url);
  }
  /**
   * The editor instance.
   * The value is null if the client is not running in editor mode.
   */
  public readonly editor: Editor | null;
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
    return (
      this._mode == GameClient.MODE_LOCAL ||
      this._mode == GameClient.MODE_EDITOR
    );
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
    return this.isLocalGame || this._isHost;
  }

  public get joinRoomWarning(): string {
    return this._joinRoomWarning;
  }

  public get publicID(): string {
    return this._localSession.publicID;
  }

  /**
   * Initialize a new GameClient instance.
   * @param serverURL The URL of the game server.
   */
  constructor(serverURL: string) {
    super();
    this._mode = this._getMode();
    this.editor = this.mode == GameClient.MODE_EDITOR ? new Editor(this) : null;
    let socket = io(serverURL, { autoConnect: false });
    this._transmitter = new Transmitter(
      socket,
      EVENT_TIMEOUT,
      EVENT_RETRY_COUNT,
      EVENT_RETRY_INTERVAL
    );
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
    AssetPack.init();
    console.log("GameClient created");
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

  public async init(): Promise<void> {
    if (
      this._initState != GameClient.INIT_STATE_NONE &&
      this._initState != GameClient.INIT_STATE_FAILED
    ) {
      return;
    }
    this._initState = GameClient.INIT_STATE_INITIALIZING;

    console.log(`Running in ${this.mode} mode`);
    if (this.mode == GameClient.MODE_EDITOR) {
      // await this._loadMap(Game.DEFAULT_MAP_ID);
      this._initState = GameClient.INIT_STATE_READY;
      return;
    }
    if (this.mode == GameClient.MODE_LOCAL) {
      if (this._localSession.gameData) {
        await this._loadLocalGame(
          this._localSession.gameData,
          undefined,
          undefined,
          false
        );
      } else {
        let gameData = await this._loadMap(Game.DEFAULT_MAP_ID);
        await this._loadLocalGame(gameData);
      }
      await this.startGame();
      this._initState = GameClient.INIT_STATE_READY;
      return;
    }
    if (this.mode == GameClient.MODE_ONLINE) {
      return new Promise<void>((resolve, reject) => {
        let timeoutID = setTimeout(() => {
          this._transmitter.off<IConnectEvent>("connect", onConnect);
          this._transmitter.disconnect();
          reject(new Error("Connection timeout"));
        }, CONNECTION_TIMEOUT);
        let onConnect = async (event: AnyEvent<IConnectEvent>) => {
          clearTimeout(timeoutID);
          try {
            await this._authenticate();
            await this._loadOnlineGame();
            await this.startGame();
            this._initState = GameClient.INIT_STATE_READY;
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        this._transmitter.on<IConnectEvent>("connect", onConnect);
        this._transmitter.connect();
      });
    }
  }
  /**
   * Start a new game with the specified map.
   * @param mapID The ID of the map to load.
   * @param mainPlayerID The ID of the main player. Ommit to use a random ID.
   */
  public async newGame(
    mapID: string,
    mainPlayerID: number = Player.ID_RANDOM
  ): Promise<void> {
    if (this.isLocalGame) {
      await this._loadLocalGame(await this._loadMap(mapID), mainPlayerID);
    } else {
      await this._loadOnlineGame(mapID);
    }
    await this.startGame();
  }
  /**
   * Load a game in local mode.
   * @param gameData The game data to load. Ommit to load the last game data from local storage.
   * @param mainPlayerID The ID of the main player. Ommit to use a random ID.
   * @returns Returns the loaded game. Returns null if no game data is available.
   */
  public async loadLocalGame(
    gameData: IGameData | null = null,
    mainPlayerID: number = Player.ID_RANDOM
  ): Promise<Game | null> {
    if (!this.isLocalGame) {
      throw new Error("Not running in local mode");
    }
    gameData = gameData || this._localSession.gameData;
    if (!gameData) {
      return null;
    }
    return await this._loadLocalGame(gameData, mainPlayerID);
  }

  public async startGame(force: boolean = false): Promise<void> {
    console.log("startGame");
    this._checkInit();
    if (!this._game) {
      throw new Error("No game has been loaded");
    }
    // Run the game locally
    if (this.isLocalGame) {
      this._game.run((tick) => {
        tick();
        this._localSession.gameData = this._game?.getData() || null;
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
    this._checkInit();
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

  /**
   * Authenticate the client with the server.
   * Will create new session if the client is not authenticated.
   * Client will be joined to a room when authenticated.
   * `publicID` and `sessionID` property will be updated after authentication.
   * The room ID in the URL will be updated after authentication.
   */
  private async _authenticate(): Promise<IAuthenticateEvent["response"]> {
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
    this._joinRoomWarning = response.joinRoomWarning;
    console.log(`authenticated`, this._localSession);
    return response;
  }

  private async _loadMap(mapID: string): Promise<IGameData> {
    // Use cached map data if available
    if (mapID == Game.DEFAULT_MAP_ID && this._defaultMapData) {
      return this._defaultMapData;
    }
    if (this._currentMapData && this._currentMapData.mapInfoData?.id) {
      return this._currentMapData;
    }
    // Load map data from server
    let url = `${MAPS_BASE_URL}/${mapID}.json`;
    let response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load map ${mapID} - ${response.statusText}`);
    }
    let mapData: IGameData = await response.json();
    // Validate map data
    if (mapID !== mapData.mapInfoData?.id) {
      console.warn(
        `Map ID mismatch: expected ${mapID}, got ${mapData.mapInfoData?.id}`
      );
      if (!mapData.mapInfoData) {
        throw new Error(`Invalid map data (ID: ${mapID}). Missing mapInfoData`);
      }
      mapData.mapInfoData.id = mapID;
    }
    // Store the map data
    this._currentMapData = mapData;
    if (mapID == Game.DEFAULT_MAP_ID) {
      this._defaultMapData = mapData;
    }
    return mapData;
  }

  /**
   * Load game data from the server and create a new game with the data.
   * Property `game` will be updated after loading.
   * @returns
   */
  private async _loadLocalGame(
    gameData: IGameData,
    mainPlayerID: number = Player.ID_RANDOM,
    tickInterval?: number,
    isMapData?: boolean
  ): Promise<Game> {
    this._transmitter.disconnect();
    this._localSession.publicID = "";
    console.log("Creating new local game...");
    return await this._newGame({
      gameData,
      mainPlayerID,
      tickInterval,
      isMapData,
    });
  }

  private async _loadOnlineGame(
    mapID?: string,
    tickInterval?: number
  ): Promise<Game> {
    // Loading gameData from server
    if (!this._isAuthenticated) {
      throw new Error("Client not authenticated");
    }
    let response = await this._transmitter.transmit<ILoadGameEvent>(
      "loadGame",
      {
        isLocalGame: false,
        mapID: mapID,
        tickInterval: tickInterval,
      }
    );
    if (response.error) {
      throw new Error(response.error);
    }
    //Redirected as local game
    if (response.isLocalGame) {
      this._localSession.gameData = response.gameData;
      this.mode = GameClient.MODE_LOCAL;
      return Promise.reject("Redirected as local game");
    }
    console.log("Creating new game from server...", response);
    return await this._newGame({
      ...response,
      mainPlayerID: response.playerID,
    });
  }

  private async _newGame(options: {
    gameData: IGameData;
    mainPlayerID?: number;
    tickInterval?: number;
    tickNum?: number;
    isMapData?: boolean;
  }): Promise<Game> {
    this.emit<IWillNewGameEvent>(new AnyEvent("willNewGame", null));
    await delay(50); // Important: Wait for the event to be handled by the UI.
    if (this._game) {
      this._game.destroy();
    }
    // Create the game.
    let isMapData =
      options.isMapData === undefined ? this.isLocalGame : options.isMapData;
    this._game = new Game(options.gameData, isMapData);
    const { tickNum, tickInterval, mainPlayerID } = options;
    await this._game.init({
      tickNum,
      tickInterval,
      mainPlayerID,
    });
    console.log(
      `New ${this.isLocalGame ? "local" : "online"} game created`,
      this._game.id
    );
    // Clean up the game when it is destroyed.
    this._game.once<IWillDestroyEvent>("willDestroy", async (event) => {
      this._stopSyncing();
      this._game = null;
    });
    // Set up the main player
    let mainPlayer = this._game.playerGroup.mainPlayer;
    if (mainPlayer) {
      if (this.isLocalGame) {
        mainPlayer.isOccupied = true;
        mainPlayer.name = FruitNameGenerator.newName();
        this._game.hostPlayerID = mainPlayer.id;
      }
      mainPlayer.dataChangeEventDelay = 10;
      mainPlayer.on<IDataChangeEvent>(
        "dataChange",
        this._onMainPlayerDataChange
      );
      mainPlayer.on<IWillDestroyEvent>("willDestroy", () => {
        mainPlayer?.off<IDataChangeEvent>(
          "dataChange",
          this._onMainPlayerDataChange
        );
      });
    }
    this.emit<IDidNewGameEvent>(
      new AnyEvent("didNewGame", { game: this._game })
    );
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
    let playerData = player.getUpdate() as IPlayerData;
    if (!playerData) {
      return;
    }
    // Local game
    if (this.isLocalGame) {
      player.updateCharacter();
      return;
    }
    // Online game
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

  private _getMode() {
    let url = new URL(window.location.href);
    let mode = url.searchParams.get("mode");
    if (mode && GameClient._VALID_MODES.includes(mode)) {
      return mode;
    }
    return GameClient.DEFAULT_MODE;
  }

  private _checkInit() {
    if (this._initState == GameClient.INIT_STATE_NONE) {
      throw new Error("GameClient not initialized");
    }
    if (this._initState == GameClient.INIT_STATE_FAILED) {
      throw new Error("GameClient initialization failed");
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
      let url = new URL(window.location.href);
      url.searchParams.set("room", publicID);
      window.history.replaceState("", "", url.toString());
    } else {
      let url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState("", "", url.toString());
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
