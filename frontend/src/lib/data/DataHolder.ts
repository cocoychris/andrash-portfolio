import Destroyable, {
  IDidDestroyEvent,
  IWillDestroyEvent,
} from "../Destroyable";
import AnyEvent, { IEventType } from "../events/AnyEvent";

/**
 * JsonValue is a value that can be serialized to JSON without any manual conversion.
 * It can be a string, number, boolean, null, undefined, array or plain object.
 * It can also be a DataObject as it is a plain object that contains only JsonValue as its properties.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | DataObject;

/**
 * DataObject is a plain object that contains only JsonValue as its properties.
 * It is the basic data type that can be held by DataHolder.
 */
export type DataObject = {
  [key: string]: JsonValue;
};

/**
 * Summary of the changes to the data.
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
 * Will be triggered before a child DataHolder is set to handle a property of the current data.
 * Note that this will only happen when the staged data is applied.
 * Which means this only happens at construction or when apply() is called.
 */
export interface IWIllSetChildEvent extends IEventType {
  type: "willSetChild";
  data: {
    property: string;
    child: DataHolder<any>;
  };
}
/**
 * Will be triggered after a child DataHolder is set to handle a property of the current data.
 * Note that this will only happen when the staged data is applied.
 * Which means this only happens at construction or when apply() is called.
 */
export interface IDidSetChildEvent extends IEventType {
  type: "didSetChild";
  data: {
    property: string;
    child: DataHolder<any>;
  };
}
/**
 * Will be triggered before a child DataHolder is removed from handling a property of the current data.
 * Note that this will only happen when the staged data is applied.
 * Which means this only happens when apply() is called.
 */
export interface IWillRemoveChildEvent extends IEventType {
  type: "willRemoveChild";
  data: {
    property: string;
    child: DataHolder<any>;
  };
}
/**
 * Will be triggered after a child DataHolder is removed from handling a property of the current data.
 * Note that this will only happen when the staged data is applied.
 * Which means this only happens when apply() is called.
 */
export interface IDidRemoveChildEvent extends IEventType {
  type: "didRemoveChild";
  data: {
    property: string;
    child: DataHolder<any>;
  };
}

export type ChildCreator = (
  property: string,
  data: DataObject
) => DataHolder<any> | null;

export type ChildDict<T> = { [key in keyof T]: DataHolder<any> | undefined };
/**
 * DataHolder holds a plain object as its data and provides functions for managing the data.
 * Any changes to its data will be staged and can be applied or dropped.
 * There are also functions for tracking the changes and synchronizing the data with other DataHolder.
 *
 * ### Basic Usage
 * - Set data by writing the properties of `dataHolder.data`, the changes will be staged,
 *   which means the current data will not be changed immediately.
 * - Get data by reading the properties of `dataHolder.data`, the current data will be returned (not the staged data).
 * - To get the staged data, read the properties of `dataHolder.stagedData`.
 * - All changes are tracked and can be checked by calling isChanged().
 *   The current data stays unchanged until `dataHolder.apply()` is called to apply the staged changes.
 * - Staged changes can be discarded by calling drop().
 * - Staged changes can be collected as an update package by calling getUpdate().
 * - The update package can be applied to another DataHolder by calling setUpdate().
 * - These operations will trigger events that can be listened to.
 *
 * ### Child DataHolder
 * - A child DataHolder can be assigned by writing `dataHolder.children.myProperty = new ChildDataHolder()`.
 *   The child DataHolder will be set to handle the property `myProperty` of the current data.
 * - The child DataHolder can be removed by deleting `dataHolder.children.myProperty`.
 * - Note that the operations above will be staged and will not take effect until `dataHolder.apply()` is called.
 *   To have it take effect immediately without staging, call `dataHolder.setChild()` or `dataHolder.removeChild()` instead.
 * - The child DataHolder can be accessed by reading `dataHolder.children.myProperty`.
 * - Calling `dataHolder.apply()` from the parent DataHolder will also trigger `dataHolder.apply()` of the child DataHolder.
 * - Calling `dataHolder.drop()` from the parent DataHolder will also trigger `dataHolder.drop()` of the child DataHolder.
 * - Calling `dataHolder.getUpdate()` from the parent DataHolder will also trigger `dataHolder.getUpdate()` of the child DataHolder and collect updates from it.
 * - Calling `dataHolder.setUpdate()` from the parent DataHolder will also trigger `dataHolder.setUpdate()` of the child DataHolder and apply the update to it.
 * - Calling `dataHolder.getData()` from the parent DataHolder will also copy the data from the child DataHolder.
 *
 * Note: This class is abstract which means it is designed to be extended by subclasses and should not be instantiated directly.
 * @author Andrash Yang
 * cocoychris@gmail.com
 * Nov, 2023
 */
