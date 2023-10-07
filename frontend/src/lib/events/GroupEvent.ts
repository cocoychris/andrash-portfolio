/**
 * Represents an event that occurs on a character.
 * @class GroupEvent
 */
export default class GroupEvent extends Event {
  /**
   * Will trigger before a member is added to the group.
   */
  public static readonly WILL_ADD_MEMBER: string = "willAddMember";
  /**
   * Will trigger after a member is added to the group.
   */
  public static readonly DID_ADD_MEMBER: string = "didAddMember";
  /**
   * Will trigger before a member is removed from the group.
   */
  public static readonly WILL_REMOVE_MEMBER: string = "willRemoveMember";
  /**
   * Will trigger after a member is removed from the group.
   */
  public static readonly DID_REMOVE_MEMBER: string = "didRemoveMember";

  private _memberID: number;

  public get memberID(): number {
    return this._memberID;
  }
  constructor(type: string, memberID: number) {
    super(type);
    this._memberID = memberID;
  }
}
