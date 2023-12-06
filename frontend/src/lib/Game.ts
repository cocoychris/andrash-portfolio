import GameMap, { IMapData } from "./GameMap";
import DefLoader from "./DefLoader";
import { ICharacterDef, IDefPack, IItemDef, ITileDef } from "./IDefinition";
import CharacterGroup from "./CharacterGroup";
import { ICharacterData } from "./Character";

import ItemGroup from "./ItemGroup";
import { IGroupData } from "./Group";
import { IItemData } from "./Item";
import DataHolder, {
  IDidSetUpdateEvent,
  IWillApplyEvent,
  IWillGetUpdateEvent,
} from "./DataHolder";
import { IPlayerData } from "./Player";
import PlayerGroup from "./PlayerGroup";
import { cloneObject } from "./data/util";
import DataUpdater, { IUpdatePhase } from "./DataUpdater";
import { IDidDestroyEvent, IWillDestroyEvent } from "./Destroyable";

export interface IGameData {
  /**
   * No need to set this manually. This will be set automatically when the game is created.
   */
  id?: string;
  /**
   * No need to set this manually. This will be set automatically by the server or client.
   */
  hostPlayerID?: number;
  playerDataDict: IGroupData<IPlayerData> | null;
  characterDataDict: IGroupData<ICharacterData> | null;
  itemDataDict: IGroupData<IItemData> | null;
  mapData: IMapData | null;
}
export interface IGameDef {
  characterDefPack: IDefPack<ICharacterDef>;
  tileDefPack: IDefPack<ITileDef>;
  itemDefPack: IDefPack<IItemDef>;
}
/**
 * Action phase: An update phase for game elements to perform their AI actions or human controlled actions.
 * For example, the new position of a character after moving will be calculated in this phase.
 */
export interface IActionPhase extends IUpdatePhase {
  phase: "action";
  props: null;
}
/**
 * Interaction phase: An update phase for calculating the interaction between game elements after the action phase.
 * For example, when a character hits another character, the collision will be detected in this phase.
 */
export interface IInteractionPhase extends IUpdatePhase {
  phase: "interaction";
  props: null;
}
/**
 * Correction phase: An update phase for correcting the game data after the interaction phase.
 * For example, if a character is overlapping with another character after collision, the position of the character will be corrected to avoid overlapping in this phase.
 */
export interface ICorrectionPhase extends IUpdatePhase {
  phase: "correction";
  props: null;
}

const DEFAULT_UPDATE_INTERVAL = 600;
const MIN_UPDATE_INTERVAL = 500;
const MAX_UPDATE_INTERVAL = 5000;
let gameNum = 0;

/**
 * Represents a game session. A game session contains all the game data and objects.
 * To restart a game, create a new Game instance.
 */
export default class Game extends DataUpdater<IGameData> {
  private _tickNum: number;
  private _playerGroup: PlayerGroup;
  private _characterGroup: CharacterGroup;
  private _itemGroup: ItemGroup;
  private _map: GameMap;
  private _tileDefLoader: DefLoader<ITileDef>;
  private _characterDefLoader: DefLoader<ICharacterDef>;
  private _itemDefLoader: DefLoader<IItemDef>;
  private _intervalID: NodeJS.Timeout | null = null;
  private _isRunning: boolean = false;
  private _tickInterval: number = DEFAULT_UPDATE_INTERVAL;
  /**
   * A unique ID of the game.
   * This is helpful when you want to distinguish different games.
   */
  public get id(): string {
    return this.data.id as string;
  }
  /**
   * Get the current tick number of the game.
   */
  public get tickNum(): number {
    return this._tickNum;
  }
  /**
   * The ID of the player who hosts the game.
   */
  public get hostPlayerID(): number {
    return this.data.hostPlayerID as number;
  }
  public set hostPlayerID(id: number) {
    this.data.hostPlayerID = id;
  }
  /**
   * Get the player group that manages all the players.
   * Only available after init().
   */
  public get playerGroup(): PlayerGroup {
    return this._playerGroup;
  }
  /**
   * Get the game map object that contains all the tiles and map information.
   * Only available after init().
   */
  public get map(): GameMap {
    return this._map;
  }
  /**
   * Get the item group that manages all the items.
   * Only available after init().
   */
  public get itemGroup(): ItemGroup {
    return this._itemGroup;
  }
  /**
   * Get the character group that manages all the characters.
   * Only available after init().
   */
  public get characterGroup(): CharacterGroup {
    return this._characterGroup;
  }