export default abstract class DataHolder<
  T extends DataObject
> extends Destroyable {
  /**
   * The delay in milliseconds before the data change event is dispatched.
   * All the data change events dispatched within the delay will be merged into one event.
   * This is useful when the data change event is dispatched frequently.
   * Set this to 0 to disable the delay.
   * @default 0
   */
  public dataChangeEventDelay: number = 0;

  /**
   * The reference to the current data must not be changed as it is linked by the parent object.
   * Otherwise, the parent object will not be able to get the updated data.
   */
  private _currentData: { [key: string]: any };
  /**
   * The reference to the staged data can be changed as it is not linked by the parent object.
   */
  private _stagedData: { [key: string]: any };

  private _changedDict: { [key: string]: boolean } = {};
  private _childDict: { [key: string]: DataHolder<any> } = {};
  private _childOnDestroyHandlerDict: { [key: string]: () => void } = {};
  private _changeSummary: IChangeSummary | null = null;
  private _dataChangeEventTimeout: NodeJS.Timeout | null = null;
  private _childCreator?: ChildCreator;
  /**
   * A proxy object for accessing the data.
   *
   * Reading a property will return the current data.
   * Writing a property will change the staged data.
   * Which means the change will be staged and will not reflect immediately.
   *
   * To have the change reflected, call `apply()` to apply the staged data to the current data.
   */
  protected readonly data: T;
  /**
   * A proxy object for reading the staged data.
   *
   * Note that the staged data is read-only. Setting a value to a property will throw an error. Use `DataHolder.data` instead.
   */
  protected readonly stagedData: T;
  /**
   * A proxy object for accessing the child DataHolder.
   *
   * Reading a property will return the child DataHolder in the current data.
   * Writing a property will set the child DataHolder to the staged data. The child DataHolder will be applied when `apply()` is called.
   * Deleting a property will remove the child DataHolder from the staged data. The child DataHolder will be removed when `apply()` is called.
   * You can also enumerate the properties of this object to get all the child DataHolders in the current data.
   */
  protected readonly children: ChildDict<T>;
  /**
   * Create a new DataHolder instance.
   * @param data the data to be held by this DataHolder. A shallow copy of the data will be created and used internally.
   * If there is no parent object, you may want to perform a deep clone of the data object before passing it to the constructor.
   */
  constructor(data: T) {
    super();
    this._currentData = { ...data };
    this._stagedData = { ...data };
    this._onChildDataChange = this._onChildDataChange.bind(this);

    // Create a proxy for data
    const dataHandler = {
      set: (target: T, property: string | symbol, value: any) => {
        if (typeof property === "symbol") {
          throw new Error(
            `Cannot set property ${String(property)} as it is a symbol.`
          );
        }
        // Ensure the value is valid object type
        // Valid object types: null, plain object, array and DataHolder
        if (
          typeof value === "object" && // Is object
          value && // Exclude null
          value.constructor !== Object && // Exclude plain object
          !Array.isArray(value) && // Exclude array
          !(value instanceof DataHolder) // Exclude DataHolder
        ) {
          throw new Error(
            `Invalid object type ${value.constructor.name} for property ${property}. Only plain object, array and DataHolder are allowed`
          );
        }
        let child = this._getChild(property);
        // Valid value when there is a child DataHolder:
        // * Plane object = Send the data to the child DataHolder without setting the property.
        // * Null = do nothing. Should always be this value when there is a child DataHolder.
        // * Undefined = remove the child.
        // * DataHolder = replace the child with the new DataHolder.
        if (child) {
          // Same child
          if (value === child) {
            return true;
          }
          // Plain object
          if (value && value.constructor === Object) {
            child.setData(value);
            return true;
          }
          // Null
          if (value === null) {
            return true;
          }
          // Leave undefined and DataHolder to be set to the property
          // Throw error for other types
          if (value !== undefined && value.constructor !== DataHolder) {
            throw new Error(
              `Invalid object type ${value.constructor.name} for property ${property}. Only plain object, array and DataHolder are allowed`
            );
          }
        }
        // Set value - The value can also be a DataHolder. However, it will not be used util apply() is called.
        let oldStagedValue = this._stagedData[property];
        this._stagedData[property] = value;
        let isChanged = this._currentData[property] !== value;
        this._changedDict[property] = isChanged;
        if (isChanged) {
          this._changeSummary = null;
        }
        if (oldStagedValue !== value) {
          this._dispatchDataChangeEvent();
        }
        return true;
      },
      get: (target: T, property: string | symbol) => {
        if (typeof property === "symbol") {
          return undefined;
        }
        // // Redirect to child
        let child = this._getChild(property);
        if (child) {
          return child.data;
        }
        // Get value
        return this._currentData[property];
      },
      deleteProperty: (target: T, property: string | symbol) => {
        if (typeof property === "symbol") {
          return true;
        }
        // The deleted value can also be a DataHolder. However, it will not be removed util apply() is called.
        let currentValue = this._currentData[property];
        delete this._stagedData[property];
        let isChanged = currentValue !== undefined;
        this._changedDict[property] = isChanged;
        this._changeSummary = null;
        isChanged && this._dispatchDataChangeEvent();
        return true;
      },
      ownKeys: (target: T) => {
        return Object.keys(this._currentData);
      },
      has: (target: T, property: string | symbol) => {
        return property in this._currentData;
      },
      getOwnPropertyDescriptor: (target: T, property: string | symbol) => {
        return Object.getOwnPropertyDescriptor(this._currentData, property);
      },
      defineProperty: (
        target: T,
        property: string | symbol,
        descriptor: any
      ) => {
        throw new Error("DataHolder does not support defineProperty() method.");
      },
    };
    this.data = new Proxy<T>({} as T, dataHandler);

    // Create a proxy for staged data
    const stagedDataHandler = {
      set: dataHandler.set,
      get: (target: T, property: string | symbol) => {
        if (typeof property === "symbol") {
          return undefined;
        }
        // Redirect to child
        let child = this._getChild(property);
        if (child) {
          return child.stagedData;
        }
        // Get value
        return this._stagedData[property];
      },
      deleteProperty: dataHandler.deleteProperty,
      ownKeys: (target: T) => {
        return Object.keys(this._stagedData);
      },
      has: (target: T, property: string | symbol) => {
        return property in this._stagedData;
      },
      getOwnPropertyDescriptor: (target: T, property: string | symbol) => {
        return Object.getOwnPropertyDescriptor(this._stagedData, property);
      },
      defineProperty: dataHandler.defineProperty,
    };
    this.stagedData = new Proxy<T>({} as T, stagedDataHandler);

    const childrenHandler = {
      set: (target: any, property: string | symbol, value?: any) => {
        if (typeof property === "symbol") {
          throw new Error(
            `Cannot set property ${String(property)} as it is a symbol.`
          );
        }
        // Redirect undefined and DataHolder to stagedData
        if (value === undefined || value instanceof DataHolder) {
          dataHandler.set(this.data, property, value);
          return true;
        }
        throw new Error(
          `Invalid value for property ${property}. Expected DataHolder, but got ${value?.constructor.name}.`
        );
      },
      get: (target: any, property: string | symbol) => {
        if (typeof property === "symbol") {
          return undefined;
        }
        // Not useing getChild() here because it need to also be able to return "constructor" or other built-in properties.
        return this._childDict[property];
      },
      deleteProperty: (target: any, property: string | symbol) => {
        if (typeof property === "symbol") {
          return true;
        }
        if (this._getChild(property)) {
          dataHandler.deleteProperty(this.data, property);
          return true;
        }
        return true;
      },
      ownKeys: (target: any) => {
        return Object.keys(this._childDict);
      },
      has: (target: any, property: string | symbol) => {
        return property in this._childDict;
      },
      getOwnPropertyDescriptor: (target: any, property: string | symbol) => {
        if (typeof property === "symbol") {
          return undefined;
        }
        if (this._childDict[property]) {
          return {
            configurable: true,
            enumerable: true,
            writable: true,
          };
        }
        return undefined;
      },
    };
    this.children = new Proxy<ChildDict<T>>(
      {} as ChildDict<T>,
      childrenHandler
    );

    // Handle destroy event
    this.on<IDidDestroyEvent>("didDestroy", () => {
      // Remove all children
      Object.keys(this._childDict).forEach((key: string) => {
        this._removeChild(key);
      });
      // Block all access to the data
      let onAccessProps = (target: any, property: string | symbol) => {
        throw new Error(
          `Cannot access ${this.constructor.name}.${String(
            property
          )} property as the DataHolder is destroyed.`
        );
      };
      let onEnumerateProps = (target: any) => {
        throw new Error(
          `Cannot enumerate properties of ${this.constructor.name} as the DataHolder is destroyed.`
        );
      };
      dataHandler.get = onAccessProps;
      dataHandler.set = onAccessProps;
      dataHandler.deleteProperty = onAccessProps;
      dataHandler.ownKeys = onEnumerateProps;
      dataHandler.has = onAccessProps;
      dataHandler.getOwnPropertyDescriptor = onAccessProps;
      stagedDataHandler.get = onAccessProps;
      stagedDataHandler.set = onAccessProps;
      stagedDataHandler.deleteProperty = onAccessProps;
      stagedDataHandler.ownKeys = onEnumerateProps;
      stagedDataHandler.has = onAccessProps;
      stagedDataHandler.getOwnPropertyDescriptor = onAccessProps;
      childrenHandler.get = onAccessProps;
      childrenHandler.set = onAccessProps;
      childrenHandler.deleteProperty = onAccessProps;
      childrenHandler.ownKeys = onEnumerateProps;
      childrenHandler.has = onAccessProps;
      childrenHandler.getOwnPropertyDescriptor = onAccessProps;
      this._stagedData = null as any;
      this._currentData = null as any;
      this._childDict = null as any;
      if (this._dataChangeEventTimeout) {
        clearTimeout(this._dataChangeEventTimeout);
      }
    });
  }

  /**
   * Set multiple properties to the data at once.
   * Any property equal to undefined will be ignored.
   *
   * Note that all the changes will be staged and will not be applied until apply() is called.
   *
   * @param data
   * @event DataHolderEvent.DATA_CHANGE The data change event will be dispatched after the data is set.
   */
  protected setData(data: Partial<T>): void {
    this.checkDestroyed();
    Object.keys(data).forEach((key: string) => {
      let value: any = data[key];
      if (value === undefined) {
        return;
      }
      if (typeof value === "object") {
        if (value instanceof DataHolder) {
          throw new Error(
            `Invalid object type for property ${key}. Cannot set child DataHolder with setData(). Assign it with DataHolder.children.${key} instead.`
          );
        }
        if (value && !Array.isArray(value) && value.constructor !== Object) {
          throw new Error(
            `Invalid object type for property ${key}. Only plain object or array is allowed when setting data with setData().`
          );
        }
      }
      //Useing the proxy version of stagedData - The value will be redirected to child automatically.
      this.stagedData[key as keyof T] = value;
    });
    this._dispatchDataChangeEvent(0);
  }

  /**
   * Get a copy of the data.
   * @return a copy of the current data.
   */
  public getData(): T {
    this.checkDestroyed();
    // Using the proxy version of currentData - The value will be fetched from child automatically.
    return deepClone(this.data);
  }

  /**
   * Apply all the staged changes in this data holder. The opposite of drop().
   *
   * The staged data will be written to the current data making the current data identical to the staged data.
   */
  public apply(): this {
    this.checkDestroyed();
    this.emit<IWillApplyEvent>(new AnyEvent("willApply", null));
    // Update changes in case they have changed since the event was dispatched
    let changes = this.getChanges();
    if (changes.isChanged) {
      // Adding new properties
      changes.addProps.forEach((key: string) => {
        const stagedValue = this._stagedData[key];
        //Adding new child
        if (stagedValue instanceof DataHolder) {
          this._setChild(key, stagedValue);
          return;
        }
        // Creating new child
        if (
          this._childCreator &&
          stagedValue &&
          stagedValue.constructor === Object
        ) {
          let child = this._childCreator(key, stagedValue);
          if (child) {
            this._setChild(key, child);
            return;
          }
        }
        // Adding new property
        this._currentData[key] = stagedValue;
      });

      // Updating properties
      changes.updateProps.forEach((key: string) => {
        const stagedValue = this._stagedData[key];
        const child = this._getChild(key);
        // Updating child
        if (stagedValue instanceof DataHolder) {
          this._setChild(key, stagedValue); // Setting new child
          stagedValue.apply(); // Tell the child to apply
          return;
        }
        // Updating child property
        if (child) {
          // the stagedValue should always be null when a child DataHolder is set. If not, it means something is wrong!
          if (stagedValue !== null) {
            throw new Error(
              `Unexpected change to the property ${key}. Cannot change a property to a different type when the property is handled by a child DataHolder.`
            );
          }
          // No need to update child as the staged value is already redirected to the child by the proxy.
          child.apply(); // Just tell the child to apply.
          return;
        }
        // Updating property
        this._currentData[key] = stagedValue;
      });

      // Removing properties
      changes.removeProps.forEach((key: string) => {
        // Removing child
        const child = this._getChild(key);
        if (child) {
          this.removeChild(key);
          return;
        }
        // Removing property
        delete this._currentData[key];
      });
    }
    this._clearChangeCache();
    this.emit<IDidApplyEvent>(new AnyEvent("didApply", { changes }));
    return this;
  }

  /**
   * Discard all the staged changes in this data holder. The opposite of apply().
   *
   * The current data will be written to the staged data making the staged data identical to the current data.
   */
  public drop(): this {
    this.checkDestroyed();
    this.emit<IWillDropEvent>(new AnyEvent("willDrop", null));
    // Update changes in case they have changed since the event was dispatched
    let changes = this.getChanges();
    if (changes.isChanged) {
      this._stagedData = {};
      Object.keys(this._currentData).forEach((key: string) => {
        const child = this._getChild(key);
        // Dropping child staged data
        if (child) {
          this._stagedData[key] = null;
          child.drop();
          return;
        }
        // Dropping staged property
        this._stagedData[key] = this._currentData[key];
      });
    }
    this._clearChangeCache();
    this.emit<IDidDropEvent>(new AnyEvent("didDrop", { changes }));
    return this;
  }
  /**
   * Get update from the data holder in a special format.
   *
   * Will return a copy of the staged data.
   * Returns null if there is no change.
   *
   * Note that the properties that are fetched from child DataHolder could be null when there is no change to the child.
   * By omitting the unchanged properties, the update data will be smaller and easier for transmission.
   * This special format can be handled by the DataHolder.setUpdate() function for applying the update to the data holder.
   * @event DataHolderEvent.WILL_GET_UPDATE Will be triggered before the data is retrieved.
   * @event DataHolderEvent.DID_GET_UPDATE Will be triggered after the data is retrieved.
   */
  public getUpdate(): DataObject | null {
    this.checkDestroyed();
    this.emit<IWillGetUpdateEvent>(new AnyEvent("willGetUpdate", null));
    let data: DataObject = {};
    let changes = this.getChanges();
    if (changes.isChanged) {
      Object.keys(this._stagedData).forEach((key: string) => {
        const child = this._getChild(key);
        // Getting update from child
        if (child) {
          data[key] = child.getUpdate();
          return;
        }
        // Ignore undefined
        if (this._stagedData[key] === undefined) {
          return;
        }
        // Getting update from property
        data[key] = deepClone(this._stagedData[key]);
      });
    } else {
      data = null as any;
    }
    this.emit<IDidGetUpdateEvent>(new AnyEvent("didGetUpdate", { changes }));
    return data;
  }

  /**
   * Set update to the data holder from a special format created by DataHolder.getUpdate().
   *
   * Will update the current data with the provided data. It will also distribute the update to child DataHolders.
   * Will not update if the provided data is null.
   *
   * The staged data will be left unchanged.
   * @param data The data to update the current data with.
   * @event DataHolderEvent.WILL_SET_UPDATE Will be triggered before the data is updated.
   * @event DataHolderEvent.DID_SET_UPDATE Will be triggered after the data is updated.
   */
  public setUpdate(data: DataObject | null): void {
    this.checkDestroyed();
    this.emit<IWillSetUpdateEvent>(new AnyEvent("willSetUpdate", null));
    // Update changes in case they have changed since the event was dispatched
    let changes = this.getChanges(data);
    if (changes.isChanged) {
      changes.addProps.forEach((key: string) => {
        const value = data![key];
        if (value instanceof DataHolder) {
          throw new Error(
            `Invalid object type for property ${key}. Cannot set child DataHolder with setUpdate().`
          );
        }
        // Adding child
        if (this._childCreator && value && value.constructor === Object) {
          let child = this._childCreator(key, value as DataObject);
          if (child) {
            this._setChild(key, child);
            return;
          }
        }
        // Adding property
        this._currentData[key] = value;
      });
      changes.updateProps.forEach((key: string) => {
        const value = data![key];
        const child = this._getChild(key);
        if (value instanceof DataHolder) {
          throw new Error(
            `Invalid object type for property ${key}. Cannot set child DataHolder with setUpdate().`
          );
        }
        // Setting child
        if (child) {
          if (value === null || (value && value.constructor === Object)) {
            child.setUpdate(value as DataObject);
            return;
          }
          console.warn(
            `Ignoring unexpected value '${value}' for property '${key}' which is handled by a child DataHolder. null or plain object is expected, but got ${value?.constructor.name}.`
          );
          return;
        }
        // Updating property
        this._currentData[key] = value;
      });
      changes.removeProps.forEach((key: string) => {
        const child = this._getChild(key);
        // Removing child
        if (child) {
          this.removeChild(key);
          return;
        }
        // Removing property
        delete this._currentData[key];
      });
    }
    this._clearChangeCache();
    this.emit<IDidSetUpdateEvent>(new AnyEvent("didSetUpdate", { changes }));
  }
  /**
   * Set a child creator function to create child DataHolder automatically when a property is set to a plain object.
   * childCreator will be called immediately if there is any plain object in the current data.
   * @param childCreator The function that returns a child DataHolder for handling a property with plain object value.
   * @example
   * ```typescript
   *  dataHolder.setChildCreator((property: string, data: DataObject) => {
   *    if (property === "myProperty") {
   *      return new ChildDataHolder(data);
   *    }
   *    return null;
   *  });
   * ```
   */
  protected setChildCreator(childCreator: ChildCreator) {
    this.checkDestroyed();
    this._childCreator = childCreator;
    // Create child DataHolder
    Object.keys(this._currentData).forEach((key: string) => {
      let value = this._currentData[key];
      if (value && value.constructor === Object) {
        let child = this._childCreator!(key, value as DataObject);
        if (child) {
          this._setChild(key, child);
        }
      }
    });
  }
  /**
   * Get the child DataHolder that is currently handling the specified property.
   * If you just added a child DataHolder, you will not get it from this function unless you call apply() first.
   * @param property The specified property that is handled by the child DataHolder.
   * @returns Returns null if the property is not handled by any child DataHolder.
   */
  protected getChild<Child extends DataHolder<any>>(
    property: string
  ): Child | null {
    this.checkDestroyed();
    return this._getChild(property);
  }

  /**
   * Assign a child DataHolder to handle the specified property.
   * This will affect the current data immediately without being staged.
   * This operation will not be considered as a change and cannot be retrieved by getUpdate().
   *
   * Suggestions:
   * 1. Maybe not to use this function. Instead, set the child DataHolder using children property and go through the DataHolder.apply() process. See the example below.
   * @example
   * ```typescript
   * dataHolder.children.property = new ChildDataHolder(childData);
   * dataHolder.apply();
   * ```
   * 2. Use this function before start syncing the data with another DataHolder.
   * 3. Or make sure the child DataHolder's data is identical to the current data before calling this function. So it can substitute the current data seamlessly.
   * @param property The property to be handled by the child DataHolder.
   * @param child The child DataHolder to handle the property.
   * @param checkIdentical If true, will check if the child DataHolder is holding identical data. If not, an error will be thrown.
   * @returns
   */
  protected setChild<Child extends DataHolder<any>>(
    property: string,
    child: Child,
    checkIdentical: boolean = true
  ) {
    this.checkDestroyed();
    if (checkIdentical) {
      let value = this._currentData[property];
      let changes = child.getChanges(value);
      if (changes.isChanged) {
        throw new Error(
          `Cannot set child DataHolder to property ${property} as the child DataHolder is not holding identical data`
        );
      }
    }
    this._setChild(property, child);
  }

  /**
   * Remove the child DataHolder that is currently handling the specified property.
   * This will affect the current data immediately without being staged.
   * This operation will not be considered as a change and cannot be retrieved by getUpdate().
   *
   * Suggestions:
   * 1. Maybe not to use this function. Instead, remove the child DataHolder using children property and go through the DataHolder.apply() process. See the example below.
   * @example
   * ```typescript
   * // Remove the child DataHolder by setting the property to undefined
   * dataHolder.children.property = undefined;
   * // Or by deleting the property
   * delete dataHolder.children.property;
   * // Then apply the change
   * dataHolder.apply();
   * ```
   * 2. Use this function before start syncing the data with another DataHolder.
   * 3. Or after stop syncing the data with another DataHolder.
   * 4. Or just enable the replaceWithData option to replace the child DataHolder with the data it is holding.
   * @param property
   * @returns
   */
  protected removeChild<Child extends DataHolder<any>>(
    property: string,
    replaceWithData: boolean = false
  ): Child | null {
    this.checkDestroyed();
    return this._removeChild(property, replaceWithData);
  }

  /**
   * Indicate if the staged data is different from the current data.
   * @param property The property to check. If not specified, check if any property is changed.
   * @returns
   */
  protected isChanged(property?: string): boolean {
    this.checkDestroyed();
    //Check if a specific property is changed
    if (property !== undefined) {
      let child = this._getChild(property);
      let isChanged = this._changedDict[property];
      if (!child && isChanged !== undefined) {
        return isChanged;
      }
      let currentValue = this._currentData[property];
      let stagedValue = this._stagedData[property];
      if (child) {
        isChanged =
          stagedValue === undefined || // Remove child
          stagedValue?.constructor === Object || // Update child
          stagedValue instanceof DataHolder || // Replace child
          child.isChanged(); // Child is changed
      } else {
        isChanged = !deepEqual(currentValue, stagedValue);
      }
      this._changedDict[property] = isChanged;
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
  protected getChanges(
    data: DataObject | null = this._stagedData
  ): IChangeSummary {
    this.checkDestroyed();
    // No change
    if (data === null || data === this._currentData) {
      return {
        addProps: [],
        updateProps: [],
        removeProps: [],
        unchangeProps: [],
        isChanged: false,
      };
    }
    // Return cached change summary
    if (data == this._stagedData && this._changeSummary !== null) {
      return this._changeSummary;
    }
    // Calculate changes
    let addProps: Array<string> = [];
    let updateProps: Array<string> = [];
    let removeProps: Array<string> = [];
    let unchangeProps: Array<string> = [];
    let isChanged = false;
    let properties: Set<string> = new Set([
      ...Object.keys(this._currentData),
      ...Object.keys(data),
    ]);
    properties.forEach((property: string) => {
      const currentValue: any = this._currentData[property];
      const newValue: any = data[property];
      // Ignore undefined
      if (currentValue === newValue && currentValue === undefined) {
        return;
      }
      // Remove
      if (newValue === undefined) {
        removeProps.push(property);
        isChanged = true;
        return;
      }
      // Add
      if (currentValue === undefined) {
        addProps.push(property);
        isChanged = true;
        return;
      }
      // Check child update
      const child = this._getChild(property);
      if (child) {
        // Update
        if (
          newValue?.constructor === Object ||
          newValue instanceof DataHolder ||
          child.isChanged()
        ) {
          updateProps.push(property);
          isChanged = true;
          return;
        }
        // Unchanged
        unchangeProps.push(property);
        return;
      }
      // Check property update
      // if (currentValue !== newValue) {
      if (!deepEqual(currentValue, newValue)) {
        updateProps.push(property);
        isChanged = true;
        return;
      }
      // Uncanged
      unchangeProps.push(property);
      return;
    });
    let changeSummary = {
      addProps,
      updateProps,
      removeProps,
      unchangeProps,
      isChanged,
    };
    //Is stagedData. Cache the change summary
    if (data == this._stagedData) {
      this._changeSummary = changeSummary;
      this._changedDict = {};
      addProps.forEach((key: string) => {
        this._changedDict[key] = true;
      });
      updateProps.forEach((key: string) => {
        this._changedDict[key] = true;
      });
      removeProps.forEach((key: string) => {
        this._changedDict[key] = true;
      });
      unchangeProps.forEach((key: string) => {
        this._changedDict[key] = false;
      });
    }
    return changeSummary;
  }

  private _setChild<Child extends DataHolder<any>>(
    property: string,
    child: Child
  ) {
    // Deal with existing child
    let existingChild = this.getChild(property);
    if (existingChild) {
      if (existingChild === child) {
        return;
      }
      this._removeChild(property);
    }
    // Set new child
    this.emit<IWIllSetChildEvent>(
      new AnyEvent("willSetChild", { property, child })
    );
    this._childDict[property] = child;
    this._currentData[property] = child;
    this._stagedData[property] = null;
    // Handle child destroy event
    let onWillDestroy = () => {
      this._removeChild(property);
    };
    this._childOnDestroyHandlerDict[property] = onWillDestroy;
    child.once<IWillDestroyEvent>("willDestroy", onWillDestroy);
    child.on<IDataChangeEvent>("dataChange", this._onChildDataChange);
    this.emit<IDidSetChildEvent>(
      new AnyEvent("didSetChild", { property, child })
    );
  }

  private _getChild<Child extends DataHolder<any>>(
    property: string
  ): Child | null {
    let value = this._childDict[property];
    // Do this to prevent getting the "constructor" property or other properties from the prototype
    if (value instanceof DataHolder) {
      return value as Child;
    }
    return null;
  }

  private _removeChild<Child extends DataHolder<any>>(
    property: string,
    replaceWithData: boolean = false
  ): Child | null {
    let child = this._getChild(property);
    if (!child) {
      return null;
    }
    this.emit<IWillRemoveChildEvent>(
      new AnyEvent("willRemoveChild", { property, child })
    );
    // Remove child destroy handler
    child.off<IDataChangeEvent>("dataChange", this._onChildDataChange);
    child.off<IWillDestroyEvent>(
      "willDestroy",
      this._childOnDestroyHandlerDict[property]
    );
    delete this._childOnDestroyHandlerDict[property];
    // Remove child
    delete this._childDict[property];
    if (replaceWithData) {
      this._currentData[property] = child.getData();
      this._stagedData[property] = deepClone(child.stagedData);
    } else {
      delete this._currentData[property];
      delete this._stagedData[property];
    }
    this.emit<IDidRemoveChildEvent>(
      new AnyEvent("didRemoveChild", { property, child })
    );
    return child as Child;
  }

  private _onChildDataChange = () => {
    this._changeSummary = null;
    this._dispatchDataChangeEvent();
  };

  private _clearChangeCache() {
    this._changedDict = {};
    this._changeSummary = null;
  }

  private _dispatchDataChangeEvent(delay: number = this.dataChangeEventDelay) {
    // No delay
    if (delay <= 0) {
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
    }, delay);
  }
}
/**
 * A deep clone function for DataObject.
 *
 * All the properties of the object should be a JsonValue which is a value that can be serialized to JSON without any manual conversion.
 * JsonValue includes null, undefined, boolean, number, string, plain object (child DataObject), and array.
 * Passing any object that is not a plain object or array will throw an error.
 * @see DataObject for the definition of DataObject.
 * @see JsonValue for the definition of JsonValue.
 */
export function deepClone<T = DataObject>(dataObject: T): T {
  const cloneObjMap = new WeakMap();
  function clone(value: JsonValue, path: string) {
    // Is null or not an object - return directly
    if (value == null || typeof value != "object") {
      return value;
    }
    // Circular reference detected, return the clone
    if (cloneObjMap.has(value)) {
      return cloneObjMap.get(value);
    }
    // Is array
    if (Array.isArray(value)) {
      let newArray: Array<any> = [];
      cloneObjMap.set(value, newArray);
      value.forEach((value, index) => {
        newArray.push(clone(value, `${path}[${index}]`));
      });
      return newArray;
    }
    //Is a plain object
    if (value.constructor == Object) {
      let newObj: DataObject = {};
      cloneObjMap.set(value, newObj);
      Object.keys(value).forEach((key) => {
        newObj[key] = clone(value[key], `${path}.${key}`);
      });
      return newObj;
    }
    throw new Error(
      `Cannot clone object of class ${
        value.constructor?.name
      } (type: ${typeof value}) at path ${path}. Only plain object and array are allowed.`
    );
  }
  return clone(dataObject as JsonValue, "root");
}
/**
 * A deep equal function for comparing any two JsonValue.
 * Suggested by copilot. Modified by me.
 */
export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return false;
  }
  if (typeof a != "object" || typeof b != "object") {
    return false;
  }
  if (Array.isArray(a) != Array.isArray(b)) {
    return false;
  }
  if (Array.isArray(a)) {
    if (a.length != b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], (b as Array<JsonValue>)[i])) {
        return false;
      }
    }
    return true;
  }
  let aKeys = Object.keys(a);
  let bKeys = Object.keys(b);
  if (aKeys.length != bKeys.length) {
    return false;
  }
  for (let i = 0; i < aKeys.length; i++) {
    let key = aKeys[i];
    if (!deepEqual(a[key], (b as DataObject)[key])) {
      return false;
    }
  }
  return true;
}
