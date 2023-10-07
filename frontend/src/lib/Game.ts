import GameMap, { IMapData } from "./GameMap";
import DefLoader from "./DefLoader";
import { ICharacterDef, IDefGroup, IItemDef, ITileDef } from "./IDefinition";
import CharacterGroup from "./CharacterGroup";
import { ICharacterData } from "./Character";

import ItemGroup from "./ItemGroup";
import { IGroupData } from "./Group";
import { IItemData } from "./Item";
import DataHolder from "./DataHolder";
import DataHolderEvent from "./events/DataHolderEvent";
import Position from "./Position";

export interface IGameData {
  characterDataDict: IGroupData<ICharacterData> | null;
  itemDataDict: IGroupData<IItemData> | null;
  mapData: IMapData | null;
}
export interface IGameDef {
  charaterDefGroup: IDefGroup<ICharacterDef>;
  tileDefGroup: IDefGroup<ITileDef>;
  itemDefGroup: IDefGroup<IItemDef>;
}

/**
 * Represents a game session. A game session contains all the game data and objects.
 * To restart a game, create a new Game instance.
 */
export default class Game extends DataHolder<IGameData> {
  private _characterGroup: CharacterGroup;
  private _itemGroup: ItemGroup;
  private _map: GameMap;
  private _tileDefLoader: DefLoader<ITileDef>;
  private _characterDefLoader: DefLoader<ICharacterDef>;
  private _itemDefLoader: DefLoader<IItemDef>;

  /**
   * Get the game map object that contains all the tiles and map information.
   */
  public get map(): GameMap {
    return this._map;
  }
  /**
   * Get the item manager that manages all the items.
   */
  public get itemGroup(): ItemGroup {
    return this._itemGroup;
  }
  /**
   * Get the character manager that manages all the characters.
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

  constructor(gameDef: IGameDef, data: IGameData) {
    super(data);
    this._tileDefLoader = new DefLoader(gameDef.tileDefGroup);
    this._characterDefLoader = new DefLoader(gameDef.charaterDefGroup);
    this._itemDefLoader = new DefLoader(gameDef.itemDefGroup);
    if (!this._data.mapData) {
      throw new Error("Map data is required");
    }
    if (!this._data.characterDataDict) {
      throw new Error("Character data is required");
    }
    if (!this._data.itemDataDict) {
      throw new Error("Item data is required");
    }
    this._map = new GameMap(this, this._data.mapData);
    this._characterGroup = new CharacterGroup(
      this,
      this._data.characterDataDict
    );
    this._itemGroup = new ItemGroup(this, this._data.itemDataDict);
  }
  /**
   * Initialize the game.
   */
  public init() {
    super.init();
    // Initialize child objects
    this._map.init();
    this._characterGroup.init();
    this._itemGroup.init();
    // Set up event listeners
    this.addEventListener(DataHolderEvent.WILL_GET_UPDATE, () => {
      this._getChildUpdate();
    });
    this.addEventListener(DataHolderEvent.DID_SET_UPDATE, () => {
      this._setChildUpdate();
    });
  }

  private _getChildUpdate() {
    // let d1 = this._map.getUpdate();
    // console.log("mapData", d1);
    // this._data.mapData = d1;

    // let d2 = this._characterGroup.getUpdate();
    // console.log("characterDataDict", d2);
    // this._data.characterDataDict = d2;

    // let d3 = this._itemGroup.getUpdate();
    // console.log("itemDataDict", d3);
    // this._data.itemDataDict = d3;

    this._data.mapData = this._map.getUpdate();
    this._data.characterDataDict =
      this._characterGroup.getUpdate() as IGroupData<ICharacterData>;
    this._data.itemDataDict =
      this._itemGroup.getUpdate() as IGroupData<IItemData>;
  }
  private _setChildUpdate() {
    this._map.setUpdate(this._data.mapData);
    this._characterGroup.setUpdate(this._data.characterDataDict);
    this._itemGroup.setUpdate(this._data.itemDataDict);
  }
}
