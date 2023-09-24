import Item from "../Item";
/**
 * Represents an event that occurs on a tile.
 * @class TileEvent
 */
export default class TileEvent extends Event {
  /**
   * The event that is triggered when an item is added to the tile.
   * @static
   * @type {string}
   */
  public static readonly ITEM_ADD: string = "itemAdd";
  /**
   * The event that is triggered when an item is removed from the tile.
   * @static
   * @type {string}
   */
  public static readonly ITEM_REMOVE: string = "itemRemove";
  /**
   * The event that is triggered when an item on the tile is changed.
   * @static
   * @type {string}
   */
  public static readonly ITEM_CHANGE: string = "itemChange";

  private _item: Item | null;

  public get item(): Item | null {
    return this._item || null;
  }

  constructor(type: string, item: Item | null) {
    super(type);
    this._item = item;
  }
}
