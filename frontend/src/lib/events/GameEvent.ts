/**
 * Represents an event that occurs on a character.
 * @class GameEvent
 */
export default class GameEvent extends Event {
  /**
   * The event that is triggered before characters are updated.
   */
  public static readonly WILL_UPDATE: string = "willUpdate";
  /**
   * The event that is triggered after characters are updated.
   */
  public static readonly DID_UPDATE: string = "didUpdate";

  constructor(type: string) {
    super(type);
  }
}
