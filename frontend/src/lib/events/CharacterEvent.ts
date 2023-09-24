/**
 * Represents an event that occurs on a character.
 * @class CharacterEvent
 */
export default class CharacterEvent extends Event {
  /**
   * The event that is triggered when the character position is changed.
   */
  public static readonly POSITION_CHANGE: string = "positionChange";
  /**
   * The event that is triggered when the character target is changed.
   */
  public static readonly TARGET_CHANGE: string = "targetChange";
  /**
   * The event that is triggered when current frame of the character is changed.
   */
  public static readonly FRAME_CHANGE: string = "frameChange";
  /**
   * The event that is triggered when the navigating state of the character is changed.
   */
  public static readonly NAVIGATING_STATE_CHANGE: string =
    "navigatingStateChange";

  constructor(type: string) {
    super(type);
  }
}
