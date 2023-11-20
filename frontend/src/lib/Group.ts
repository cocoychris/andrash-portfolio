import Member from "./Member";
import DataHolder, {
  IChangeSummary,
  IDidSetUpdateEvent,
  IWillGetUpdateEvent,
} from "./DataHolder";
import { IIndexable } from "./data/util";
import { IDestroyEvent } from "./Destroyable";
import AnyEvent, { IEventType } from "./events/AnyEvent";

/**
 * Will trigger before a member is added to the group.
 */
export interface IWillAddMemberEvent extends IEventType {
  type: "willAddMember";
  data: {
    memberID: number;
  };
}
/**
 * Will trigger after a member is added to the group.
 */
export interface IDidAddMemberEvent extends IEventType {
  type: "didAddMember";
  data: {
    memberID: number;
    member: Member<any, any>;
  };
}
/**
 * Will trigger before a member is removed from the group.
 */
export interface IWillRemoveMemberEvent extends IEventType {
  type: "willRemoveMember";
  data: {
    memberID: number;
    member: Member<any, any>;
  };
}
/**
 * Will trigger after a member is removed from the group.
 */
export interface IDidRemoveMemberEvent extends IEventType {
  type: "didRemoveMember";
  data: {
    memberID: number;
    member: Member<any, any>;
  };
}

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
  private _new: boolean = false;
  private _memberDict: IMemberDict<TMember>;
  private _memberConstructor: new (...args: any) => TMember;

  public get length(): number {
    return Object.keys(this._memberDict).length;
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
  public init(...args: any): this {
    super.init();
    // Create member instances for all the data.
    let members: Array<TMember> = [];
    Object.keys(this.data).forEach((idString) => {
      let memberData = this.data[Number(idString)];
      if (!memberData) {
        return;
      }
      members.push(this._newMember(memberData, Number(idString)));
    });
    // Initialize all the members.
    members.forEach((member) => member.init());
    // Set up event listeners for data holder events.
    this.on<IWillGetUpdateEvent>("willGetUpdate", () => {
      this.getMemberUpdates();
    });
    this.on<IDidSetUpdateEvent>("didSetUpdate", (event) => {
      this.setMemberUpdates(event.data.changes);
    });
    return this;
  }

  /**
   * Create a member instance and have it managed by this group.
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
   * Loop through all the member instances.
   * Shorthand for group.list().forEach(callback).
   */
  public forEach(callback: (member: TMember) => void) {
    this.checkInit();
    Object.values(this._memberDict).forEach(callback);
  }
  /**
   * Map all the member instances.
   * Shorthand for group.list().map(callback).
   */
  public map(callback: (member: TMember) => any): Array<any> {
    this.checkInit();
    return Object.values(this._memberDict).map(callback);
  }
  /**
   * Filter all the member instances.
   * Shorthand for group.list().filter(callback).
   */
  public filter(callback: (member: TMember) => boolean): Array<TMember> {
    this.checkInit();
    return Object.values(this._memberDict).filter(callback);
  }
  /**
   * Get the staged data of all the members.
   * @returns
   */
  public getStagedData(): IGroupData<TMemberData> {
    this.checkDestroyed();
    // Get staged data from all the members.
    // This is necessary because the data in the group may be cached as null values to indicate that the member data is not changed.
    let data: IGroupData<TMemberData> = {};
    Object.keys(this._memberDict).forEach((id: any) => {
      data[id] = this._memberDict[id].getStagedData();
    });
    return data;
  }
  /**
   * Get the current data of all the members.
   * @returns
   */
  public getCurrentData(): IGroupData<TMemberData> {
    this.checkDestroyed();
    // Get current data from all the members.
    // This is necessary because the data in the group may be cached as null values to indicate that the member data is not changed.
    let data: IGroupData<TMemberData> = {};
    Object.keys(this._memberDict).forEach((id: any) => {
      data[id] = this._memberDict[id].getCurrentData();
    });
    return data;
  }

  public destroy() {
    Object.values(this._memberDict).forEach((member) => member.destroy());
    this._memberDict = {};
    super.destroy();
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
      this.data[id] = member.getUpdate();
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
      this._newMember(this.data[id] as TMemberData, id);
    });
    // Update members that are in the current data.
    changes.updateProps.forEach((idString) => {
      let id: number = parseInt(idString);
      const member = this._memberDict[id];
      member.setUpdate(this.data[id] as TMemberData);
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
    this.emit<IWillAddMemberEvent>(
      new AnyEvent("willAddMember", { memberID: id })
    );
    this._new = true;
    let member = new this._memberConstructor(this, data, id);
    this._new = false;
    this._memberDict[id] = member;

    member.once<IDestroyEvent>("destroy", () => {
      this.emit<IWillRemoveMemberEvent>(
        new AnyEvent("willRemoveMember", { memberID: id, member: member })
      );
      delete this._memberDict[id];
      this.emit<IDidRemoveMemberEvent>(
        new AnyEvent("didRemoveMember", { memberID: id, member: member })
      );
    });

    this.emit<IDidAddMemberEvent>(
      new AnyEvent("didAddMember", { memberID: id, member: member })
    );
    return member;
  }

  private _generateID() {
    while (this._memberDict[this._idNum]) {
      this._idNum++;
    }
    return this._idNum;
  }
}
