/**
 * Represents an event that occurs on a member object.
 * @class MemberEvent
 */
export default class MemberEvent extends Event {
  /**
   * The event that is triggered when the character is destroyed.
   */
  public static readonly DESTROY: string = "destroy";

  constructor(type: string) {
    super(type);
  }
}
