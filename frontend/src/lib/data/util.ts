/**
 * This is the **internal property accessor function**
 *
 * This will give you the access to the "internal properties" of an object without any TypeScript Error.
 *
 * Since TypeScript has no such a concept of "internal property".
 * You could simply declare an internal property as a private property
 * and intentionally call this function when you have to access it.
 * @param object an instance of any class
 * @returns the original object you just passed in, but all the private properties are now accessable.
 */
export function internal(object: object): IIndexable {
  return object as unknown as IIndexable;
}

export interface IIndexable {
  [key: string | symbol]: any;
}
/**
 * Apply default values to an object if the object property is undefined.
 * @param data Object to apply default values to.
 * @param defaultData Default values.
 * @returns A new object with default values applied.
 */
export function applyDefault<T extends IIndexable>(
  data: T,
  defaultData: Partial<T>
): T {
  data = { ...data };
  Object.keys(defaultData).forEach((key: keyof T) => {
    //Will apply default if value is undefined.
    if (data[key] === undefined) {
      data[key] = defaultData[key] as any;
    }
  });
  return data as T;
}

export function compareObject(
  data1: IIndexable,
  data2: IIndexable,
  recursive: boolean = false
): boolean {
  for (let key in data1) {
    if (typeof data1[key] === "object" && typeof data2[key] === "object") {
      if (!compareObject(data1[key], data2[key], recursive)) {
        return false;
      }
    } else if (data1[key] !== data2[key]) {
      return false;
    }
  }
  return true;
}

/**
 * Union of two arrays
 * Will merge array1 and array2 and return a new array. All elements will appear only once in the new array, and will not be repeated.
 * The elements of the array can be any type of data such as String/Number/Object
 * 陣列聯集運算，會合併 陣列1 與 陣列2 並將所有元素以新的陣列傳回。其中所有元素只會在新陣列中出現一次，不會重複。
 * 陣列的元素可為 String/Number/Object 等任意型別的資料
 * @param {Array<any>} array1 陣列1
 * @param {Array<any>} array2 陣列2
 */
export function arrayUnion(array1: Array<any>, array2: Array<any>): Array<any> {
  let map = new Map();
  let resultArray: Array<any> = [];
  array1.forEach((element) => {
    if (!map.get(element)) {
      resultArray.push(element);
      map.set(element, true);
    }
  });
  array2.forEach((element) => {
    if (!map.get(element)) {
      resultArray.push(element);
      map.set(element, true);
    }
  });
  return resultArray;
}

type ClonerFunc = (obj: IIndexable, depth: number) => any;
/**
 * Deep copy an object. You can specify the maximum depth of the copy and customize the way instances of specific classes are copied.
 * The function returns a new object that is a deep copy of the original object, with the option to specify the maximum depth of the copy.
 * ***
 * 拷貝物件，可指定拷貝的最大深度，並自訂遭遇特殊類別的物件處理方式。
 * 可處理循環資料結構，拷貝後的新結構也會有相同的循環特性
 * 遭遇特殊類別(例如 Date 物件。非 Object 的直接實例。)時，會呼叫 clonerFunc 函數以執行自訂拷貝程序。
 * 若拷貝深度達到最大值則會直接寫入原始屬性值，而不會進行深層拷貝。若屬性值為 Object、Array 或任何類別的物件，則會直接填入原始物件的參照。
 * @param obj Object or Array to be cloned. 要拷貝的物件或陣列，若傳入的 obj 不是物件或陣列，會直接將此參數值傳回。
 * @param maxDepth 最大拷貝深度，預設為 0，即不限制，會完整拷貝物件的全部深層資料結構。設為 1 時，會為第一層物件建立淺層拷貝的副本。當第一層物件的屬性指向一個子物件(位於第二層)時，由於超過最大拷貝深度，因此只會拷貝指向該子物件的參照，而不會為該子物件建立副本。
 * @param clonerFunc A custom function for cloning instances of specific classes(for example, a Date object).  自訂物件拷貝器，可用於拷貝屬於特定類別的物件 (例如 Date 物件。非 Object 的直接實例。)
 * @returns The cloned object or array. If the obj is not an object or array, the obj will be returned directly. 已拷貝的物件或陣列。若傳入的 obj 不是物件或陣列，會直接將該參數值傳回。
 * @example
 * let myFriend={
 *      birthday:new Date(),
 *      name:"john",
 *      toDoList:["eat","drink","sleep"]
 * }
 * function clonerFunc(obj, depth){
 *      if(obj instanceof Date){ //拷貝 Date 物件
 *          return new Date(obj.getTime());
 *      }else{ //其他設為 String
 *          return "Unable to clone object: " + String(value)
 *      }
 * }
 * DataHelper.cloneObject(myFriend,2,clonerDict);
 */
