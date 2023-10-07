import Group from "./Group";
import DataHolder from "./DataHolder";
import MemberEvent from "./events/MemberEvent";
import { IIndexable } from "./data/util";
import DataHolderEvent from "./events/DataHolderEvent";

/**
 * A member of a group.
 * @template TGroup The type of the group that this member belongs to. Should be a subclass of Group.
 * @template TMemberData The type of the data that this member holds. Should be an interface extending IIndexable.
 */
export default abstract class Member<
  TGroup extends Group<TGroup, TMemberData, Member<TGroup, TMemberData>>,
  TMemberData extends IIndexable
> extends DataHolder<TMemberData> {
  private _id: number;
  private _group: TGroup;
  private _isDestroyed: boolean = false;

  /**
   * Group instance that created this group member.
   */
  public get group(): TGroup {
    return this._group;
  }
  /**
   * Get the unique id of the character.
   */
  public get id(): number {
    return this._id;
  }
  /**
   * Indicate if the character is destroyed.
   */
  public get isDestroyed(): boolean {
    return this._isDestroyed;
  }
  /**
   * Do not create a new Character instance with "new Character()" statement.
   * Use Group.new() instead.
   */
  constructor(group: TGroup, data: TMemberData, id: number) {
    if (!group._new) {
      throw new Error(
        `Creating a new member instance with "new Member()" statement is not allowed. Use Group.new() instead.`
      );
    }
    super(data);
    this._group = group;
    this._id = id;
  }

  public init(...args: any): void {
    super.init();
    // this.addEventListener(
    //   DataHolderEvent.DID_SET_UPDATE,
    //   (event: DataHolderEvent) => {

    //   }
    // );
  }
  /**
   * Destroy the character.
   * @returns
   */
  public destroy() {
    if (this._isDestroyed) {
      return;
    }
    this._isDestroyed = true;
    this.dispatchEvent(new MemberEvent(MemberEvent.DESTROY));
  }
}
