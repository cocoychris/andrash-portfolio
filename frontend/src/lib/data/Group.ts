import Member from "./Member";
import {
  DataObject,
  IDidRemoveChildEvent,
  IDidSetChildEvent,
  IWIllSetChildEvent,
  IWillRemoveChildEvent,
} from "./DataHolder";
import { IDidDestroyEvent, IWillDestroyEvent } from "../Destroyable";
import AnyEvent, { IEventType } from "../events/AnyEvent";
import DataUpdater from "./DataUpdater";

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

export interface IGroupData<TMemberData extends DataObject> extends DataObject {
  [id: number]: TMemberData | null;
}

/**
 * Represents a group of members. All members in the group should be of the same type that extends Member class.
 * @template TGroup The type of the group that this member belongs to. Should be a subclass of Group.
 * @template TMemberData The type of the data that this member holds. Should be an interface extending DataObject.
 * @template TMember The type of the member that this group holds. Should be a subclass of Member.
 */
export default abstract class Group<
  TGroup extends Group<TGroup, TMemberData, TMember>,
  TMemberData extends DataObject,
  TMember extends Member<TGroup, TMemberData>
> extends DataUpdater<IGroupData<TMemberData>> {
  private _isGroupInitialized: boolean = false;
  private _idNum: number = 0;
  private _allowNewMember: boolean = false;
  private _memberConstructor: new (
    group: TGroup,
    id: number,
    data: TMemberData
  ) => TMember;

  public get length(): number {
    return Object.keys(this.children).length;
  }
  constructor(
    memberConstructor: new (
      group: TGroup,
      id: number,
      data: TMemberData
    ) => TMember,
    data: IGroupData<TMemberData>
  ) {
    super(data);
    this._memberConstructor = memberConstructor;
    // Set up event listeners
    this.on<IWIllSetChildEvent>("willSetChild", (event) => {
      this.emit<IWillAddMemberEvent>(
        new AnyEvent("willAddMember", {
          memberID: Number(event.data.property),
        })
      );
    });
    this.on<IDidSetChildEvent>("didSetChild", (event) => {
      this.emit<IDidAddMemberEvent>(
        new AnyEvent("didAddMember", {
          memberID: Number(event.data.property),
          member: event.data.child as TMember,
        })
      );
    });
    this.on<IWillRemoveChildEvent>("willRemoveChild", (event) => {
      this.emit<IWillRemoveMemberEvent>(
        new AnyEvent("willRemoveMember", {
          memberID: Number(event.data.property),
          member: event.data.child as TMember,
        })
      );
    });
    this.on<IDidRemoveChildEvent>("didRemoveChild", (event) => {
      event.data.child.destroy();
      this.emit<IDidRemoveMemberEvent>(
        new AnyEvent("didRemoveMember", {
          memberID: Number(event.data.property),
          member: event.data.child as TMember,
        })
      );
    });

    // Using "didRemoveChild" event instead of "didDestroy" event deliberately as the children are already removed and cannot be accessed by the time "didDestroy" event is triggered.
    this.on<IDidRemoveChildEvent>("didRemoveChild", (event) => {
      event.data.child.destroy();
    });
  }
  /**
   * Initialize the group.
   * This will create all the member instances according to the data.
   */
  protected initGroup() {
    if (this._isGroupInitialized) {
      throw new Error("Group has already been initialized.");
    }
    this._isGroupInitialized = true;
    this.setChildCreator((property: string, data: DataObject) => {
      let idNum: number = Number(property);
      if (isNaN(idNum)) {
        throw new Error(`Member id ${property} is not a number.`);
      }
      this._allowNewMember = true;
      let member = new this._memberConstructor(
        this as any,
        idNum,
        data as TMemberData
      );
      this._allowNewMember = false;
      return member;
    });
  }

  /**
   * Create a member instance and have it managed by this group.
   * @param data Essential data for creating a new member object.
   * @returns Created member instance.
   */
  public new(data: TMemberData): void {
    this.data[this._generateID()] = data;
  }
  /**
   * Get the member instance by id.
   * @param id
   * @returns
   */
  public get(id: number): TMember | null {
    return (this.children[id] as TMember) || null;
  }
  /**
   * Get all the member instances.
   * @returns
   */
  public list(): Array<TMember> {
    return Object.values(this.children as { [id: number]: TMember });
  }
  /**
   * Loop through all the member instances.
   * Shorthand for group.list().forEach(callback).
   */
  public forEach(callback: (member: TMember) => void) {
    Object.values(this.children as { [id: number]: TMember }).forEach(callback);
  }
  /**
   * Map all the member instances.
   * Shorthand for group.list().map(callback).
   */
  public map(callback: (member: TMember) => any): Array<any> {
    return Object.values(this.children as { [id: number]: TMember }).map(
      callback
    );
  }
  /**
   * Filter all the member instances.
   * Shorthand for group.list().filter(callback).
   */
  public filter(callback: (member: TMember) => boolean): Array<TMember> {
    return Object.values(this.children as { [id: number]: TMember }).filter(
      callback
    );
  }

  private _generateID() {
    // while (this.children[this._idNum]) {
    while (this.data[this._idNum] || this.stagedData[this._idNum]) {
      this._idNum++;
    }
    return this._idNum;
  }
}
