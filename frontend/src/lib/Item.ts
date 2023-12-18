import { IItemDef, ISpriteFrameDef } from "./data/DefPack";
import Game from "./Game";
import ItemGroup from "./ItemGroup";
import Position, { IPosition } from "./Position";
import { applyDefault } from "./data/util";
import Member from "./data/Member";
import {
  IDidApplyEvent,
  IDidSetUpdateEvent,
  DataObject,
} from "./data/DataHolder";
import { IWillDestroyEvent } from "./Destroyable";
import AnyEvent, { IEventType } from "./events/AnyEvent";
import Tile from "./Tile";
import Character from "./Character";
import FieldDef from "./data/FieldDef";

export interface IRepositionEvent extends IEventType {
  type: "reposition";
  data: {
    prevTile: Tile | null;
    currentTile: Tile | null;
  };
}

/**
 * Essential data for creating a new item object.
 */
export interface IItemData extends DataObject {
  type: string; // Item type. Which is the name of the item definition.
  position: IPosition & DataObject;
  inFront?: boolean | null; // Indicate if the item should be in front of the character. If null, use item definition.
  frameName?: string; // The name of the frame. If null, use default frame name.
  page?: string | null; // The page to link to. If null, use item definition.
  facingDir?: 1 | -1;
}

function getFieldDef(game: Game, data: IItemData) {
  return new FieldDef<IItemData>(
    {
      type: "object",
      acceptNull: false,
      children: {
        type: {
          type: "string",
          valueList: game.assetPack.itemDefPack.typeNames,
        },
        position: {
          type: "object",
          children: {
            col: {
              type: "number",
              minNum: 0,
              maxNum: game.tileManager.colCount,
            },
            row: {
              type: "number",
              minNum: 0,
              maxNum: game.tileManager.rowCount,
            },
          },
        },
        inFront: {
          type: "boolean",
          acceptUndefined: true,
          acceptNull: true,
        },
        frameName: {
          type: "string",
          acceptUndefined: true,
          editable: false,
        },
        page: {
          type: "string",
          acceptUndefined: true,
          acceptNull: true,
        },
        facingDir: {
          type: "number",
          valueList: [1, -1],
          acceptUndefined: true,
        },
      },
    },
    data,
    "itemData"
  );
}

const DEFAULT_ITEM_DATA: Partial<IItemData> = {
  inFront: null,
  frameName: "default",
  page: null,
  facingDir: 1,
};

