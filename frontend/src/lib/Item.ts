import { IItemDef, IItemFrameDef } from "../lib/IDefinition";
import ItemEvent from "./events/ItemEvent";
import Game from "./Game";

/**
 * Essential data for creating a new item object.
 */
export interface IItemData {
  type: string; // Item type. Which is the name of the item definition.
  inFront?: boolean | null; // Indicate if the item should be in front of the character. If null, use item definition.
}

const DEFAULT_FRAME_NAME = "default";

export default class Item extends EventTarget {
  private _data: IItemData;
  private _def: IItemDef;
  private _frameName: string;
  private _frameDef: IItemFrameDef;

  /**
   * Get copy of data
   */
  get data(): IItemData {
    return { ...this._data };
  }
  /**
   * Get type of the item
   */
  get type(): string {
    return this.data.type;
  }
  /**
   * Indicate if the item is collectable
   */
  get collectable(): boolean {
    return this._def.collectable;
  }
  /**
   * Get linked page name
   */
  get page(): string | null {
    return this._def.page;
  }

  get inFront(): boolean {
    return this._def.inFront;
  }
  /**
   * Get a copy of the definition of the current frame of the character.
   */
  public get frameDef(): IItemFrameDef {
    return { ...this._frameDef };
  }
  /**
   * Get the name of the current frame of the character.
   */
  public get frameName(): string {
    return this._frameName;
  }
  /**
   * Set the name of the current frame of the character.
   * This is a shorthand for goto().
   * @event CharacterEvent.FRAME_CHANGE - Will be dispatched when the frame is changed.
   */
  public set frameName(value: string) {
    this.goto(value);
  }

  /**
   * Create a new game item
   * @param data
   */
  constructor(game: Game, data: IItemData) {
    super();
    this._data = data;
    this._def = game.itemDefLoader.getDef(data.type);
    if (!this._def) {
      throw new Error(`Unknown item type: ${data.type}`);
    }
    this._frameName = DEFAULT_FRAME_NAME;
    this._frameDef = this._getFrameDef(this._frameName);
  }
  /**
   * Go to specified frame.
   * @param frameName
   * @event ItemEvent.FRAME_CHANGE - Will be dispatched when the frame is changed.
   * @returns
   */
  public goto(frameName: string) {
    if (frameName === this._frameName) {
      return;
    }
    this._frameName = frameName;
    this._frameDef = this._getFrameDef(frameName);
    this.dispatchEvent(new ItemEvent(ItemEvent.FRAME_CHANGE));
  }

  private _getFrameDef(frameName: string): IItemFrameDef {
    let frameDef = this._def.frames[frameName];
    if (!frameDef) {
      throw new Error(`Unknown frame name: ${frameName}`);
    }
    return frameDef;
  }
}
