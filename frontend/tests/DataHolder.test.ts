import DataHolder, {
  ChildCreator,
  ChildDict,
  DataObject,
  IChangeSummary,
  IDidApplyEvent,
  IDidDropEvent,
  IDidGetUpdateEvent,
  IDidRemoveChildEvent,
  IDidSetChildEvent,
  IDidSetUpdateEvent,
  IWIllSetChildEvent,
  IWillApplyEvent,
  IWillDropEvent,
  IWillGetUpdateEvent,
  IWillRemoveChildEvent,
  IWillSetUpdateEvent,
} from "../src/lib/data/DataHolder";
import { describe, expect, test, jest } from "@jest/globals";
import AnyEvent from "../src/lib/events/AnyEvent";
import { cloneObject } from "../src/lib/data/util";

interface IPersonData extends DataObject {
  name: string;
  age: number;
  hobbies: string[];
  inventory: IInventoryData;
  inventory1?: IInventoryData;
  inventory2?: IInventoryData;
  inventory3?: IInventoryData;
  nullValue: null;
  undefinedValue: undefined;
  extraProp?: string;
}
interface IInventoryData extends DataObject {
  gold: number;
  items: string[];
}
let personData: IPersonData = Object.freeze({
  name: "Jhon",
  age: 23,
  hobbies: ["football", "basketball", "tennis"],
  inventory: {
    gold: 100,
    items: ["sword", "shield", "bow"],
  },
  nullValue: null,
  undefinedValue: undefined,
});