export default class Item
  extends Member<ItemGroup, IItemData>
  implements IPosition
{
  public static readonly DEFAULT_FRAME_NAME = DEFAULT_ITEM_DATA.frameName;

  private _game: Game;
  private _itemDef: IItemDef;
  private _frameDef: ISpriteFrameDef;
  private _currentTile: Tile | null = null;

  /**
   * Get type of the item
   */
  public get type(): string {
    return this.data.type;
  }
  public set type(type: string) {
    if (!this.group.itemDefPack.get(type)) {
      throw new Error(`Item type ${type} not found`);
    }
    this.data.type = type;
  }
  /**
   * Indicate if the item is collectable
   */
  public get collectable(): boolean {
    return this._itemDef.collectable;
  }
  /**
   * Get linked page name
   */
  public get page(): string | null {
    return this.data.page == null ? this._itemDef.page : this.data.page;
  }
  /**
   * Set linked page name
   */
  public set page(page: string | null) {
    this.data.page = page;
  }
  /**
   * Indicate if the item should be in front of the character.
   */
  public get inFront(): boolean {
    return this.data.inFront == null
      ? this._itemDef.inFront
      : this.data.inFront;
  }
  public set inFront(inFront: boolean) {
    this.data.inFront = inFront;
  }

  /**
   * Get position of the item.
   */
  public get position(): Position {
    return new Position(this.data.position);
  }
  public set position(position: IPosition) {
    if (!this._game.tileManager.isInRange(position)) {
      throw new Error(
        `Position out of range: ${position.col} - ${position.row}`
      );
    }
    this.data.position = { col: position.col, row: position.row };
  }

  /**
   * Get the tile that the item is currently on.
   */
  public get currentTile(): Tile {
    return this._currentTile as Tile;
  }
  /**
   * Shortcut for position.col
   */
  public get col(): number {
    return this.data.position.col;
  }
  /**
   * Shortcut for position.row
   */
  public get row(): number {
    return this.data.position.row;
  }

  /**
   * Get a copy of the definition of the current frame of the item.
   */
  public get frameDef(): ISpriteFrameDef {
    return { ...this._frameDef };
  }
  /**
   * Get the name of the current frame of the item.
   */
  public get frameName(): string {
    return this.data.frameName as string;
  }

  /**
   * Set the name of the current frame of the item.
   */
  public set frameName(frameName: string) {
    this._getFrameDef(frameName); // Check if frame name exists
    this.data.frameName = frameName;
  }

  /**
   * Indicate the facing direction of the character.
   * 1: Right
   * -1: Left
   */
  public get facingDir(): 1 | -1 {
    return this.data.facingDir || 1;
  }

  /**
   * Create a new game item
   * @param data
   */
  constructor(group: ItemGroup, id: number, data: IItemData) {
    data = applyDefault(data, DEFAULT_ITEM_DATA) as IItemData;
    super(group, id, data);
    this._game = group.game;
    this._itemDef = this._getItemDef(this.data.type as string);
    this._frameDef = this._getFrameDef(this.data.frameName as string);

    //Set up event listeners
    let onDidSetUpdate = () => {
      this._itemDef = this._getItemDef(this.type as string);
      this._frameDef = this._getFrameDef(this.frameName as string);
      this._updateTile();
    };
    this.on<IDidSetUpdateEvent>("didSetUpdate", onDidSetUpdate);
    this.on<IDidApplyEvent>("didApply", onDidSetUpdate);
    this.once<IWillDestroyEvent>("willDestroy", () => {
      this.off<IDidSetUpdateEvent>("didSetUpdate", onDidSetUpdate);
      this.off<IDidApplyEvent>("didApply", onDidSetUpdate);
      this._currentTile && this._currentTile["internal"].removeItem(this);
    });
    // Register to tile
    this._updateTile();
  }

  /**
   * Get items that this item is colliding with.
   * @param target A specific item to check collision with. If null, check collision with all items on the same tile.
   * @returns Returns null if no collision.
   */
  public hitItem(target: Item | null = null): Array<Item> | null {
    // No target
    if (!target) {
      let list = this.currentTile.items.filter((item) => item != this);
      return list.length > 0 ? list : null;
    }
    // Target on the same tile
    if (this.currentTile.hasItem(target)) {
      return [target];
    }
    return null;
  }
  /**
   * Get items that this item is adjacent to.
   * @param target A specific item to check adjacency with. If null, check adjacency with all items on adjacent tiles.
   * @returns
   */
  public adjacentItem(target: Item | null = null): Array<Item> | null {
    if (!target) {
      let list: Array<Item> = [];
      this.currentTile.adjacentTiles.forEach((tile) => {
        list = list.concat(tile.items);
      });
      list = list.filter((item) => item != this);
      return list.length > 0 ? list : null;
    }
    for (let tile of this.currentTile.adjacentTiles) {
      if (tile.hasItem(target)) {
        return [target];
      }
    }
    return null;
  }

  /**
   * Get characters that this item is colliding with.
   * @param target A specific character to check collision with. If null, check collision with all characters on the same tile.
   * @returns Returns null if no collision.
   */
  public hitCharacter(
    target: Character | null = null
  ): Array<Character> | null {
    // No target
    if (!target) {
      let list = this.currentTile.characters;
      return list.length > 0 ? list : null;
    }
    // Target on the same tile
    if (this.currentTile.hasCharacter(target)) {
      return [target];
    }
    return null;
  }
  /**
   * Get characters that this item is adjacent to.
   * @param target A specific character to check adjacency with. If null, check adjacency with all characters on adjacent tiles.
   * @returns Returns null if no adjacency.
   */
  public adjacentCharacter(
    target: Character | null = null
  ): Array<Character> | null {
    if (!target) {
      let list: Array<Character> = [];
      this.currentTile.adjacentTiles.forEach((tile) => {
        list = list.concat(tile.characters);
      });
      return list.length > 0 ? list : null;
    }
    for (let tile of this.currentTile.adjacentTiles) {
      if (tile.hasCharacter(target)) {
        return [target];
      }
    }
    return null;
  }

  public setData(data: Partial<IItemData>): void {
    super.setData(data);
  }

  private _updateTile() {
    let tile = this._game.tileManager.getTile(this.position);
    if (!tile) {
      throw new Error(
        `Tile not found at ${this.position.col} - ${this.position.row}`
      );
    }
    // Current tile
    if (tile == this._currentTile) {
      return null;
    }
    if (this._currentTile) {
      this._currentTile["internal"].removeItem(this);
    }
    let prevTile = this._currentTile;
    this._currentTile = tile;
    this._currentTile["internal"].addItem(this);

    this.emit<IRepositionEvent>(
      new AnyEvent("reposition", {
        prevTile,
        currentTile: this._currentTile,
      })
    );
  }

  public getFieldDef(): FieldDef<IItemData> {
    return getFieldDef(this._game, this.data);
  }

  private _getItemDef(type: string): IItemDef {
    let itemDef = this.group.itemDefPack.get(type);
    if (!itemDef) {
      throw new Error(`Unknown item type: ${type}`);
    }
    return itemDef;
  }

  private _getFrameDef(frameName: string): ISpriteFrameDef {
    let frameDef = this._itemDef.frames[frameName];
    if (!frameDef) {
      throw new Error(`Unknown frame name: ${frameName}`);
    }
    return frameDef;
  }
}