export function cloneObject(
  obj: any,
  maxDepth: number = 0,
  clonerFunc: ClonerFunc | null = null
) {
  const objMap = new WeakMap();
  function recursiveClone(obj: IIndexable, depth: number) {
    //已達拷貝深度上限
    if (maxDepth > 0 && depth > maxDepth) {
      return obj;
    }
    //為 null 或不是物件
    if (obj == null || typeof obj != "object") {
      return obj;
    }
    //找到已登記的物件(發現循環結構)
    if (objMap.has(obj)) {
      return objMap.get(obj);
    }
    //是陣列
    if (Array.isArray(obj)) {
      let newArray: Array<any> = [];
      objMap.set(obj, newArray);
      obj.forEach((value) => {
        newArray.push(recursiveClone(value, depth + 1));
      });
      return newArray;
    }
    //是簡單物件
    if (obj.constructor == Object) {
      let newObj: IIndexable = {};
      objMap.set(obj, newObj);
      let keyList = Object.keys(obj);
      keyList.forEach((key) => {
        newObj[key] = recursiveClone(obj[key], depth + 1);
      });
      return newObj;
    }
    //是複雜物件(可處理)
    if (clonerFunc) {
      let newObj = clonerFunc(obj, depth + 1);
      objMap.set(obj, newObj);
      return newObj;
    }
    return obj; //不可處理的複雜物件，直接傳回
  }
  return recursiveClone(obj, 1);
}

type MergeFunc = (key: any, value1: any, value2: any) => any;
const OBJECT_BINDED_PROP_NAME = "__boolean_helper_recursive_newObject";
/**
 * 屬性合併函數 - 取得非 null 之值
 * 從兩物件共同屬性值中，優先選出非 null 之值作為新值。
 * ### 合併原則 ###
 * - 會優先採用 value1 為新值，若 value1 為 null 則採用 value2。
 * - 若 value1 及 value2 皆為 null，則仍會採用 null 為新值。
 */
const PROPERTY_MERGE_FUNC_GET_NONE_NULL: MergeFunc = (
  key: any,
  value1: any,
  value2: any
) => {
  return value1 == null ? value2 : value1;
};

/**
 * Union of two objects
 * Will merge object1 and object2 and return a new object. The new object will contain all the properties of object1 and object2.
 * If the same property exists in both object1 and object2, the mergeFunc will be called to determine the new value of the property.
 * If mergeFunc is not defined, the default property merge function PROPERTY_MERGE_FUNC_GET_NONE_NULL will be used. That is, the value of object1 will be used first. If the value of the property is null, the value of object2 will be used.
 * ---
 * 物件聯集運算。會提取 object1 與 object2 任一個當中存在 (不為 undefined) 的屬性合併至新的物件並傳回。
 * 在 object1 與 object2 中皆存在的屬性會呼叫 mergeFunc 並使用 mergeFunc 的傳回值作為合併後的新值。
 * 若無定義 mergeFunc 則會使用預設屬性合併函數 PROPERTY_MERGE_FUNC_GET_NONE_NULL。即優先使用 object1 的屬性值，若該屬性值為 null 則使用 object2 的屬性值。
 * @param object1
 * @param object2
 * @param mergeFunc A custom function for merging properties. The return value of the function will be used as the new value of the property. If the return value is undefined, the property will be discarded. 自訂義屬性合併函數。傳回值會用來作為合併後的新值。若傳回值為 undefined (即無傳回值)，則該屬性會被丟棄。
 * @param recursive Perform recursive union. 遞歸執行合併。若為 true 則會遞歸執行 objectUnion()，將 object1 與 object2 中的物件屬性進行合併。若為 false 則只會合併 object1 與 object2 中的非物件屬性。
 * @returns {Object} A new object that contains all the properties of object1 and object2. 傳回一個新的物件，該物件包含 object1 與 object2 的所有屬性。
 */
