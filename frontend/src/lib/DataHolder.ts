import Destroyable, { IDestroyEvent } from "./Destroyable";
import { IIndexable } from "./data/util";
import AnyEvent, { IEventType } from "./events/AnyEvent";

/**
 * Summary of the changes of the data.
 */
export interface IChangeSummary {
  /**
   * The properties that are added.
   */
  addProps: Array<string>;
  /**
   * The properties that are updated.
   */
  updateProps: Array<string>;
  /**
   * The properties that are removed.
   */
  removeProps: Array<string>;
  /**
   * The properties that are unchanged.
   */
  unchangeProps: Array<string>;
  /**
   * Indicate if any property is changed.
   */
  isChanged: boolean;
}

/**
 * Will be triggered before the data is updated by calling DataHolder.getUpdate().
 */
export interface IWillGetUpdateEvent extends IEventType {
  type: "willGetUpdate";
}
/**
 * Will be triggered after the data is updated by calling DataHolder.getUpdate().
 * @property changes: The changes that have been collected or sattled when the event is triggered.
 */
export interface IDidGetUpdateEvent extends IEventType {
  type: "didGetUpdate";
  data: {
    changes: IChangeSummary;
  };
}
/**
 * Will be triggered before the data is updated by calling DataHolder.setUpdate().
 */
export interface IWillSetUpdateEvent extends IEventType {
  type: "willSetUpdate";
}
/**
 * Will be triggered after the data is updated by calling DataHolder.setUpdate().
 */
export interface IDidSetUpdateEvent extends IEventType {
  type: "didSetUpdate";
  data: {
    changes: IChangeSummary;
  };
}
/**
 * Will be triggered before the data is applied by calling DataHolder.apply().
 */
export interface IWillApplyEvent extends IEventType {
  type: "willApply";
}
/**
 * Will be triggered after the data is applied by calling DataHolder.apply().
 */
export interface IDidApplyEvent extends IEventType {
  type: "didApply";
  data: {
    changes: IChangeSummary;
  };
}
/**
 * Will be triggered before the data is dropped by calling DataHolder.drop().
 */
export interface IWillDropEvent extends IEventType {
  type: "willDrop";
}
/**
 * Will be triggered after the data is dropped by calling DataHolder.drop().
 */
export interface IDidDropEvent extends IEventType {
  type: "didDrop";
  data: {
    changes: IChangeSummary;
  };
}
/**
 * The event that is triggered when one or more properties of the data is changed by calling DataHolder.setStagedData() or by setting a property of the staged data.
 */
export interface IDataChangeEvent extends IEventType {
  type: "dataChange";
}

/**
 * An object that holds data. All changes to the data are staged and can be applied or discarded.
 *
 * Set data by writing the properties of `dataHolder.data`, the changes will be staged, which means the current data will not be changed immediately.
 * Get data by reading the properties of `dataHolder.data`, the current data will be returned.
 * All changes are tracked and can be checked by calling isChanged(), this will show the difference between the current data and the staged data.
 *
 * The current data stays unchanged until `dataHolder.apply()` is called to apply the staged changes.
 * Staged changes can be discarded by calling drop().
 * Staged changes can be collected by calling getUpdate().
 * Current data can be updated with provided data by calling setUpdate().
 * These functions will trigger events that can be listened to.
 *
 * This class is abstract which means it is designed to be extended by subclasses and should not be instantiated directly.
 * @author Andrash Yang
 * cocoychris@gmail.com
 * Nov, 2023
 */
export default abstract class DataHolder<
  T extends IIndexable