  /**
   * A tile definition loader that contains all tile definitions.
   */
  public get tileDefLoader(): DefLoader<ITileDef> {
    return this._tileDefLoader;
  }
  /**
   * A character definition loader that contains all character definitions.
   */
  public get characterDefLoader(): DefLoader<ICharacterDef> {
    return this._characterDefLoader;
  }
  /**
   * A item definition loader that contains all item definitions.
   */
  public get itemDefLoader(): DefLoader<IItemDef> {
    return this._itemDefLoader;
  }
  /**
   * Get whether the game is running.
   */
  public get isRunning(): boolean {
    return this._isRunning;
  }
  /**
   * Get the update interval of the game in milliseconds.
   */
  public get tickInterval(): number {
    return this._tickInterval;
  }
  /**
   * Create a new game.
   * @param gameDef The game definition that contains all the definitions of tiles, characters and items.
   * @param data The game data that will be used to create the game.
   */
  constructor(gameDef: IGameDef, data: IGameData) {
    _checkGameData(data);
    data = cloneObject(data);
    !data.id && (data.id = _generateGameID());
    data.hostPlayerID === undefined && (data.hostPlayerID = -1);
    super(data);
    this._tickNum = 0;
    this._tileDefLoader = new DefLoader(gameDef.tileDefPack);
    this._characterDefLoader = new DefLoader(gameDef.characterDefPack);
    this._itemDefLoader = new DefLoader(gameDef.itemDefPack);

    if (!this.data.playerDataDict) {
      throw new Error("Player data is required");
    }
    if (!this.data.mapData) {
      throw new Error("Map data is required");
    }
    if (!this.data.characterDataDict) {
      throw new Error("Character data is required");
    }
    if (!this.data.itemDataDict) {
      throw new Error("Item data is required");
    }
    this._playerGroup = new PlayerGroup(this, this.data.playerDataDict);
    this._map = new GameMap(this, this.data.mapData);
    this._characterGroup = new CharacterGroup(
      this,
      this.data.characterDataDict
    );
    this._itemGroup = new ItemGroup(this, this.data.itemDataDict);
  }
  /**
   * Initialize the game.
   * This will create playerGroup, map, characterGroup and itemGroup and all the child objects using the data provided in the constructor.
   * @param tickNum The initial tick number of the game. Default to 0.
   * @param tickInterval The update interval of the game in milliseconds. Default to 600.
   */
  public init(
    tickNum?: number,
    tickInterval?: number,
    mainPlayerID?: number
  ): this {
    if (this.initialized) {
      console.log("Game already initialized.");
      return this;
    }
    super.init();
    // Initialize child objects - the order matters!
    this._playerGroup.init(mainPlayerID);
    this._map.init();
    this._characterGroup.init();
    this._itemGroup.init();
    // Set the tick number
    if (tickNum !== undefined) {
      this._tickNum = tickNum;
    }
    // Set the update interval
    if (tickInterval !== undefined) {
      this._tickInterval = Math.max(
        Math.min(tickInterval || DEFAULT_UPDATE_INTERVAL, MAX_UPDATE_INTERVAL),
        MIN_UPDATE_INTERVAL
      );
    }
    // Set up event listeners
    this.on<IWillGetUpdateEvent>("willGetUpdate", () => {
      this.data.playerDataDict = this._playerGroup.getUpdate();
      this.data.mapData = this._map.getUpdate();
      this.data.characterDataDict =
        this._characterGroup.getUpdate() as IGroupData<ICharacterData>;
      this.data.itemDataDict =
        this._itemGroup.getUpdate() as IGroupData<IItemData>;
    });
    this.on<IDidSetUpdateEvent>("didSetUpdate", () => {
      this._playerGroup.setUpdate(this.data.playerDataDict);
      this._map.setUpdate(this.data.mapData);
      this._characterGroup.setUpdate(this.data.characterDataDict);
      this._itemGroup.setUpdate(this.data.itemDataDict);
    });
    this.on<IWillApplyEvent>("willApply", () => {
      this._playerGroup.apply();
      this._map.apply();
      this._characterGroup.apply();
      this._itemGroup.apply();
    });
    this.on<IWillDestroyEvent>("willDestroy", () => {
      this.stop();
    });
    this.on<IDidDestroyEvent>("didDestroy", () => {
      this._playerGroup.destroy();
      this._map.destroy();
      this._characterGroup.destroy();
      this._itemGroup.destroy();
    });
    return this;
  }
  /**
   * Run the game.
   * The game will be updated every tickInterval milliseconds.
   * @param onTick A callback function that will be called every tick. The callback function should call next() to update the game data otherwise the tick will not be incremented.
   */
  public run(
    onTick?: (tick: (gameData?: IGameData | null) => IGameData | null) => void
  ) {
    this.checkDestroyed();
    this.checkInit();
    if (this._isRunning) {
      return;
    }
    this._isRunning = true;
    if (this._intervalID) {
      clearInterval(this._intervalID);
    }
    this._intervalID = setInterval(() => {
      onTick ? onTick(this.tick.bind(this)) : this.tick();
    }, this._tickInterval);
  }

