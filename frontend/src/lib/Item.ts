import { IItemDef, IItemFrameDef } from "../lib/IDefinition";
import Game from "./Game";
import ItemGroup from "./ItemGroup";
import Position, { IPosition } from "./Position";
import { applyDefault } from "./data/util";
import Member from "./Member";
import DataHolderEvent from "./events/DataHolderEvent";
import MemberEvent from "./events/MemberEvent";

/**
 * Essential data for creating a new item object.
 */
export interface IItemData {
  type: string; // Item type. Which is the name of the item definition.
  position: IPosition;
  inFront?: boolean | null; // Indicate if the item should be in front of the character. If null, use item definition.
  frameName?: string; // The name of the frame. If null, use default frame name.
  page?: string | null; // The page to link to. If null, use item definition.
}

export default class Item extends Member<ItemGroup, IItemData> {
  public static readonly DEFAULT_FRAME_NAME = "default";

  private _game: Game;
  private _itemDef: IItemDef;
  private _frameDef: IItemFrameDef;

  /**
   * Get type of the item
   */
  public get type(): string {
    return this._data.type;
  }
  public set type(type: string) {
    if (!this._game.itemDefLoader.getDef(type)) {
      throw new Error(`Item type ${type} not found`);
    }
    this._data.type = type;
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
    return this._data.page == null ? this._itemDef.page : this._data.page;
  }
  /**
   * Set linked page name
   */
  public set page(page: string | null) {
    this._data.page = page;
  }
  /**
   * Indicate if the item should be in front of the character.
   */
  public get inFront(): boolean {
    return this._data.inFront == null
      ? this._itemDef.inFront
      : this._data.inFront;
  }
  public set inFront(inFront: boolean) {
    this._data.inFront = inFront;
  }

  /**
   * Get position of the item.
   */
  public get position(): Position {
    return new Position(this._data.position);
  }
  public set position(position: Position) {
    if (
      position.row < 0 ||
      position.row >= this._game.map.rowCount ||
      position.col < 0 ||
      position.col >= this._game.map.colCount
    ) {
      throw new Error(
        `Position out of range: ${position.col} - ${position.row}`
      );
    }
    this._data.position = position.toObject();
  }
  /**
   * Shortcut for position.col
   */
  public get col(): number {
    return this._data.position.col;
  }
  /**
   * Shortcut for position.row
   */
  public get row(): number {
    return this._data.position.row;
  }

  /**
   * Get a copy of the definition of the current frame of the item.
   */
  public get frameDef(): IItemFrameDef {
    return { ...this._frameDef };
  }
  /**
   * Get the name of the current frame of the item.
   */
  public get frameName(): string {
    return this._data.frameName as string;
  }

  /**
   * Set the name of the current frame of the item.
   */
  public set frameName(frameName: string) {
    this._getFrameDef(frameName); // Check if frame name exists
    this._data.frameName = frameName;
  }

  /**
   * Create a new game item
   * @param data
   */
  constructor(group: ItemGroup, data: IItemData, id: number) {
    data = applyDefault(data, {
      frameName: Item.DEFAULT_FRAME_NAME,
    }) as IItemData;
    super(group, data, id);
    this._game = group.game;

    this._itemDef = this._getItemDef(this._data.type as string);
    this._frameDef = this._getFrameDef(this._data.frameName as string);
  }
  /**
   * Initialize the item
   */
  public init(): void {
    super.init();
    //Set up event listeners
    let onDidSetUpdate = () => {
      this._itemDef = this._getItemDef(this.type as string);
      this._frameDef = this._getFrameDef(this.frameName as string);
    };
    let onDestroy = (event: MemberEvent) => {
      this.removeEventListener(DataHolderEvent.DID_SET_UPDATE, onDidSetUpdate);
      this.removeEventListener(MemberEvent.DESTROY, onDestroy);
    };
    this.addEventListener(DataHolderEvent.DID_SET_UPDATE, onDidSetUpdate);
    this.addEventListener(MemberEvent.DESTROY, onDestroy);
  }

  private _getItemDef(type: string): IItemDef {
    let itemDef = this._game.itemDefLoader.getDef(type);
    if (!itemDef) {
      throw new Error(`Unknown item type: ${type}`);
    }
    return itemDef;
  }

  private _getFrameDef(frameName: string): IItemFrameDef {
    let frameDef = this._itemDef.frames[frameName];
    if (!frameDef) {
      throw new Error(`Unknown frame name: ${frameName}`);
    }
    return frameDef;
  }
}