export function objectUnion(
  object1: IIndexable,
  object2: IIndexable,
  recursive: boolean = false,
  mergeFunc?: MergeFunc
): IIndexable {
  let _mergeFunc: MergeFunc = mergeFunc || PROPERTY_MERGE_FUNC_GET_NONE_NULL;
  //檢查物件中的循環結構。例如物件 A 有一屬性指向物件 B，物件 B 有一屬性指回物件 A。 若遞歸執行 objectDifference() 則會重複遭遇 A 無限次。此時不應重複處理 A。只要傳回第一次處理 A 的處理結果即可。
  let newObject = getNewObject(object1);
  if (newObject) {
    return newObject;
  }
  //建立防止無限循環機制
  newObject = bindNewObject(object1); //創建新的物件並綁定到 object1
  Object.keys(object1).forEach((key) => {
    let value1 = object1[key];
    let value2 = object2[key];
    if (value2 === undefined) {
      //提取 object1 獨有屬性
      newObject[key] = cloneObject(value1);
    }
  });
  Object.keys(object2).forEach((key) => {
    let value1 = object1[key];
    let value2 = object2[key];
    if (value1 === undefined) {
      //提取 object2 獨有屬性
      newObject[key] = cloneObject(value2);
    } else {
      //提取 object2 & object1 共有屬性
      let newValue;
      if (
        recursive &&
        value1 != null &&
        value2 != null &&
        value1.constructor == Object &&
        value1.constructor == value2.constructor
      ) {
        //啟用遞歸 且 兩者皆為 Object
        newValue = objectUnion(value1, value2, recursive, _mergeFunc);
      } else {
        newValue = _mergeFunc(key, value1, value2);
      }
      if (newValue !== undefined) {
        newObject[key] = newValue;
      }
    }
  });
  unbindNewObject(object1);
  return newObject;
}
function bindNewObject(obj: IIndexable) {
  let newObject = {};
  Object.defineProperty(obj, OBJECT_BINDED_PROP_NAME, {
    value: newObject,
    configurable: true, //允許這個屬性可被 delete 刪除
    enumerable: false, //不可被列舉，以免被複製
  });
  obj[OBJECT_BINDED_PROP_NAME] = newObject;
  return newObject;
}

function getNewObject(obj: IIndexable) {
  return obj[OBJECT_BINDED_PROP_NAME] || null;
}

function unbindNewObject(obj: IIndexable) {
  delete obj[OBJECT_BINDED_PROP_NAME];
}
/**
 *
 * Wraps a function with a timeout. The wrapped function will call `onSuccess` with the provided arguments if it completes before the timeout, or `onTimeout` if it does not.
 * @param onSuccess The function to call if the wrapped function completes before the timeout.
 * @param onTimeout The function to call if the wrapped function does not complete before the timeout.
 * @param timeout The timeout in milliseconds.
 * @returns A new function that wraps the provided function with the timeout.
 */
export function withTimeout(
  onSuccess: Function,
  onTimeout: Function,
  timeout: number
) {
  let called = false;
  const timer = setTimeout(() => {
    if (called) return;
    called = true;
    onTimeout();
  }, timeout);

  return (...args: any[]) => {
    if (called) return;
    called = true;
    clearTimeout(timer);
    onSuccess(...args);
  };
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function filterObjectByKey(
  obj: IIndexable,
  keyList: Array<string>
): IIndexable {
  let newObj: IIndexable = {};
  keyList.forEach((key) => {
    if (obj[key] === undefined) {
      return;
    }
    newObj[key] = obj[key];
  });
  return newObj;
}

export function randomInterger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement<T>(
  array: Array<T>,
  deleteElement: boolean = false
): T {
  let index = randomInterger(0, array.length - 1);
  if (deleteElement) {
    return array.splice(index, 1)[0];
  } else {
    return array[index];
  }
}
