import Item, { IItemData } from "./Item";
import { ITileDef } from "../lib/IDefinition";
import TileEvent from "./events/TileEvent";
import ItemEvent from "./events/ItemEvent";
import GameMap from "./GameMap";

export interface ITileData {
  // Name of the tile definition (ITypeDef.name)
  type: string;
  // If null, use ITypeDef.walkable
  walkable?: boolean | null;
  // If null, use ITypeDef.bgColor
  bgColor?: string | null;
  // Data for creating an Item object
  itemData?: IItemData | null;
}

//Tile class
export default class Tile extends EventTarget {
  private _data: ITileData;
  private _tileDef: ITileDef;
  private _item: Item | null = null;
  // private _position: Position;
  /**
   * Get type of the tile
   */
  public get type(): string {
    return this._tileDef.name;
  }
  /**
   * Get copy of tile definition
   */
  public get tileDef(): ITileDef {
    return { ...this._tileDef };
  }
  /**
   * Indicate if the tile is walkable
   */
  public get walkable(): boolean {
    return this._data.walkable == null
      ? this._tileDef.walkable
      : this._data.walkable;
  }
  /**
   * Get background color
   */
  public get bgColor(): string | null {
    return this._data.bgColor == null
      ? this._tileDef.bgColor
      : this._data.bgColor;
  }
  /**
   * Get background image
   */
  public get bgImage(): string | null {
    return this._tileDef.bgImage;
  }
  /**
   * Get foreground image
   */
  public get fgImage(): string | null {
    return this._tileDef.fgImage;
  }
  /**
   * Get copy of data
   */
  public get data(): ITileData {
    return { ...this._data };
  }

  public get item(): Item | null {
    return this._item;
  }

  public set item(item: Item | null) {
    if (this._item == item) {
      return;
    }
    if (this._item) {
      this._item.removeEventListener(ItemEvent.ADD, this._onItemAdd);
      this._item.dispatchEvent(new ItemEvent(ItemEvent.REMOVE));
      this.dispatchEvent(new TileEvent(TileEvent.ITEM_REMOVE, this._item));
    }
    this._item = item;
    if (this._item) {
      this.dispatchEvent(new TileEvent(TileEvent.ITEM_ADD, this._item));
      this._item.dispatchEvent(new ItemEvent(ItemEvent.ADD));
      this._item.addEventListener(ItemEvent.ADD, this._onItemAdd);
    }
    this.dispatchEvent(new TileEvent(TileEvent.ITEM_CHANGE, this._item));
  }

  /**
   * Create a new tile
   * @param tileData
   */
  constructor(gameMap: GameMap, tileData: ITileData) {
    super();
    this._data = tileData;
    this._tileDef = gameMap.tileDefLoader.getDef(tileData.type);
    if (!this._tileDef) {
      throw new Error(`Tile type ${tileData.type} not found`);
    }
    if (this._data.itemData) {
      this.item = new Item(gameMap.game, this._data.itemData);
    }
  }

  private _onItemAdd = () => {
    this.item = null;
  };
}
