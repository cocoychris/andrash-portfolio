import { ITileDef } from "../lib/IDefinition";
import GameMap from "./GameMap";
import DataHolder from "./DataHolder";
import DataHolderEvent from "./events/DataHolderEvent";

export interface ITileData {
  // Name of the tile definition (ITypeDef.name)
  type: string;
  // If null, use ITypeDef.walkable
  walkable?: boolean | null;
  // If null, use ITypeDef.bgColor
  bgColor?: string | null;
}

//Tile class
export default class Tile extends DataHolder<ITileData> {
  private _tileDef: ITileDef;
  private _map: GameMap;
  // private _position: Position;
  /**
   * Get type of the tile
   */
  public get type(): string {
    return this._data.type;
  }

  public set type(type: string) {
    if (!this._map.game.tileDefLoader.getDef(type)) {
      throw new Error(`Tile type ${type} not found`);
    }
    this._data.type = type;
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
    if (this._data.walkable != null) {
      return this._data.walkable;
    }
    return this._tileDef.walkable;
  }
  public set walkable(walkable: boolean | null) {
    this._data.walkable = walkable;
  }
  /**
   * Get background color
   */
  public get bgColor(): string | null {
    if (this._data.bgColor != null) {
      return this._data.bgColor;
    }
    return this._tileDef.bgColor;
  }
  public set bgColor(bgColor: string | null) {
    this._data.bgColor = bgColor;
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
   * Create a new tile
   * @param tileData
   */
  constructor(map: GameMap, tileData: ITileData) {
    super(tileData, true);
    this._map = map;
    this._tileDef = this._getTileDef();
  }
  /**
   * Initialize the tile
   */
  public init(): void {
    super.init();
    //Set up event listeners
    this.addEventListener(DataHolderEvent.DID_SET_UPDATE, () => {
      this._tileDef = this._getTileDef();
    });
  }

  private _getTileDef(): ITileDef {
    let tileDef = this._map.game.tileDefLoader.getDef(this._data.type);
    if (!tileDef) {
      throw new Error(`Tile type ${this._data.type} not found`);
    }
    return tileDef;
  }
}
