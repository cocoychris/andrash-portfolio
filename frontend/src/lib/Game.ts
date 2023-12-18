import TileManager, { ITileDataDict } from "./TileManager";
import CharacterGroup from "./CharacterGroup";
import { ICharacterData } from "./Character";

import ItemGroup from "./ItemGroup";
import { IGroupData } from "./data/Group";
import { IItemData } from "./Item";
import DataHolder, { DataObject } from "./data/DataHolder";
import Player, { IPlayerData } from "./Player";
import PlayerGroup from "./PlayerGroup";
import { applyDefault, cloneObject } from "./data/util";
import DataUpdater, { IUpdatePhase } from "./data/DataUpdater";
import { IDidDestroyEvent, IWillDestroyEvent } from "./Destroyable";
import AssetPack from "./data/AssetPack";
import FieldDef from "./data/FieldDef";
import MapInfo, { IMapInfo } from "./MapInfo";

export interface IGameData extends DataObject {
  /**
   * The id of the game. It will be created automatically when the game is created.
   * A game data with id of empty string is considered as a map data.
   */
  id: string;
  hostPlayerID?: number;
  playerDataDict: IGroupData<IPlayerData> | null;
  characterDataDict: IGroupData<ICharacterData> | null;
  itemDataDict: IGroupData<IItemData> | null;
  tileDataDict: ITileDataDict | null;
  assetPackName: string;
  mapInfoData: IMapInfo | null;
}

const GAME_DATA_FIELD_DEF = new FieldDef<IGameData>(
  {
    type: "object",
    children: {
      id: {
        type: "string",
        minLength: 0,
      },
      hostPlayerID: {
        type: "number",
        acceptUndefined: true,
      },
      playerDataDict: {
        type: "object",
      },
      characterDataDict: {
        type: "object",
      },
      itemDataDict: {
        type: "object",
      },
      tileDataDict: {
        type: "object",
      },
      assetPackName: {
        type: "string",
      },
      mapInfoData: {
        type: "object",
      },
    },
  },
  undefined,
  "gameData"
);

export interface IGameInitOptions {
  tickNum?: number;
  tickInterval?: number;
  mainPlayerID?: number;
}

/**
 * Reset phase: An update phase for resetting the game data to the before starting state.
 */
export interface IResetPhase extends IUpdatePhase {
  phase: "reset";
  props: null;
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

let gameNum = 0;

/**
 * Represents a game session. A game session contains all the game data and objects.
 * To restart a game, create a new Game instance.
 */
export default class Game extends DataHolder<IGameData> {
  /**
   * The default map ID.
   */
  public static readonly DEFAULT_MAP_ID = "default";
  public static readonly DEFAULT_TICK_INTERVAL = 600;
  public static readonly MIN_TICK_INTERVAL = 500;
  public static readonly MAX_TICK_INTERVAL = 5000;

  private _tickNum: number;
  private _intervalID: NodeJS.Timeout | null = null;
  private _isRunning: boolean = false;
  private _tickInterval: number = Game.DEFAULT_TICK_INTERVAL;
  private _assetPack: AssetPack | null = null;
  private _id: string = "";
  private _isInitialized: boolean = false;

  private _mapInfo?: MapInfo;
  private _playerGroup?: PlayerGroup;
  private _tileManager?: TileManager;
  private _itemGroup?: ItemGroup;
  private _characterGroup?: CharacterGroup;

