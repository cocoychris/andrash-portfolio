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
  IWillGetUpdateEvent,
} from "./DataHolder";
import { IPlayerData } from "./Player";
import PlayerGroup from "./PlayerGroup";

export interface IGameData {
  id?: string;
  hostPlayerID?: number;
  playerDataDict: IGroupData<IPlayerData> | null;
  characterDataDict: IGroupData<ICharacterData> | null;
  itemDataDict: IGroupData<IItemData> | null;
  mapData: IMapData | null;
}
export interface IGameDef {
  charaterDefPack: IDefPack<ICharacterDef>;
  tileDefPack: IDefPack<ITileDef>;
  itemDefPack: IDefPack<IItemDef>;
}

const DEFAULT_UPDATE_INTERVAL = 600;
const MIN_UPDATE_INTERVAL = 500;
const MAX_UPDATE_INTERVAL = 5000;
let gameNum = 0;

/**
 * Represents a game session. A game session contains all the game data and objects.
 * To restart a game, create a new Game instance.
 */
export default class Game extends DataHolder<IGameData> {
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

  public get id(): string {
    return this.data.id as string;
  }

  public get tickNum(): number {
    return this._tickNum;
  }

  public get hostPlayerID(): number {
    return this.data.hostPlayerID as number;
  }
  public set hostPlayerID(id: number) {
    this.data.hostPlayerID = id;
  }
  /**
   * Get the player group that manages all the players.
   */
  public get playerGroup(): PlayerGroup {
    return this._playerGroup;
  }
  /**
   * Get the game map object that contains all the tiles and map information.
   */
  public get map(): GameMap {
    return this._map;
  }
  /**
   * Get the item group that manages all the items.
   */
  public get itemGroup(): ItemGroup {
    return this._itemGroup;
  }
  /**
   * Get the character group that manages all the characters.
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

  public get tickInterval(): number {
    return this._tickInterval;
  }

  constructor(gameDef: IGameDef, data: IGameData) {
    data = { ...data };
    !data.id && (data.id = _generateGameID());
    data.hostPlayerID === undefined && (data.hostPlayerID = -1);
    super(data);
    this._tickNum = 0;
    this._tileDefLoader = new DefLoader(gameDef.tileDefPack);
    this._characterDefLoader = new DefLoader(gameDef.charaterDefPack);
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
   * @param gameData The game data to update to. If not provided, the game calls getUpdate() to get the game data. Pass null to skip the update and only increment the tick.
   */
  public tick(gameData?: IGameData | null): IGameData | null {
    gameData = gameData === undefined ? this.getUpdate() : gameData;
    this.setUpdate(gameData);
    // Increment the tick
    this._tickNum++;
    return gameData;
  }
  /**
   * Get the staged game data.
   * @returns
   */
  public getStagedData(): IGameData {
    // Get staged data from all the child objects.
    // This is necessary because the data of Game may be cached as null values to indicate that the child data is not changed.
    let data: IGameData = { ...super.getStagedData() };
    data.playerDataDict = this._playerGroup.getStagedData();
    data.mapData = this._map.getStagedData();
    data.characterDataDict = this._characterGroup.getStagedData();
    data.itemDataDict = this._itemGroup.getStagedData();
    return data;
  }
  /**
   * Get the current game data.
   * @returns
   */
  public getCurrentData(): IGameData {
    // Get current data from all the child objects.
    // This is necessary because the data of Game may be cached as null values to indicate that the child data is not changed.
    let data: IGameData = { ...this.data };
    data.playerDataDict = this._playerGroup.getCurrentData();
    data.mapData = this._map.getCurrentData();
    data.characterDataDict = this._characterGroup.getCurrentData();
    data.itemDataDict = this._itemGroup.getCurrentData();
    return data;
  }

  public destroy() {
    this.stop();
    this._playerGroup.destroy();
    this._map.destroy();
    this._characterGroup.destroy();
    this._itemGroup.destroy();
    super.destroy();
  }
}

function _generateGameID(): string {
  gameNum++;
  return `G${gameNum}-${Math.floor(Math.random() * 36 * 36).toString(
    36
  )}${Date.now().toString(36)}}`;
}
