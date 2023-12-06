import Group from "./Group";
import { IIndexable } from "./data/util";
import DataUpdater from "./DataUpdater";

/**
 * A member of a group.
 * @template TGroup The type of the group that this member belongs to. Should be a subclass of Group.
 * @template TMemberData The type of the data that this member holds. Should be an interface extending IIndexable.
 */
export default abstract class Member<
  TGroup extends Group<TGroup, TMemberData, Member<TGroup, TMemberData>>,
  TMemberData extends IIndexable
> extends DataUpdater<TMemberData> {
  private _id: number;
  private _group: TGroup;

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
   * Do not create a new Character instance with "new Character()" statement.
   * Use Group.new() instead.
   */
  constructor(group: TGroup, data: TMemberData, id: number) {
    if (!group["_new"]) {
      throw new Error(
        `Creating a new member instance with "new Member()" statement is not allowed. Use Group.new() instead.`
      );
    }
    super(data);
    this._group = group;
    this._id = id;
  }

  public init(...args: any): this {
    super.init();
    return this;
  }
}