  /**
   * Get the name of the asset pack used by the game.
   */
  public readonly assetPackName: string;
  /**
   * Get the map info of the game.
   */
  public get mapInfo(): MapInfo {
    return this._mapInfo as MapInfo;
  }
  /**
   * Get the player group that manages all the players.
   */
  public get playerGroup(): PlayerGroup {
    return this._playerGroup as PlayerGroup;
  }
  /**
   * Get the tile manager that manages all the tiles.
   */
  public get tileManager(): TileManager {
    return this._tileManager as TileManager;
  }
  /**
   * Get the item group that manages all the items.
   */
  public get itemGroup(): ItemGroup {
    return this._itemGroup as ItemGroup;
  }
  /**
   * Get the character group that manages all the characters.
   */
  public get characterGroup(): CharacterGroup {
    return this._characterGroup as CharacterGroup;
  }
  /**
   * Indicates if the game is initialized.
   */
  public get isInitialized(): boolean {
    return this._isInitialized;
  }
  /**
   * A unique ID of the game.
   * This is helpful when you want to distinguish different games.
   */
  public get id(): string {
    return this._id || this.data.id; // So the id can still be accessed after the game is destroyed.
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
   * Get the asset pack used by the game.
   * Only available after init().
   */
  public get assetPack(): AssetPack {
    return this._assetPack as AssetPack;
  }
  /**
   * Create a new game.
   * @param data The game data that will be used to create the game. It can be the data from an ongoing game session or a map data for starting a new game.
   * @param isMapData Whether the game data is a map data. Default to true.
   */
  constructor(data: IGameData, isMapData: boolean = true) {
    if (isMapData && data.id) {
      throw new Error(
        `Invalid game data: Game id ${data.id} found in map data.`
      );
    }
    if (!isMapData && !data.id) {
      throw new Error(`Invalid game data: Game id not found in game data.`);
    }
    //Check if the data is valid
    let result = GAME_DATA_FIELD_DEF.validate(data);
    if (!result.isValid) {
      throw new Error(`Invalid game data: ${result.message}`);
    }
    data = cloneObject(data); // Perform a deep clone as this is the top level of the data tree.
    applyDefault(data, {
      hostPlayerID: Player.ID_UNSET,
    });
    super(data);
    this._tickNum = 0;
    this.assetPackName = data.assetPackName;
  }
  /**
   * Initialize the game.
   * This will create playerGroup, map, characterGroup and itemGroup and all the child objects using the data provided in the constructor.
   * @param tickNum The initial tick number of the game. Default to 0.
   * @param tickInterval The update interval of the game in milliseconds. Default to 600.
   */
  public async init(options?: IGameInitOptions): Promise<this> {
    if (this._isInitialized) {
      throw new Error(`Game ${this.id} is already initialized.`);
    }
    this._isInitialized = true;
    // Set up properties
    const { tickNum, tickInterval, mainPlayerID } = applyDefault(
      options || {},
      {
        tickNum: 0,
        tickInterval: Game.DEFAULT_TICK_INTERVAL,
        mainPlayerID: Player.ID_UNSET,
      }
    );
    this._tickNum = tickNum as number;
    this._tickInterval = Math.min(
      Math.max(Math.floor(tickInterval as number), Game.MIN_TICK_INTERVAL),
      Game.MAX_TICK_INTERVAL
    );
    // Set up asset pack, this is the prerequisite of creating child objects
    this._assetPack = await AssetPack.load(this.assetPackName);
    this._assetPack.bind(this);

    // Create child DataHolders
    this._mapInfo = new MapInfo(this.data.mapInfoData as IMapInfo);
    this._playerGroup = new PlayerGroup(
      this,
      this.data.playerDataDict as IGroupData<IPlayerData>
    );
    this._tileManager = new TileManager(
      this,
      this.data.tileDataDict as ITileDataDict
    );
    this._characterGroup = new CharacterGroup(
      this,
      this.data.characterDataDict as IGroupData<ICharacterData>
    );
    this._itemGroup = new ItemGroup(
      this,
      this.data.itemDataDict as IGroupData<IItemData>
    );

    // Mount child DataHolders
    this.setChild("mapInfoData", this._mapInfo);
    this.setChild("playerDataDict", this._playerGroup);
    this.setChild("tileDataDict", this._tileManager);
    this.setChild("characterDataDict", this._characterGroup);
    this.setChild("itemDataDict", this._itemGroup);

    // Is map data
    let isMapData = !this.data.id;
    if (isMapData) {
      this.reset(); // Will set the game ID to empty string
      this._id = _generateGameID();
      this.data.id = this._id;
      this.apply();
    } else {
      this._id = this.data.id;
    }

    // Initialize child DataHolders. Order matters!
    this._playerGroup.init(mainPlayerID as number);
    this._tileManager.init();
    this._characterGroup.init();
    this._itemGroup.init();

    // Set up event listeners
    this.on<IWillDestroyEvent>("willDestroy", () => {
      console.log(`Game ${this.id} willDestroy.`);
      this.stop();
    });
    this.on<IDidDestroyEvent>("didDestroy", () => {
      console.log(`Game ${this.id} didDestroy.`);
      this.playerGroup.destroy();
      this.tileManager.destroy();
      this.characterGroup.destroy();
      this.itemGroup.destroy();
      this.mapInfo.destroy();
    });
    return this;
  }
  /**
   * This will reset all the play-time data of the game to the initial state.
   * Which includes releasing all the occupied players.
   * Reset the data when you just created a new game and want to make sure that the gameData does not contain any play-time changes.
   * It is also ideal to reset the game data when you are saving a gameData as a mapData.
   */
  public reset() {
    this.playerGroup.update<IResetPhase>("reset", null);
    this.tileManager.update<IResetPhase>("reset", null);
    this.characterGroup.update<IResetPhase>("reset", null);
    this.itemGroup.update<IResetPhase>("reset", null);
    this.mapInfo.update<IResetPhase>("reset", null);
    this.setData({
      id: "",
      hostPlayerID: Player.ID_UNSET,
    });
    this.apply();
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
    this._checkInit();
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
    this._checkInit();
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
      this.characterGroup.update<IActionPhase>("action", null);
      this.itemGroup.update<IActionPhase>("action", null);

      // Other update phases -  Not yet implemented - Reserved for future use.
      // this.characterGroup.update<IInteractionPhase>("interaction", null);
      // this.itemGroup.update<IInteractionPhase>("interaction", null);
      // this.characterGroup.update<ICorrectionPhase>("correction", null);
      // this.itemGroup.update<ICorrectionPhase>("correction", null);

      gameData = this.getUpdate() as IGameData;
    }
    // Apply the update
    this.setUpdate(gameData);
    // Increment the tick
    this._tickNum++;
    return gameData;
  }

  private _checkInit() {
    if (!this._isInitialized) {
      throw new Error(`Game ${this.id} is not initialized.`);
    }
  }
}

function _generateGameID(): string {
  gameNum++;
  return `G${gameNum}-${Math.floor(Math.random() * 36 * 36).toString(
    36
  )}${Date.now().toString(36)}`;
}
