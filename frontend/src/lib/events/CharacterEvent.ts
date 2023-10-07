/**
 * Represents an event that occurs on a character.
 * @class CharacterEvent
 */
export default class CharacterEvent extends Event {
  /**
   * The event that is triggered when the character position is changed.
   */
  public static readonly MOVE: string = "move";

  constructor(type: string) {
    super(type);
  }
}