  /**
   * Stop the game.
   * Will stop the game from updating. Call run() to resume the game.
   */
  public stop() {
    this.checkDestroyed();
    this.checkInit();
    if (!this._isRunning) {
      return;
    }
    this._isRunning = false;
    if (this._intervalID) {
      clearInterval(this._intervalID);
      this._intervalID = null;
    }
  }
  /**
   * Update the game data to the next tick manually.
   * @param gameData The game data to update to. If not provided, the game will run its own update logic to generate the next game data.
   * Pass null to skip the update and only increment the tick number.
   */
  public tick(gameData?: IGameData | null): IGameData | null {
    // Will skip this section if gameData is null
    if (gameData === undefined) {
      this._characterGroup.update<IActionPhase>("action", null);
      this._itemGroup.update<IActionPhase>("action", null);

      // Other update phases -  Not yet implemented - Reserved for future use.
      // this._characterGroup.update<IInteractionPhase>("interaction", null);
      // this._itemGroup.update<IInteractionPhase>("interaction", null);
      // this._characterGroup.update<ICorrectionPhase>("correction", null);
      // this._itemGroup.update<ICorrectionPhase>("correction", null);

      gameData = this.getUpdate();
    }
    // Apply the update
    this.setUpdate(gameData);
    // Increment the tick
    this._tickNum++;
    return gameData;
  }

  /**
   * Get the current game data.
   * @returns
   */
  public getData(): IGameData {
    // Get current data from all the child objects.
    // This is necessary because the data of Game may be cached as null values to indicate that the child data is not changed.
    let data: IGameData = { ...this.data };
    data.playerDataDict = this._playerGroup.getData();
    data.mapData = this._map.getData();
    data.characterDataDict = this._characterGroup.getData();
    data.itemDataDict = this._itemGroup.getData();
    return data;
  }
}

function _generateGameID(): string {
  gameNum++;
  return `G${gameNum}-${Math.floor(Math.random() * 36 * 36).toString(
    36
  )}${Date.now().toString(36)}`;
}

function _checkGameData(data: IGameData) {
  if (!data.mapData) {
    throw new Error("Map data is missing.");
  }
  if (!data.mapData.id) {
    throw new Error("Map ID is missing.");
  }
  if (!data.mapData.name) {
    throw new Error("Map name is missing.");
  }
  if (!data.mapData.colCount) {
    throw new Error("Map column count is missing.");
  }
  if (!data.mapData.rowCount) {
    throw new Error("Map row count is missing.");
  }
  if (!data.mapData.tileData2DArray) {
    throw new Error("Map tile data is missing.");
  }
  if (!data.playerDataDict) {
    throw new Error("Player data is missing.");
  }
  if (!data.characterDataDict) {
    throw new Error("Character data is missing.");
  }
  if (!data.itemDataDict) {
    throw new Error("Item data is missing.");
  }
}
