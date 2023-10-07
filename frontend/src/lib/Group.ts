import Member from "./Member";
import DataHolder, { IChangeSummary } from "./DataHolder";
import MemberEvent from "./events/MemberEvent";
import DataHolderEvent from "./events/DataHolderEvent";
import { IIndexable } from "./data/util";
import GroupEvent from "./events/GroupEvent";

export interface IGroupData<TMemberData extends IIndexable> {
  [id: number]: TMemberData | null;
}

interface IMemberDict<TMember> {
  [id: number]: TMember;
}

export type TMemberConstructor<
  TGroup extends Group<TGroup, TMemberData, TMember>,
  TMemberData extends IIndexable,
  TMember extends Member<TGroup, TMemberData>
> = new (group: TGroup, data: TMemberData, id: number) => TMember;

/**
 * Represents a group of members. All members in the group should be of the same type that extends Member class.
 * @template TGroup The type of the group that this member belongs to. Should be a subclass of Group.
 * @template TMemberData The type of the data that this member holds. Should be an interface extending IIndexable.
 * @template TMember The type of the member that this group holds. Should be a subclass of Member.
 */
export default abstract class Group<
  TGroup extends Group<TGroup, TMemberData, TMember>,
  TMemberData extends IIndexable,
  TMember extends Member<TGroup, TMemberData>
> extends DataHolder<IGroupData<TMemberData>> {
  private _idNum: number = 0;
  private __new: boolean = false;
  private _memberDict: IMemberDict<TMember>;
  private _memberConstructor: new (...args: any) => TMember;
  /**
   * Do not use this property.
   */
  public get _new(): boolean {
    return this.__new;
  }

  constructor(
    data: IGroupData<TMemberData>,
    memberConstructor: TMemberConstructor<TGroup, TMemberData, TMember>
  ) {
    super(data);
    this._memberConstructor = memberConstructor;
    this._memberDict = {};
  }
  /**
   * Initialize the group.
   * Will create member instances for all the data in the group.
   * Also set up event listeners for data holder events.
   * Please call this method after creating a new group instance and before using it.
   */
  public init(...args: any): void {
    super.init();
    // Create member instances for all the data.
    let members: Array<TMember> = [];
    Object.values(this._data).forEach((memberData, id) => {
      members.push(this._newMember(memberData, id));
    });
    // Initialize all the members.
    members.forEach((member) => member.init());
    // Set up event listeners for data holder events.
    this.addEventListener(
      DataHolderEvent.WILL_GET_UPDATE,
      (event: DataHolderEvent) => {
        this.getMemberUpdates();
      }
    );
    this.addEventListener(
      DataHolderEvent.DID_SET_UPDATE,
      (event: DataHolderEvent) => {
        this.setMemberUpdates(event.changes as IChangeSummary);
      }
    );
  }

  /**
   * Create a member instance and have it managed by this manager.
   * @param data Essential data for creating a new member object.
   * @returns Created member instance.
   */
  public new(data: TMemberData): TMember {
    this.checkInit();
    return this._newMember(data, this._generateID());
  }
  /**
   * Get the member instance by id.
   * @param id
   * @returns
   */
  public get(id: number): TMember | null {
    this.checkInit();
    return this._memberDict[id] || null;
  }
  /**
   * Get all the member instances.
   * @returns
   */
  public list(): Array<TMember> {
    this.checkInit();
    return Object.values(this._memberDict);
  }
  /**
   * Get updates from all the members.
   * This method is called at the beginning of the get update cycle when DataHolderEvent.WILL_GET_UPDATE is dispatched.
   * Override this method to add custom update logic.
   */
  protected getMemberUpdates() {
    let idList: Array<number> = Object.keys(this._memberDict).map((id) => {
      return parseInt(id);
    });
    idList.forEach((id) => {
      const member = this._memberDict[id];
      this._data[id] = member.getUpdate();
    });
  }

  /**
   * Set updates to all the members.
   * This method is called at the end of the set update cycle when DataHolderEvent.DID_SET_UPDATE is dispatched.
   * Override this method to add custom update logic.
   */
  protected setMemberUpdates(changes: IChangeSummary) {
    // Add members that are not in the current data.
    changes.addProps.forEach((idString) => {
      let id: number = parseInt(idString);
      this._newMember(this._data[id] as TMemberData, id);
    });
    // Update members that are in the current data.
    changes.updateProps.forEach((idString) => {
      let id: number = parseInt(idString);
      const member = this._memberDict[id];
      member.setUpdate(this._data[id] as TMemberData);
    });
    // Remove members that are not in the update.
    changes.removeProps.forEach((idString) => {
      let id: number = parseInt(idString);
      const member = this._memberDict[id];
      if (member) {
        member.destroy();
        delete this._memberDict[id];
      }
    });
  }

  private _newMember(data: TMemberData, id: number): TMember {
    if (this._memberDict[id]) {
      throw new Error(`Member id ${id} already exists.`);
    }
    this.dispatchEvent(new GroupEvent(GroupEvent.WILL_ADD_MEMBER, id));
    this.__new = true;
    let member = new this._memberConstructor(this, data, id);
    this.__new = false;
    this._memberDict[id] = member;
    let onDestroy = () => {
      member.removeEventListener(MemberEvent.DESTROY, onDestroy);
      this.dispatchEvent(new GroupEvent(GroupEvent.WILL_REMOVE_MEMBER, id));
      delete this._memberDict[id];
      this.dispatchEvent(new GroupEvent(GroupEvent.DID_REMOVE_MEMBER, id));
    };
    member.addEventListener(MemberEvent.DESTROY, onDestroy);
    this.dispatchEvent(new GroupEvent(GroupEvent.DID_ADD_MEMBER, id));
    return member;
  }

  private _generateID() {
    while (this._memberDict[this._idNum]) {
      this._idNum++;
    }
    return this._idNum;
  }
}
