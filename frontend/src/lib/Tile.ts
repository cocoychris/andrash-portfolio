import { ITileDef } from "../lib/IDefinition";
import GameMap from "./GameMap";
import DataHolder, { IDidSetUpdateEvent } from "./DataHolder";
import Character from "./Character";
import Item from "./Item";
import Position, { IPosition } from "./Position";

export interface ITileData {
  // Name of the tile definition (ITypeDef.name)
  type: string;
  // If null, use ITypeDef.walkable
  walkable?: boolean | null;
  // If null, use ITypeDef.bgColor
  bgColor?: string | null;
}

//Tile class
export default class Tile extends DataHolder<ITileData> implements IPosition {
  private _tileDef: ITileDef;
  private _map: GameMap;
  private _position: IPosition;
  private _adjacentTiles: Array<Tile> | null = null;

  /**
   * Only access this from Character and Item class
   */
  public internal = Object.freeze({
    characters: new Set<Character>(),
    prevCharacters: new Set<Character>(),
    items: new Set<Item>(),
  });

  /**
   * The row where the tile is located in the map
   */
  public readonly row: number;
  /**
   * The column where the tile is located in the map
   */
  public readonly col: number;
  /**
   * Get the position of the tile
   */
  public get position(): Position {
    return new Position(this._position);
  }
  /**
   * Get type of the tile
   */
  public get type(): string {
    return this.data.type;
  }
  public set type(type: string) {
    if (!this._map.game.tileDefLoader.getDef(type)) {
      throw new Error(`Tile type ${type} not found`);
    }
    this.data.type = type;
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
    if (this.data.walkable != null) {
      return this.data.walkable;
    }
    return this._tileDef.walkable;
  }
  public set walkable(walkable: boolean | null) {
    this.data.walkable = walkable;
  }
  /**
   * Get background color
   */
  public get bgColor(): string | null {
    if (this.data.bgColor != null) {
      return this.data.bgColor;
    }
    return this._tileDef.bgColor;
  }
  public set bgColor(bgColor: string | null) {
    this.data.bgColor = bgColor;
  }
  /**
   * Get background image
   */
  public get bgImageID(): string | null {
    return this._tileDef.bgImageID;
  }
  /**
   * Get foreground image
   */
  public get fgImageID(): string | null {
    return this._tileDef.fgImageID;
  }
  /**
   * All characters on the tile
   */
  public get characters(): Array<Character> {
    return Array.from(this.internal.characters);
  }
  public get prevCharacters(): Array<Character> {
    return Array.from(this.internal.prevCharacters);
  }
  /**
   * All items on the tile
   */
  public get items(): Array<Item> {
    return Array.from(this.internal.items);
  }
  /**
   * Get the tile on the top of this tile
   */
  public get topTile(): Tile | null {
    return this._map.getTile({ row: this.row - 1, col: this.col });
  }
  /**
   * Get the tile relative to this tile
   */
  public get bottomTile(): Tile | null {
    return this._map.getTile({ row: this.row + 1, col: this.col });
  }
  /**
   * Get the tile relative to this tile
   */
  public get leftTile(): Tile | null {
    return this._map.getTile({ row: this.row, col: this.col - 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get rightTile(): Tile | null {
    return this._map.getTile({ row: this.row, col: this.col + 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get topLeftTile(): Tile | null {
    return this._map.getTile({ row: this.row - 1, col: this.col - 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get topRightTile(): Tile | null {
    return this._map.getTile({ row: this.row - 1, col: this.col + 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get bottomLeftTile(): Tile | null {
    return this._map.getTile({ row: this.row + 1, col: this.col - 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get bottomRightTile(): Tile | null {
    return this._map.getTile({ row: this.row + 1, col: this.col + 1 });
  }
  /**
   * Get all adjacent tiles
   */
  public get adjacentTiles(): Array<Tile> {
    if (this._adjacentTiles) {
      return this._adjacentTiles;
    }
    this._adjacentTiles = [
      this.topTile,
      this.bottomTile,
      this.leftTile,
      this.rightTile,
      this.topLeftTile,
      this.topRightTile,
      this.bottomLeftTile,
      this.bottomRightTile,
    ].filter((tile) => tile != null) as Array<Tile>;
    return this._adjacentTiles;
  }

  /**
   * Create a new tile
   * @param tileData
   */
  constructor(map: GameMap, tileData: ITileData, position: IPosition) {
    super(tileData);
    this._map = map;
    this._tileDef = this._getTileDef();
    this.col = position.col;
    this.row = position.row;
    this._position = position;
  }
  /**
   * Initialize the tile
   */
  public init(): this {
    super.init();
    //Set up event listeners
    this.on<IDidSetUpdateEvent>("didSetUpdate", () => {
      // this._tileDef = this._getTileDef();
      this._adjacentTiles = null;
    });
    return this;
  }

  private _getTileDef(): ITileDef {
    let tileDef = this._map.game.tileDefLoader.getDef(this.data.type);
    if (!tileDef) {
      throw new Error(`Tile type ${this.data.type} not found`);
    }
    return tileDef;
  }
}