> extends Destroyable {
  /**
   * The delay in milliseconds before the data change event is dispatched.
   * All the data change events dispatched within the delay will be merged into one event.
   * This is useful when the data change event is dispatched frequently.
   * Set this to 0 to disable the delay.
   * @default 0
   */
  public dataChangeEventDelay: number = 0;

  private _currentData: T;
  private _stagedData: T;
  private _changedDict: { [key in keyof T]?: boolean };
  private _changeSummary: IChangeSummary | null;
  private _init: boolean = false;
  private _handler: ProxyHandler<T>;
  private _dataChangeEventTimeout: NodeJS.Timeout | null = null;
  /**
   * A handle for getting current data and setting staged data.
   *
   * When setting a value to a property, the value will be set to the staged data. If the value is different from the current data, the staged data will be marked as changed.
   */
  protected readonly data: T;
  /**
   * Indicates if the group is initialized.
   */
  public get initialized(): boolean {
    return this._init;
  }
  /**
   * Create a new DataHolder instance.
   * @param data The initial data.
   */
  constructor(data: T) {
    super();
    this._currentData = { ...data };
    this._stagedData = { ...data };
    this._changedDict = {};
    this._changeSummary = null;
    // let objType: string = "Player"; // DEBUG
    this._handler = {
      set: (target: T, property: keyof T, value: any) => {
        // this.constructor.name === objType && console.log("set", property, value); // DEBUG
        let currentValue = this._currentData[property];
        this._stagedData[property] = value;
        // Reflect.set(this._stagedData, property, value, this._stagedData);
        let isChanged = currentValue !== value;
        this._changedDict[property] = isChanged;
        this._changeSummary = null;
        isChanged && this._dispatchDataChangeEvent();
        return true;
      },
      get: (target: T, property: keyof T) => {
        // this.constructor.name === objType && console.log("get", property); // DEBUG
        return this._currentData[property];
      },
      deleteProperty: (target: T, property: keyof T) => {
        // this.constructor.name === objType && console.log("deleteProperty", property); // DEBUG
        let currentValue = this._currentData[property];
        delete this._stagedData[property];
        let isChanged = currentValue !== undefined;
        this._changedDict[property] = isChanged;
        this._changeSummary = null;
        isChanged && this._dispatchDataChangeEvent();
        return true;
      },
      ownKeys: (target) => {
        // this.constructor.name === objType && console.log("ownKeys"); // DEBUG
        return Object.keys(this._currentData);
      },
      has: (target: T, property: keyof T) => {
        // this.constructor.name === objType && console.log("has", property); // DEBUG
        return property in this._currentData;
      },
      getOwnPropertyDescriptor: (target: T, property: keyof T) => {
        // this.constructor.name === objType && console.log("getOwnPropertyDescriptor", property); // DEBUG
        return Object.getOwnPropertyDescriptor(this._currentData, property);
      },
      defineProperty: (target: T, property: keyof T, descriptor: any) => {
        // this.constructor.name === objType && console.log("defineProperty", property); // DEBUG
        Object.defineProperty(this._currentData, property, descriptor);
        return true;
      },
    };
    this.data = new Proxy<T>({} as T, this._handler);

    // Handle destroy event
    this.on<IDestroyEvent>("destroy", () => {
      this._handler.get = (t, p) => {
        console.warn(
          `Reading property (${String(p)}) of a destroyed DataHolder`
        );
      };
      let destroyed = (t: T, p: string | symbol) => {
        throw new Error(
          `Writing or deleting property (${String(
            p
          )}) of a destroyed DataHolder`
        );
      };
      this._handler.set = destroyed;
      this._handler.deleteProperty = destroyed;
      this._stagedData = null as any;
      this._currentData = null as any;
      if (this._dataChangeEventTimeout) {
        clearTimeout(this._dataChangeEventTimeout);
      }
    });
  }
  /**
   * Initialize the DataHolder.
   * This function does nothing but set the initialized flag to true.
   * This function is just a placeholder and should be overridden by subclasses.
   * To check if the group is initialized, use the initialized property or call checkInit().
   * You can also call init() directly in the constructor of a subclass if the subclass does not need to utilize the init() function.
   * @example
   * //Example of overriding init() in a subclass.
   * public init(): void {
   *     super.init(); //Call super.init() to set the initialized flag to true.
   *    //Do something
   * }
   * public sayHello(): void {
   *    this.checkInit(); //Check if the group is initialized.
   *    console.log("Hello!");
   * }
   * @example
   * //Example of calling init() in the constructor of a subclass.
   * constructor(data: Data, id: number) {
   *    super(data, id);
   *    this.init(); //Call init() in the constructor to set the initialized flag to true.
   * }
   */
  public init(...args: any): this {
    this.checkDestroyed();
    if (this._init) {
      console.warn("Group is already initialized.");
      return this;
    }
    this._init = true;
    return this;
  }
  /**
   * Get the staged value of a property.
   * @param property
   * @returns
   */
  public getStagedValue(property: keyof T): T[keyof T] {
    this.checkDestroyed();
    return this._stagedData[property];
  }
  /**
   * Get a copy of the staged data.
   * @returns
   */
  public getStagedData(): T {
    this.checkDestroyed();
    return { ...this._stagedData };
  }
  /**
   * Set the staged data
   * @param data
   * @event DataHolderEvent.DATA_CHANGE The data change event will be dispatched after the data is set.
   */
  public setStagedData(data: Partial<T>) {
    this.checkDestroyed();
    this._stagedData = { ...this._stagedData, ...data };
    this._clearChangeCache();
    this._dispatchDataChangeEvent();
  }
  /**
   * Get a copy of the current data.
   */
  public getCurrentData(): T {
    this.checkDestroyed();
    return { ...this._currentData };
  }

  /**
   * Apply all the staged changes to the current data.
   */
  public apply() {
    this.checkDestroyed();
    if (!this.isChanged()) {
      return;
    }
    this.emit<IWillApplyEvent>(new AnyEvent("willApply", null));
    // Update changes in case they have changed since the event was dispatched
    let changes = this.getChanges();
    // Apply
    this._currentData = { ...this._stagedData };
    this._clearChangeCache();
    this.emit<IDidApplyEvent>(new AnyEvent("didApply", { changes }));
  }

  /**
   * Discard all the staged changes.
   * This will make staged data the identical to the current data.
   */
  public drop() {
    this.checkDestroyed();
    if (!this.isChanged()) {
      return;
    }
    this.emit<IWillDropEvent>(new AnyEvent("willDrop", null));
    // Update changes in case they have changed since the event was dispatched
    let changes = this.getChanges();
    // Drop
    this._stagedData = { ...this._currentData };
    this._clearChangeCache();
    this.emit<IDidDropEvent>(new AnyEvent("didDrop", { changes }));
  }

  /**
   * Collect all the staged changes and return them.
   * This function will return null if there is no change.
   * @event DataHolderEvent.WILL_GET_UPDATE
   * @event DataHolderEvent.DID_GET_UPDATE
   * @returns
   */
  public getUpdate(): T | null {
    this.checkDestroyed();
    this.emit<IWillGetUpdateEvent>(new AnyEvent("willGetUpdate", null));
    let data = null;
    if (this.isChanged()) {
      data = { ...this._stagedData };
    }
    this.emit<IDidGetUpdateEvent>(
      new AnyEvent("didGetUpdate", { changes: this.getChanges() })
    );
    return data;
  }

  /**
   * Update the current data with provided data.
   * If a property is not in the provided data, it will be removed from the current data.
   * Will not update if the provided data is null.
   * This function only updates the current data, and does not change the staged data.
   * @param data The data to update the current data with.
   * @event DataHolderEvent.WILL_SET_UPDATE
   * @event DataHolderEvent.DID_SET_UPDATE
   */
  public setUpdate(data: T | null): void {
    this.checkDestroyed();
    this.emit<IWillSetUpdateEvent>(new AnyEvent("willSetUpdate", null));
    // Update changes in case they have changed since the event was dispatched
    let changes = this.getChanges(data);
    if (data) {
      // Remove properties that are not in the new data
      changes.removeProps.forEach((property: keyof T) => {
        delete this._currentData[property];
      });
      // Add properties that are in the new data
      changes.addProps.forEach((property: keyof T) => {
        this._currentData[property] = data[property];
      });
      // Update properties that are in the new data
      changes.updateProps.forEach((property: keyof T) => {
        this._currentData[property] = data[property];
      });
      this._clearChangeCache();
    }
    this.emit<IDidSetUpdateEvent>(new AnyEvent("didSetUpdate", { changes }));
  }

  /**
   * Indicate if the staged data is different from the current data.
   * @param property The property to check. If not specified, check if any property is changed.
   * @returns
   */
  protected isChanged(property?: keyof T): boolean {
    //Check if a specific property is changed
    if (property !== undefined) {
      let isChanged = this._changedDict[property];
      if (isChanged === undefined) {
        isChanged = this._currentData[property] !== this._stagedData[property];
        this._changedDict[property] = isChanged;
      }
      return isChanged;
    }
    //Check if any property is changed by checking the change summary
    if (this._changeSummary !== null) {
      return this._changeSummary.isChanged;
    }
    //Check if any property is changed by checking each property
    let properties = Object.keys(
      Object.assign({}, this._currentData, this._stagedData)
    );
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      if (this.isChanged(property)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Get the changes between the current data and provided data.
   * @param data Provide data to compare with the current data. If not provided, compare with the staged data.
   * @returns Summary of the changes. Includes addProps, updateProps, removeProps, and unchangeProps.
   */
  protected getChanges(data?: T | null): IChangeSummary {
    if (data === null) {
      return {
        addProps: [],
        updateProps: [],
        removeProps: [],
        unchangeProps: [],
        isChanged: false,
      };
    }
    if (data === undefined) {
      if (this._changeSummary !== null) {
        return this._changeSummary;
      }
      data = this._stagedData;
    }
    let addProps: Array<string> = [];
    let updateProps: Array<string> = [];
    let removeProps: Array<string> = [];
    let unchangeProps: Array<string> = [];
    let isChanged = false;
    let properties = Object.keys(Object.assign({}, this._currentData, data));
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      if (this._currentData[property] === undefined) {
        addProps.push(property);
        isChanged = true;
      } else if (data[property] === undefined) {
        removeProps.push(property);
        isChanged = true;
      } else if (this._currentData[property] !== data[property]) {
        updateProps.push(property);
        isChanged = true;
      }
    }
    let changeSummary = {
      addProps,
      updateProps,
      removeProps,
      unchangeProps,
      isChanged,
    };
    //Is stagedData -> Cache the change summary
    if (data == this._stagedData) {
      this._changeSummary = changeSummary;
      this._changedDict = {};
      addProps.forEach((key: keyof T) => {
        this._changedDict[key] = true;
      });
      updateProps.forEach((key: keyof T) => {
        this._changedDict[key] = true;
      });
      removeProps.forEach((key: keyof T) => {
        this._changedDict[key] = true;
      });
      unchangeProps.forEach((key: keyof T) => {
        this._changedDict[key] = false;
      });
    }
    return changeSummary;
  }

  /**
   * Check if DataHolder is initialized.
   * Will throw an error if the DataHolder is not initialized.
   */
  protected checkInit() {
    if (!this._init) {
      throw new Error("DataHolder is not initialized");
    }
  }
  /**
   * Check if DataHolder is destroyed.
   */
  protected checkDestroyed() {
    if (this.isDestroyed) {
      throw new Error("Cannot access property of a destroyed DataHolder");
    }
  }

  private _clearChangeCache() {
    this._changedDict = {};
    this._changeSummary = null;
  }

  private _dispatchDataChangeEvent() {
    // No delay
    if (this.dataChangeEventDelay <= 0) {
      this.emit<IDataChangeEvent>(new AnyEvent("dataChange", null));
      return;
    }
    // With delay
    if (this._dataChangeEventTimeout !== null) {
      clearTimeout(this._dataChangeEventTimeout);
    }
    this._dataChangeEventTimeout = setTimeout(() => {
      this._dataChangeEventTimeout = null;
      this.emit<IDataChangeEvent>(new AnyEvent("dataChange", null));
    }, this.dataChangeEventDelay);
  }
}
