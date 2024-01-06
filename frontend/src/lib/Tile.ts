import TileManager from "./TileManager";
import DataHolder, {
  DataObject,
  IDidApplyEvent,
  IDidSetUpdateEvent,
  deepClone,
} from "./data/DataHolder";
import Character from "./Character";
import Item from "./Item";
import Position, { IPosition } from "./Position";
import AnyEvent, { IEventType } from "./events/AnyEvent";
import FieldDef from "./data/FieldDef";
import TileDefPack, { ITileDef } from "./data/TileDefPack";
import { applyDefault, randomElement } from "./data/util";

export interface ITileData extends DataObject {
  // Name of the tile definition (ITypeDef.name)
  type: string;
  // If null, use ITypeDef.walkable
  walkable?: boolean | null;
  // If null, use ITypeDef.bgColor
  bgColor?: string | null;
  displayText?: IDisplayText;
}

const DEFAULT_TILE_DATA: Partial<ITileData> = {
  walkable: null,
  bgColor: null,
  displayText: {
    text: "",
  },
};

export interface IDisplayText extends DataObject {
  text: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: "left" | "right" | "center";
  verticalAlign?: "start" | "end" | "center";
  lineHeight?: number;
  letterSpacing?: number;
  shadowColor?: string;
  shadowBlur?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
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

function getFieldDef(data: ITileData, tileDefPack: TileDefPack) {
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
        displayText: {
          type: "object",
          acceptUndefined: true,
          children: {
            text: {
              type: "string",
            },
            color: {
              type: "string",
              acceptUndefined: true,
              inputType: "color",
              regExp: /#[0-f]{6}/i,
            },
            fontSize: {
              type: "number",
              acceptUndefined: true,
            },
            fontWeight: {
              type: "string",
              acceptUndefined: true,
            },
            fontFamily: {
              type: "string",
              acceptUndefined: true,
            },
            textAlign: {
              type: "string",
              valueList: ["left", "right", "center"],
              acceptUndefined: true,
            },
            verticalAlign: {
              type: "string",
              valueList: ["start", "end", "center"],
              acceptUndefined: true,
            },
            lineHeight: {
              type: "number",
              acceptUndefined: true,
            },
            letterSpacing: {
              type: "number",
              acceptUndefined: true,
            },
            shadowColor: {
              type: "string",
              inputType: "color",
              regExp: /#[0-f]{6}/i,
              acceptUndefined: true,
            },
            shadowBlur: {
              type: "number",
              acceptUndefined: true,
            },
            marginTop: {
              type: "number",
              acceptUndefined: true,
            },
            marginBottom: {
              type: "number",
              acceptUndefined: true,
            },
            marginLeft: {
              type: "number",
              acceptUndefined: true,
            },
            marginRight: {
              type: "number",
              acceptUndefined: true,
            },
          },
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
  private _displayText: IDisplayText;
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
    let walkable =
      this.data.walkable == null ? this._tileDef.walkable : this.data.walkable;
    if (!walkable) {
      return false;
    }
    let unwalkableItem = this.items.find((item) => {
      return !item.walkable;
    });
    if (unwalkableItem) {
      return false;
    }
    return true;
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
   * Get background image name
   */
  public get bgImageName(): string | null {
    return this._tileDef.bgImageName || null;
  }
  /**
   * Get background image name
   */
  public get fgImageName(): string | null {
    return this._tileDef.fgImageName || null;
  }
  /**
   * Get foreground image name
   */
  public get fgSVGName(): string | null {
    return this._tileDef.fgSVGName || null;
  }
  /**
   * Get display text options
   */
  public get displayText(): IDisplayText {
    return this._displayText;
  }
  /**
   * Set display text options
   */
  public set displayText(displayText: IDisplayText | null) {
    this.data.displayText = displayText || undefined;
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
   * Indicate if the tile is a transition tile (not a main tile);
   */
  public get isTransition(): boolean {
    return this._tileDef.transition != null;
  }
  /**
   * Indicate if the tile is a pathway tile
   */
  public get isPathway(): boolean {
    return this._tileDef.pathway != null;
  }
  /**
   * Get the texture of the pathway of this tile
   */
  public get pathwayTexture(): string | null {
    if (!this._tileDef.pathway) {
      return null;
    }
    return this._tileDef.pathway.texture;
  }
  /**
   * Get the texture of the transition of this tile
   */
  public get transitionTexture(): string | null {
    if (!this._tileDef.transition) {
      return null;
    }
    return this._tileDef.transition.texture;
  }
  /**
   * Get the main texture of this tile
   */
  public get texture(): string {
    return this._tileDef.texture;
  }
  /**
   * Get the texture at the top left of this tile
   */
  public get topLeftTexture(): string {
    return this._tileDef._textures[0];
  }
  /**
   * Get the texture at the top of this tile
   */
  public get topTexture(): string {
    return this._tileDef._textures[1];
  }
  /**
   * Get the texture at the top right of this tile
   */
  public get topRightTexture(): string {
    return this._tileDef._textures[2];
  }
  /**
   * Get the texture at the left of this tile
   */
  public get leftTexture(): string {
    return this._tileDef._textures[3];
  }
  /**
   * Get the texture at the right of this tile
   */
  public get rightTexture(): string {
    return this._tileDef._textures[4];
  }
  /**
   * Get the texture at the bottom left of this tile
   */
  public get bottomLeftTexture(): string {
    return this._tileDef._textures[5];
  }
  /**
   * Get the texture at the bottom of this tile
   */
  public get bottomTexture(): string {
    return this._tileDef._textures[6];
  }
  /**
   * Get the texture at the bottom right of this tile
   */
  public get bottomRightTexture(): string {
    return this._tileDef._textures[7];
  }
  /**
   * Get the pathway texture of the top left of this tile
   */
  public get topLeftPathwayTexture(): string {
    return this._tileDef._textures[8];
  }
  /**
   * Get the pathway texture of the top of this tile
   */
  public get topPathwayTexture(): string {
    return this._tileDef._textures[9];
  }
  /**
   * Get the pathway texture of the top right of this tile
   */
  public get topRightPathwayTexture(): string {
    return this._tileDef._textures[10];
  }
  /**
   * Get the pathway texture of the left of this tile
   */
  public get leftPathwayTexture(): string {
    return this._tileDef._textures[11];
  }
  /**
   * Get the pathway texture of the right of this tile
   */
  public get rightPathwayTexture(): string {
    return this._tileDef._textures[12];
  }
  /**
   * Get the pathway texture of the bottom left of this tile
   */
  public get bottomLeftPathwayTexture(): string {
    return this._tileDef._textures[13];
  }
  /**
   * Get the pathway texture of the bottom of this tile
   */
  public get bottomPathwayTexture(): string {
    return this._tileDef._textures[14];
  }
  /**
   * Get the pathway texture of the bottom right of this tile
   */
  public get bottomRightPathwayTexture(): string {
    return this._tileDef._textures[15];
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
      this.topLeftTile,
      this.topTile,
      this.topRightTile,
      this.leftTile,
      this.rightTile,
      this.bottomLeftTile,
      this.bottomTile,
      this.bottomRightTile,
    ].filter((tile) => tile != null) as Array<Tile>;
    return this._adjacentTiles;
  }

  /**
   * Create a new tile
   * @param tileData
   */
  constructor(manager: TileManager, tileData: ITileData, position: IPosition) {
    super(applyDefault(tileData, DEFAULT_TILE_DATA));
    this._manager = manager;
    this._tileDef = this._getTileDef();
    this._displayText = this._getDisplayText();
    this.col = position.col;
    this.row = position.row;
    this._position = position;

    //Set up event listeners
    this.on<IDidSetUpdateEvent>(
      "didSetUpdate",
      (event: AnyEvent<IDidSetUpdateEvent>) => {
        this._adjacentTiles = null;
        this._displayText = this._getDisplayText();
        if (event.data.changes.updateProps.includes("type")) {
          this._tileDef = this._getTileDef();
        }
      }
    );
    this.on<IDidApplyEvent>("didApply", (event: AnyEvent<IDidApplyEvent>) => {
      this._displayText = this._getDisplayText();
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

  /**
   * This function will transform the current tile into a transition tile based on the adjacent tiles.
   */
  public autoTransition(): string | null {
    const TEXTURE_NONE = TileDefPack.TEXTURE_NONE;
    const PATHWAY_NONE = TileDefPack.PATHWAY_NONE;
    const adjacentTextures = [
      this.topLeftTile ? this.topLeftTile.bottomRightTexture : TEXTURE_NONE,
      this.topTile ? this.topTile.bottomTexture : TEXTURE_NONE,
      this.topRightTile ? this.topRightTile.bottomLeftTexture : TEXTURE_NONE,
      this.leftTile ? this.leftTile.rightTexture : TEXTURE_NONE,
      this.rightTile ? this.rightTile.leftTexture : TEXTURE_NONE,
      this.bottomLeftTile ? this.bottomLeftTile.topRightTexture : TEXTURE_NONE,
      this.bottomTile ? this.bottomTile.topTexture : TEXTURE_NONE,
      this.bottomRightTile ? this.bottomRightTile.topLeftTexture : TEXTURE_NONE,
      this.topLeftTile
        ? this.topLeftTile.bottomRightPathwayTexture
        : PATHWAY_NONE,
      this.topTile ? this.topTile.bottomPathwayTexture : PATHWAY_NONE,
      this.topRightTile
        ? this.topRightTile.bottomLeftPathwayTexture
        : PATHWAY_NONE,
      this.leftTile ? this.leftTile.rightPathwayTexture : PATHWAY_NONE,
      this.rightTile ? this.rightTile.leftPathwayTexture : PATHWAY_NONE,
      this.bottomLeftTile
        ? this.bottomLeftTile.topRightPathwayTexture
        : PATHWAY_NONE,
      this.bottomTile ? this.bottomTile.topPathwayTexture : PATHWAY_NONE,
      this.bottomRightTile
        ? this.bottomRightTile.topLeftPathwayTexture
        : PATHWAY_NONE,
    ];
    let tileTypeList =
      this.manager.tileDefPack.searchAutoTileTypes(adjacentTextures);
    if (tileTypeList) {
      let newTileType = randomElement(tileTypeList);
      this.type = newTileType;
      return newTileType;
    }
    return null;
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

  public _getDisplayText(): IDisplayText {
    return deepClone(
      this.data.displayText || DEFAULT_TILE_DATA.displayText
    ) as IDisplayText;
  }
}
