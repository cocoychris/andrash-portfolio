/**
 * Represents an event that occurs on an item.
 * @class ItemEvent
 */
export default class ItemEvent extends Event {
  /**
   * The event that is triggered when the item is added to a tile.
   * @static
   * @type {string}
   */
  public static readonly ADD: string = "add";
  /**
   * The event that is triggered when the item is removed from a tile.
   * @static
   * @type {string}
   */
  public static readonly REMOVE: string = "remove";
  /**
   * The event that is triggered when current frame of the item is changed.
   */
  public static readonly FRAME_CHANGE: string = "frameChange";

  constructor(type: string) {
    super(type);
  }
}
