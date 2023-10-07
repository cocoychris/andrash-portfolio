export interface ITargetData {
  target: {
    col: number;
    row: number;
  } | null;
}

/**
 * Represents events between client and server.
 * @class IOEvent
 */
export default class IOEvent extends Event {
  /**
   * Will be triggered when player sets a target.
   * @static
   * @type {string}
   */
  public static readonly TARGET: string = "target";
}
