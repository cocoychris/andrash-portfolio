import EventDispatcher from "./EventDispatcher";
import DataHolderEvent from "./events/DataHolderEvent";
import { IIndexable } from "./data/util";

export interface IChangeSummary {
  addProps: Array<string>;
  updateProps: Array<string>;
  removeProps: Array<string>;
  unchangeProps: Array<string>;
  isChanged: boolean;
}

/**
 * An object that can stage changes to its data until the changes are applied or dropped.
 * This class is abstract and should not be instantiated directly.
 * All changes are tracked and can be checked by calling isChanged().
 * Staged changes can be applied and become current data by calling apply().
 * Staged changes can be discarded by calling drop().
 * Staged changes can be collected by calling getUpdate().
 * Current data can be updated by calling setUpdate().
 * These functions will trigger events that can be listened to.
 * @event DataHolderEvent.WILL_APPLY
 * @event DataHolderEvent.DID_APPLY
 * @event DataHolderEvent.WILL_DROP
 * @event DataHolderEvent.DID_DROP
 * @event DataHolderEvent.WILL_GET_UPDATE
 * @event DataHolderEvent.DID_GET_UPDATE
 * @event DataHolderEvent.WILL_SET_UPDATE
 * @event DataHolderEvent.DID_SET_UPDATE
 * @class DataHolder
 */
export default abstract class DataHolder<
  T extends IIndexable
> extends EventDispatcher {
  private _currentData: T;
  private _stagedData: T;
  private _changedDict: IIndexable;
  private _changeSummary: IChangeSummary | null;
  private _init: boolean = false;
  /**
   * A handle for getting current data and setting staged data.
   * When setting a value to a property, the value will be set to the staged data. If the value is different from the current data, the staged data will be marked as changed.
   */
  protected readonly _data: T;
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
    this._data = new Proxy(this._stagedData, {
      set: (target, property: keyof T, value) => {
        let currentValue = this._currentData[property];
        this._stagedData[property] = value;
        this._changedDict[property] = currentValue !== value;
        this._changeSummary = null;
        return true;
      },
      get: (target, property) => {
        return this._currentData[property];
      },
      deleteProperty: (target, property) => {
        let currentValue = this._currentData[property];
        delete this._stagedData[property];
        this._changedDict[property] = currentValue !== undefined;
        this._changeSummary = null;
        return true;
      },
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
  public init(...args: any): void {
    if (this._init) {
      console.warn("Group is already initialized.");
      return;
    }
    this._init = true;
  }
  /**
   * Get the staged value of a property.
   * @param property
   * @returns
   */
  public getStagedValue(property: keyof T): T[keyof T] {
    return this._stagedData[property];
  }
  /**
   * Get a copy of the staged data.
   * @returns
   */
  public getStagedData(): T {
    return { ...this._stagedData };
  }
  /**
   * Get a copy of the current data.
   */
  public getCurrentData(): T {
    return { ...this._currentData };
  }

  /**
   * Apply all the staged changes to the current data.
   */
  protected apply() {
    if (!this.isChanged()) {
      return;
    }
    this.dispatchEvent(new DataHolderEvent(DataHolderEvent.WILL_APPLY));
    // Update changes in case they have changed since the event was dispatched
    let changes = this.getChanges();
    // Apply
    this._currentData = { ...this._stagedData };
    this._clearChangeCache();
    this.dispatchEvent(new DataHolderEvent(DataHolderEvent.DID_APPLY, changes));
  }

  /**
   * Discard all the staged changes.
   * This will make staged data the identical to the current data.
   */
  protected drop() {
    if (!this.isChanged()) {
      return;
    }
    this.dispatchEvent(new DataHolderEvent(DataHolderEvent.WILL_DROP));
    // Update changes in case they have changed since the event was dispatched
    let changes = this.getChanges();
    // Drop
    this._stagedData = { ...this._currentData };
    this._clearChangeCache();
    this.dispatchEvent(new DataHolderEvent(DataHolderEvent.DID_DROP, changes));
  }

  /**
   * Collect all the staged changes and return them.
   * This function will return null if there is no change.
   * @event DataHolderEvent.WILL_GET_UPDATE
   * @event DataHolderEvent.DID_GET_UPDATE
   * @returns
   */
  public getUpdate(): T | null {
    this.dispatchEvent(new DataHolderEvent(DataHolderEvent.WILL_GET_UPDATE));
    let data = null;
    if (this.isChanged()) {
      data = this.getStagedData();
    }
    this.dispatchEvent(
      new DataHolderEvent(DataHolderEvent.DID_GET_UPDATE, this.getChanges())
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
    this.dispatchEvent(new DataHolderEvent(DataHolderEvent.WILL_SET_UPDATE));
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
    this.dispatchEvent(
      new DataHolderEvent(DataHolderEvent.DID_SET_UPDATE, changes)
    );
  }
  /**
   * Indicate if the staged data is different from the current data.
   * @param property The property to check. If not specified, check if any property is changed.
   * @returns
   */
  protected isChanged(property?: string | symbol): boolean {
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
      addProps.forEach((key) => {
        this._changedDict[key] = true;
      });
      updateProps.forEach((key) => {
        this._changedDict[key] = true;
      });
      removeProps.forEach((key) => {
        this._changedDict[key] = true;
      });
      unchangeProps.forEach((key) => {
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
  private _getChangedData(): IIndexable | null {
    let { isChanged, addProps, updateProps, unchangeProps } = this.getChanges();
    if (!isChanged) {
      return null;
    }
    let data: IIndexable = {};
    [...addProps, ...updateProps, ...unchangeProps].forEach((key) => {
      data[key] = this._stagedData[key];
    });
    return data;
  }

  private _clearChangeCache() {
    this._changedDict = {};
    this._changeSummary = null;
  }
}
