import DefPack, { ITileDef } from "./data/DefPack";
import TileManager from "./TileManager";
import DataHolder, {
  DataObject,
  IDidApplyEvent,
  IDidSetUpdateEvent,
} from "./data/DataHolder";
import Character from "./Character";
import Item from "./Item";
import Position, { IPosition } from "./Position";
import AnyEvent, { IEventType } from "./events/AnyEvent";
import FieldDef from "./data/FieldDef";

export interface ITileData extends DataObject {
  // Name of the tile definition (ITypeDef.name)
  type: string;
  // If null, use ITypeDef.walkable
  walkable?: boolean | null;
  // If null, use ITypeDef.bgColor
  bgColor?: string | null;
}

export interface ICharacterAddedEvent extends IEventType {
  type: "characterAdded";
  data: {
    isPrev: boolean;
    character: Character;
  };
}
export interface ICharacterRemovedEvent extends IEventType {
  type: "characterRemoved";
  data: {
    isPrev: boolean;
    character: Character;
  };
}
export interface IItemAddedEvent extends IEventType {
  type: "itemAdded";
  data: {
    item: Item;
  };
}
export interface IItemRemovedEvent extends IEventType {
  type: "itemRemoved";
  data: {
    item: Item;
  };
}

function getFieldDef(data: ITileData, tileDefPack: DefPack<ITileDef>) {
  return new FieldDef<ITileData>(
    {
      type: "object",
      acceptNull: false,
      children: {
        type: {
          type: "string",
          valueList: tileDefPack.typeNames,
        },
        walkable: {
          type: "boolean",
          acceptUndefined: true,
          acceptNull: true,
        },
        bgColor: {
          type: "string",
          inputType: "color",
          acceptUndefined: true,
          acceptNull: true,
          regExp: /#[0-f]{6}/i,
        },
      },
    },
    data,
    "tileData"
  );
}

//Tile class
export default class Tile extends DataHolder<ITileData> implements IPosition {
  private _tileDef: ITileDef;
  private _manager: TileManager;
  private _position: IPosition;
  private _adjacentTiles: Array<Tile> | null = null;
  private _characters: Set<Character> = new Set();
  private _prevCharacters: Set<Character> = new Set();
  private _items: Set<Item> = new Set();
  private internal = {
    addCharacter: this._addCharacter.bind(this),
    removeCharacter: this._removeCharacter.bind(this),
    addPrevCharacter: this._addPrevCharacter.bind(this),
    removePrevCharacter: this._removePrevCharacter.bind(this),
    addItem: this._addItem.bind(this),
    removeItem: this._removeItem.bind(this),
  };

  /**
   * The row where the tile is located in the grid
   */
  public readonly row: number;
  /**
   * The column where the tile is located in the grid
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
    if (!this._manager.tileDefPack.get(type)) {
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
   * Get the manager of the tile
   */
  public get manager(): TileManager {
    return this._manager;
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
  public get bgSVGName(): string | null {
    return this._tileDef.bgSVGName;
  }
  /**
   * Get foreground image
   */
  public get fgSVGName(): string | null {
    return this._tileDef.fgSVGName;
  }
  /**
   * All characters on the tile
   */
  public get characters(): Array<Character> {
    return Array.from(this._characters);
  }
  public get prevCharacters(): Array<Character> {
    return Array.from(this._prevCharacters);
  }
  /**
   * All items on the tile
   */
  public get items(): Array<Item> {
    return Array.from(this._items);
  }
  /**
   * Get the tile on the top of this tile
   */
  public get topTile(): Tile | null {
    return this._manager.getTile({ row: this.row - 1, col: this.col });
  }
  /**
   * Get the tile relative to this tile
   */
  public get bottomTile(): Tile | null {
    return this._manager.getTile({ row: this.row + 1, col: this.col });
  }
  /**
   * Get the tile relative to this tile
   */
  public get leftTile(): Tile | null {
    return this._manager.getTile({ row: this.row, col: this.col - 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get rightTile(): Tile | null {
    return this._manager.getTile({ row: this.row, col: this.col + 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get topLeftTile(): Tile | null {
    return this._manager.getTile({ row: this.row - 1, col: this.col - 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get topRightTile(): Tile | null {
    return this._manager.getTile({ row: this.row - 1, col: this.col + 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get bottomLeftTile(): Tile | null {
    return this._manager.getTile({ row: this.row + 1, col: this.col - 1 });
  }
  /**
   * Get the tile relative to this tile
   */
  public get bottomRightTile(): Tile | null {
    return this._manager.getTile({ row: this.row + 1, col: this.col + 1 });
  }
  /**
   * Indicate if the tile is highlighted
   */
  public isSelected: boolean = false;
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
  constructor(manager: TileManager, tileData: ITileData, position: IPosition) {
    super(tileData);
    this._manager = manager;
    this._tileDef = this._getTileDef();
    this.col = position.col;
    this.row = position.row;
    this._position = position;

    //Set up event listeners
    this.on<IDidSetUpdateEvent>("didSetUpdate", () => {
      this._adjacentTiles = null;
    });
    this.on<IDidApplyEvent>("didApply", (event: AnyEvent<IDidApplyEvent>) => {
      if (event.data.changes.updateProps.includes("type")) {
        this._tileDef = this._getTileDef();
      }
    });
  }

  public getFieldDef(): FieldDef<ITileData> {
    return getFieldDef(this.data, this._manager.tileDefPack);
  }

  public hasCharacter(character: Character): boolean {
    return this._characters.has(character);
  }
  public hasPrevCharacter(character: Character): boolean {
    return this._prevCharacters.has(character);
  }
  public hasItem(item: Item): boolean {
    return this._items.has(item);
  }

  public setData(data: Partial<ITileData>): void {
    super.setData(data);
  }

  private _addCharacter(character: Character) {
    this._characters.add(character);
    this.emit<ICharacterAddedEvent>(
      new AnyEvent<ICharacterAddedEvent>("characterAdded", {
        isPrev: false,
        character,
      })
    );
  }
  private _removeCharacter(character: Character) {
    this._characters.delete(character);
    this.emit<ICharacterRemovedEvent>(
      new AnyEvent<ICharacterRemovedEvent>("characterRemoved", {
        isPrev: false,
        character,
      })
    );
  }
  private _addPrevCharacter(character: Character) {
    this._prevCharacters.add(character);
    this.emit<ICharacterAddedEvent>(
      new AnyEvent<ICharacterAddedEvent>("characterAdded", {
        isPrev: true,
        character,
      })
    );
  }
  private _removePrevCharacter(character: Character) {
    this._prevCharacters.delete(character);
    this.emit<ICharacterRemovedEvent>(
      new AnyEvent<ICharacterRemovedEvent>("characterRemoved", {
        isPrev: true,
        character,
      })
    );
  }
  private _addItem(item: Item) {
    this._items.add(item);
    this.emit<IItemAddedEvent>(
      new AnyEvent<IItemAddedEvent>("itemAdded", { item })
    );
  }
  private _removeItem(item: Item) {
    this._items.delete(item);
    this.emit<IItemRemovedEvent>(
      new AnyEvent<IItemRemovedEvent>("itemRemoved", { item })
    );
  }

  private _getTileDef(): ITileDef {
    let tileDef = this._manager.tileDefPack.get(this.data.type);
    if (!tileDef) {
      throw new Error(`Tile type ${this.data.type} not found`);
    }
    return tileDef;
  }
}