class Person extends DataHolder<IPersonData> {
  public inventory: Inventory;
  /**
   * Expose the protected data reference for testing purposes
   */
  public get dataProxy(): IPersonData {
    return this.data;
  }
  public get stagedDataProxy(): IPersonData {
    return this.stagedData;
  }
  public get childrenProxy(): ChildDict<IPersonData> {
    return this.children;
  }
  constructor(data: IPersonData, childCreator?: ChildCreator) {
    super(data);

    if (childCreator) {
      this.setChildCreator(childCreator);
    } else {
      this.children.inventory = new Inventory(data.inventory);
      this.apply();
    }
    this.inventory = this.children.inventory as Inventory;
    // Try to set existing child. Should throw an error.
    let error: any;
    try {
      this.setChild("inventory", this.inventory);
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
  }
}

class Inventory extends DataHolder<IInventoryData> {
  /**
   * Expose the protected data reference for testing purposes
   */
  public get dataProxy(): IInventoryData {
    return this.data;
  }
  public get stagedDataProxy(): IInventoryData {
    return this.stagedData;
  }
  constructor(data: IInventoryData) {
    super(data);
  }
}

test("Initial data value", () => {
  let person = new Person(personData);
  // Make sure that data is copied
  expect(person.dataProxy).toEqual(personData);
  // Make sure that current data equals to staged data as the data is not changed yet
  expect(person.dataProxy).toEqual(person.stagedDataProxy);
  // Make sure that data is also copied for child data holder
  expect(person.inventory.dataProxy).toEqual(personData.inventory);
  // Make sure that object references are kept
  expect(person.dataProxy.hobbies).toBe(personData.hobbies);
});

test("Property listable and enumerable", () => {
  let person = new Person(personData);
  // Ensure that proxy is working and the properties can be listed
  expect(Object.keys(person.dataProxy)).toEqual(Object.keys(personData));
  // Ensure that data is also copied for child data holder and the properties can be listed
  expect(Object.keys(person.inventory.dataProxy)).toEqual(
    Object.keys(personData.inventory)
  );
  // Ensure that the properties are enumerable with for...in loop
  let keyList: Array<string> = [];
  for (let key in person.dataProxy) {
    keyList.push(key);
  }
  expect(keyList).toEqual(Object.keys(personData));
});

test("Child data proxy reachable from parent", () => {
  let person = new Person(personData);
  // Ensure that the child data proxy reference is reachable from the parent
  expect(person.dataProxy.inventory).toBe(person.inventory.dataProxy);
});

test("apply()", (done) => {
  let todo = new Todo(4, done); // A counter that calls done() when all the async operations are done
  // This is our testing subject
  let person = new Person(personData);
  // Ensure that apply event is triggered on the parent data holder
  let willApplyHandler = jest.fn(() => {
    todo.do();
  });
  person.once<IWillApplyEvent>("willApply", willApplyHandler);
  let didApplyHandler = jest.fn((event: AnyEvent<IDidApplyEvent>) => {
    let changes = event.data.changes;
    try {
      expect(changes.addProps).toEqual(["extraProp"]);
      expect(changes.removeProps).toEqual([]);
      expect(changes.updateProps).toEqual(["name", "inventory"]); // Inventory is here because the child data holder is changed
      expect(changes.unchangeProps).toEqual([
        "age",
        "hobbies",
        "nullValue",
        // "undefinedValue", // Should not have this property as the staged value and current value are both undefined
      ]);
      todo.do();
    } catch (error) {
      todo.done(error);
    }
  });
  person.once<IDidApplyEvent>("didApply", didApplyHandler);
  // Ensure that apply event is triggered on the child data holder
  let childWillApplyHandler = jest.fn(() => {
    todo.do();
  });
  person.inventory.once<IWillApplyEvent>("willApply", childWillApplyHandler);
  let childDidApplyHandler = jest.fn((event: AnyEvent<IDidApplyEvent>) => {
    let changes = event.data.changes;
    try {
      expect(changes.addProps).toEqual([]);
      expect(changes.removeProps).toEqual([]);
      expect(changes.updateProps).toEqual(["gold"]);
      expect(changes.unchangeProps).toEqual(["items"]);
      todo.do();
    } catch (error) {
      todo.done(error);
    }
  });
  person.inventory.once<IDidApplyEvent>("didApply", childDidApplyHandler);
  // Change the data
  person.dataProxy.extraProp = "extra";
  person.dataProxy.name = "Ben";
  person.inventory.dataProxy.gold = 200;
  // The changes should not be reflected yet
  expect(person.dataProxy.extraProp).toBeUndefined();
  expect(person.dataProxy.name).toBe(personData.name);
  expect(person.inventory.dataProxy.gold).toBe(personData.inventory.gold);
  // We should be able to get the changes from getUpdate()
  expect(person.getUpdate()).toEqual({
    ...personData,
    extraProp: "extra",
    name: "Ben",
    inventory: {
      ...personData.inventory,
      gold: 200,
    },
  });
  // Apply the changes
  person.apply();
  // The changes should be reflected now
  expect(person.dataProxy.extraProp).toBe("extra");
  expect(person.dataProxy.name).toBe("Ben");
  expect(person.inventory.dataProxy.gold).toBe(200);
  // We should get null from getUpdate() as the changes are already applied
  expect(person.getUpdate()).toBeNull();
  expect(person.inventory.getUpdate()).toBeNull();
  // Ensure that the apply event is triggered
  expect(willApplyHandler).toBeCalled();
  expect(didApplyHandler).toBeCalled();
  expect(childWillApplyHandler).toBeCalled();
  expect(childDidApplyHandler).toBeCalled();
}, 100);

test("drop()", (done) => {
  let todo = new Todo(4, done); // A counter that calls done() when all the async operations are done
  // This is our testing subject
  let person = new Person(personData);
  // Ensure that apply event is triggered on the parent data holder
  let willDropHandler = jest.fn(() => {
    todo.do();
  });
  person.once<IWillDropEvent>("willDrop", willDropHandler);
  let didDropHandler = jest.fn((event: AnyEvent<IDidDropEvent>) => {
    let changes = event.data.changes;
    try {
      expect(changes.addProps).toEqual(["extraProp"]);
      expect(changes.removeProps).toEqual([]);
      expect(changes.updateProps).toEqual(["name", "inventory"]); // Inventory is here because the child data holder is changed
      expect(changes.unchangeProps).toEqual([
        "age",
        "hobbies",
        "nullValue",
        // "undefinedValue", // Should not have this property as the staged value and current value are both undefined
      ]);
      todo.do();
    } catch (error) {
      todo.done(error);
    }
  });
  person.once<IDidDropEvent>("didDrop", didDropHandler);
  // Ensure that apply event is triggered on the child data holder
  let childWillDropHandler = jest.fn(() => {
    todo.do();
  });
  person.inventory.once<IWillDropEvent>("willDrop", childWillDropHandler);
  let childDidDropHandler = jest.fn((event: AnyEvent<IDidDropEvent>) => {
    let changes = event.data.changes;
    try {
      expect(changes.addProps).toEqual([]);
      expect(changes.removeProps).toEqual([]);
      expect(changes.updateProps).toEqual(["gold"]);
      expect(changes.unchangeProps).toEqual(["items"]);
      todo.do();
    } catch (error) {
      todo.done(error);
    }
  });
  person.inventory.once<IDidDropEvent>("didDrop", childDidDropHandler);
  // Change the data
  person.dataProxy.extraProp = "extra";
  person.dataProxy.name = "Ben";
  person.inventory.dataProxy.gold = 200;
  // The changes should be in the staged data
  expect(person.stagedDataProxy.extraProp).toBe("extra");
  expect(person.stagedDataProxy.name).toBe("Ben");
  expect(person.inventory.stagedDataProxy.gold).toBe(200);
  // But not in the current data
  expect(person.dataProxy.extraProp).toBeUndefined();
  expect(person.dataProxy.name).toBe(personData.name);
  expect(person.inventory.dataProxy.gold).toBe(personData.inventory.gold);
  // We should be able to get the changes from getUpdate()
  expect(person.getUpdate()).toEqual({
    ...personData,
    extraProp: "extra",
    name: "Ben",
    inventory: {
      ...personData.inventory,
      gold: 200,
    },
  });
  // Drop the changes
  person.drop();
  // The changes should be dropped and the staged data should be the same as the current data
  expect(person.stagedDataProxy).toEqual(personData);
  expect(person.stagedDataProxy).toEqual(person.dataProxy);
  // We should get null from getUpdate() as the changes are already dropped
  expect(person.getUpdate()).toBeNull();
  expect(person.inventory.getUpdate()).toBeNull();
  // Ensure that the drop event is triggered
  expect(willDropHandler).toBeCalled();
  expect(didDropHandler).toBeCalled();
  expect(childWillDropHandler).toBeCalled();
  expect(childDidDropHandler).toBeCalled();
}, 100);

test("getData() getUpdate() setUpdate()", (done) => {
  let todo = new Todo(4, done); // A counter that calls done() when all the async operations are done
  // This is our testing subject
  let sourcePerson = new Person(personData);
  let dataCopy = sourcePerson.getData();
  expect(dataCopy).not.toBe(sourcePerson.dataProxy);
  let targetPerson = new Person(dataCopy);
  // Ensure that the events are triggered
  let willGetUpdateHandler = jest.fn(() => {
    todo.do();
  });
  let didGetUpdateHandler = jest.fn((event: AnyEvent<IDidGetUpdateEvent>) => {
    try {
      const changes: IChangeSummary = event.data.changes;
      expect(changes.addProps).toEqual(["extraProp"]);
      expect(changes.removeProps).toEqual(["age"]);
      expect(changes.updateProps).toEqual(["name"]);
      // Should not include "undefinedValue" as it is undefined and does not considered existing
      expect(changes.unchangeProps).toEqual([
        "hobbies", // Reference unchanged
        "inventory",
        "nullValue",
      ]);
      todo.do();
    } catch (error) {
      todo.done(error);
    }
  });
  let willSetUpdateHandler = jest.fn(() => {
    todo.do();
  });
  let didSetUpdateHandler = jest.fn((event: AnyEvent<IDidSetUpdateEvent>) => {
    try {
      const changes: IChangeSummary = event.data.changes;
      expect(changes.addProps).toEqual(["extraProp"]);
      expect(changes.removeProps).toEqual(["age"]);
      expect(changes.updateProps).toEqual(["name", "hobbies"]); // Should include "hobbies" as it is an array and is replaced (Reference changed)
      // Should not include "undefinedValue" as it is undefined and does not considered existing
      expect(changes.unchangeProps).toEqual(["inventory", "nullValue"]);
      todo.do();
    } catch (error) {
      todo.done(error);
    }
  });

  // Check if the data is copied
  expect(targetPerson.dataProxy).toEqual(sourcePerson.dataProxy);
  let updateData: DataObject | null = sourcePerson.getUpdate();
  // It should be null as the data is not changed
  expect(updateData).toEqual(null);
  targetPerson.setUpdate(updateData);
  // Data should not be changed as the update data is null
  expect(targetPerson.dataProxy).toEqual(targetPerson.stagedDataProxy);
  // Change the data
  sourcePerson.dataProxy.extraProp = "extra";
  sourcePerson.dataProxy.name = "Ben";
  // Should not be considered as a change at sourcePerson as the reference is unchanged. However, it should be considered as a change at targetPerson as the reference is different from it's staged data.
  sourcePerson.dataProxy.hobbies.push("swimming");
  // Remove the property by setting it to undefined
  sourcePerson.dataProxy.age = undefined as any;
  // Set up the event handlers
  sourcePerson.once<IWillGetUpdateEvent>("willGetUpdate", willGetUpdateHandler);
  sourcePerson.once<IDidGetUpdateEvent>("didGetUpdate", didGetUpdateHandler);
  // Get the update data
  updateData = sourcePerson.getUpdate();
  // It should be a data object with the changes
  expect(updateData).toEqual({
    ...personData,
    extraProp: "extra",
    name: "Ben",
    inventory: null, // Should be null as the data in child data holder is not changed
    age: undefined, // Should be undefined as the property is removed
  });
  // Set up the event handlers
  targetPerson.once<IWillSetUpdateEvent>("willSetUpdate", willSetUpdateHandler);
  targetPerson.once<IDidSetUpdateEvent>("didSetUpdate", didSetUpdateHandler);
  // Send the update data to the target
  sourcePerson.setUpdate(updateData);
  targetPerson.setUpdate(updateData);
  // Data should be synced
  expect(targetPerson.dataProxy).toEqual(sourcePerson.dataProxy);
  // Change child data
  sourcePerson.inventory.dataProxy.gold = 200;
  // Transfer the update data
  updateData = sourcePerson.getUpdate();
  sourcePerson.setUpdate(updateData);
  targetPerson.setUpdate(updateData);
  // Data should be synced
  expect(targetPerson.inventory.dataProxy.gold).toBe(200);
  expect(targetPerson.dataProxy).toEqual(sourcePerson.dataProxy);
  expect(targetPerson.inventory.dataProxy).toEqual(
    sourcePerson.inventory.dataProxy
  );
  // Ensure that the events are triggered
  expect(willGetUpdateHandler).toBeCalled();
  expect(didGetUpdateHandler).toBeCalled();
  expect(willSetUpdateHandler).toBeCalled();
  expect(didSetUpdateHandler).toBeCalled();
});

test("childCreator & delete children", (done) => {
  let todo = new Todo(4 + 8, done); // A counter that calls done() when all the async operations are done
  // This is our testing subject
  function childCreator(property: string, data: DataObject) {
    try {
      // Each case should be called twice. One for the source data holder and one for the target data holder
      switch (property) {
        case "inventory":
          expect(data).toEqual(personData.inventory);
          break;
        case "inventory1":
          expect(data).toEqual(inventory1Data);
          break;
        default:
          throw new Error("Invalid property");
      }
      todo.do();
    } catch (error) {
      todo.done(error);
    }
    return new Inventory(data as IInventoryData);
  }
  // Starting with data that contains inventory for creating a child
  let sourcePerson = new Person(personData, childCreator);
  let dataCopy = sourcePerson.getData();
  expect(dataCopy).not.toBe(sourcePerson.dataProxy);
  let targetPerson = new Person(sourcePerson.getData(), childCreator);
  expect(targetPerson.dataProxy).toEqual(sourcePerson.dataProxy);
  // Child data holder should be created
  expect(sourcePerson.childrenProxy.inventory).toBeDefined();
  expect((sourcePerson.childrenProxy.inventory as Inventory).dataProxy).toEqual(
    personData.inventory
  );
  expect(targetPerson.childrenProxy.inventory).toBeDefined();
  expect((targetPerson.childrenProxy.inventory as Inventory).dataProxy).toEqual(
    personData.inventory
  );
  // Check if childs are enumerable
  expect(Object.keys(sourcePerson.childrenProxy)).toEqual(["inventory"]);
  expect(Object.keys(targetPerson.childrenProxy)).toEqual(["inventory"]);

  // Set up the event handlers.
  // Each handler should be called twice. One for the source data holder and one for the target data holder
  let willSetChildHandler = jest.fn((event: AnyEvent<IWIllSetChildEvent>) => {
    expect(event.data.property).toEqual("inventory1");
    expect(event.data.child.getData()).toEqual(inventory1Data);
    todo.do();
  });
  let didSetChildHandler = jest.fn((event: AnyEvent<IDidSetChildEvent>) => {
    expect(event.data.property).toEqual("inventory1");
    expect(event.data.child.getData()).toEqual(inventory1Data);
    todo.do();
  });
  let willRemoveChildHandler = jest.fn(
    (event: AnyEvent<IWillRemoveChildEvent>) => {
      expect(event.data.property).toEqual("inventory1");
      expect(event.data.child.getData()).toEqual(inventory1Data);
      todo.do();
    }
  );
  let didRemoveChildHandler = jest.fn(
    (event: AnyEvent<IDidRemoveChildEvent>) => {
      expect(event.data.property).toEqual("inventory1");
      expect(event.data.child.getData()).toEqual(inventory1Data);
      todo.do();
    }
  );
  sourcePerson.once<IWIllSetChildEvent>("willSetChild", willSetChildHandler);
  sourcePerson.once<IDidSetChildEvent>("didSetChild", didSetChildHandler);
  sourcePerson.once<IWillRemoveChildEvent>(
    "willRemoveChild",
    willRemoveChildHandler
  );
  sourcePerson.once<IDidRemoveChildEvent>(
    "didRemoveChild",
    didRemoveChildHandler
  );
  targetPerson.once<IWIllSetChildEvent>("willSetChild", willSetChildHandler);
  targetPerson.once<IDidSetChildEvent>("didSetChild", didSetChildHandler);
  targetPerson.once<IWillRemoveChildEvent>(
    "willRemoveChild",
    willRemoveChildHandler
  );
  targetPerson.once<IDidRemoveChildEvent>(
    "didRemoveChild",
    didRemoveChildHandler
  );

  // Add inventory1
  let inventory1Data = Object.freeze({
    gold: 5,
    items: ["armor"],
  });
  sourcePerson.dataProxy.inventory1 = inventory1Data;
  let updateData = sourcePerson.getUpdate();
  sourcePerson.apply();
  targetPerson.setUpdate(updateData);
  expect(sourcePerson.childrenProxy.inventory1).toBeDefined();
  expect(
    (sourcePerson.childrenProxy.inventory1 as Inventory).dataProxy
  ).toEqual(inventory1Data);
  expect(targetPerson.childrenProxy.inventory1).toBeDefined();
  expect(
    (targetPerson.childrenProxy.inventory1 as Inventory).dataProxy
  ).toEqual(inventory1Data);
  expect(Object.keys(sourcePerson.childrenProxy)).toEqual([
    "inventory",
    "inventory1",
  ]);
  expect(Object.keys(targetPerson.childrenProxy)).toEqual([
    "inventory",
    "inventory1",
  ]);
  // Remove inventory1
  delete sourcePerson.childrenProxy.inventory1;
  updateData = sourcePerson.getUpdate();
  sourcePerson.apply();
  targetPerson.setUpdate(updateData);
  expect(sourcePerson.childrenProxy.inventory1).toBeUndefined();
  expect(targetPerson.childrenProxy.inventory1).toBeUndefined();
  expect(sourcePerson.dataProxy.inventory1).toBeUndefined();
  expect(targetPerson.dataProxy.inventory1).toBeUndefined();
  expect(Object.keys(sourcePerson.childrenProxy)).toEqual(["inventory"]);
  expect(Object.keys(targetPerson.childrenProxy)).toEqual(["inventory"]);
}, 100);

class Todo {
  public count: number;
  public onDone: Function;
  public stack: string = "";
  private _isDone: boolean = false;
  private _currentCount: number = 0;

  public get currentCount(): number {
    return this._currentCount;
  }
  constructor(count: number, onDone: (error: any) => void) {
    this.count = count;
    this.onDone = onDone;
  }
  public do() {
    this._currentCount++;
    if (this._currentCount >= this.count) {
      this.done();
    }
  }
  public done(error?: any) {
    if (this._isDone) {
      Error.captureStackTrace(this);
      console.warn("done() is called more than once", error || this.stack);
      return;
    }
    this._isDone = true;
    this.onDone(error);
  }
}
