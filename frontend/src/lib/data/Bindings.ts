import { arrayUnion } from "./util";
import EventDispatcher from "../EventDispatcher";
import BindingsEvent from "./BindingsEvent";

/**
 * Represents a group of bindings. Used for managing data.
 * Bindings does not save data. It only manages the bindings between tags and data.
 * Unlike Map, it allows multiple tags to be bound to the same data and allows multiple data to be bound to the same tag.
 * ### Details ###
 * The data to be bound is called Target. There are two types of targets: (1) Object (2) String.
 * - When the target is "Object": The tag is associated with the object that carries the data, so that the data can be accessed quickly without the need to map the ID to the data.
 * - When the target is "String": The tag is associated with the ID string that represents the data (not the object that carries the data itself). If the user needs to access the data, he must obtain the corresponding data from other data sources (such as a data table) based on the ID.
 *
 * 綁定關聯，用於組織管理資料。讓使用者可以為指定的資料設置標籤，建立標籤與資料的綁定關聯，並透過標籤來歸納存取資料。
 * 此類別只實作標籤的管理及標籤與資料的綁定關聯，但不會代為儲存資料。
 * ### 用法 ###
 * 欲綁定的資料，在此處稱之為 綁定目標(Target)，綁定目標有兩種類型：(1)物件 (2)字串。 必須在建構此標籤群組時，就設定其類型且不可再半途變更。
 * - 當綁定目標為「物件」：會將「標籤」與「攜帶資料的物件」相關聯，方便快速的檢索存取。不必再多一道 ID 與資料的對應的手續。
 * - 當綁定目標為「字串」：會將「標籤」與「代表資料的 ID 字串」(而非攜帶資料的物件本身)相關聯，若使用者需要取得資料，則必須自行根據 ID 從其他資料來源(例如某資料表)取得對應資料。
 */
export default class Bindings extends EventDispatcher {
  private _targetIsObject: boolean;
  private _targetType: any;
  private _tagTargetListDict: any;
  private _idTagListDict: any;
  private _objectTagListMap: any;
  private _getTargetTagList: any;
  private _setTargetTagList: any;
  private _getTargetList: any;

  /**
   * Indicates whether the target is an object (Object). True for object, false for string.
   * 指出綁定關係中的 Target 是否為一個物件(Object)。若為 false 則表示 Target 為字串(String)。
   */
  get targetIsObject() {
    return this._targetIsObject;
  }
  /**
   * Create a Bindings object
   * 建立一個 Bindings 物件
   * @param targetIsObject Indicates whether the target is an object (Object). True for object, false for string. 將綁定目標之類型設定為物件 (Object) 而非 ID 字串(String)。這會改變此 Bindings 的行為，使其只允許與物件類型的目標綁定，嘗試綁定字串類型的目標會導致錯誤。預設為 false，即以 ID 字串為綁定目標類型，此時不允許綁定物件類型的目標。
   */
  constructor(targetIsObject: boolean = false) {
    super();
    if (targetIsObject) {
      this._targetType = Object;
      this._objectTagListMap = new Map();
      this._getTargetTagList = (object: any) => {
        return this._objectTagListMap.get(object);
      };
      this._setTargetTagList = (object: any, tagList: Array<string>) => {
        if (!tagList) {
          this._objectTagListMap.delete(object);
          return;
        }
        this._objectTagListMap.set(object, tagList);
      };
      this._getTargetList = () => {
        return Array.from(this._objectTagListMap.keys());
      };
    } else {
      this._targetType = String;
      this._idTagListDict = {};
      this._getTargetTagList = (idString: string) => {
        return this._idTagListDict[idString];
      };
      this._setTargetTagList = (idString: string, tagList: Array<string>) => {
        if (!tagList) {
          delete this._idTagListDict[idString];
          return;
        }
        this._idTagListDict[idString] = tagList;
      };
      this._getTargetList = () => {
        return Object.keys(this._idTagListDict);
      };
    }
    this._targetIsObject = targetIsObject;
    this._tagTargetListDict = {};
  }
  /**
   * Set the tags bound to the target. This will overwrite the original binding relationship.
   * 設置與 Target 綁定的所有標籤，原有的綁定關係設置會被清除，並以此設置取代之。
   * @param target 綁定目標。會將標籤與該目標綁定。一般為作為 ID 的字串(String)。若於建構 Bindings 物件時將 targetIsObject 參數設為 true，則此綁定目標應為一個物件 (Object)，放入字串會擲回錯誤。
   * @param tagOrList 新的標籤(或標籤清單)。會取代此 Target 原有的標籤綁定關係。若省略此值則不會變更。傳入空陣列可清空 Target 與所有標籤的綁定。
   */
  set(
    target: string | Object,
    tagOrList: string | Array<string> | null = null
  ) {
    let tagList: Array<string> | null = null;
    if (typeof tagOrList == "string") {
      tagList = [tagOrList];
    } else if (Array.isArray(tagOrList)) {
      tagList = tagOrList;
    } else if (tagOrList == null) {
      tagList = [];
    } else {
      throw new Error(
        `Invalid value for parameter 'tagOrList'. Expect String or Array, got ${typeof tagOrList}`
      );
    }
    tagList = checkTagListValid(tagList);
    //從舊的 Tag 對應的 Target 清單移除 Target
    let existTagList = this._getTargetTagList(target) || [];
    existTagList.forEach((tag: string) => {
      if (this._getTargetTagList(target)) {
        removeFromList(this._tagTargetListDict[tag], target);
      }
      this._removeEmptyTagTargetList(tag);
    });
    //在新的 Tag 對應的 Target 清單加入 Target
    tagList.forEach((tag) => {
      if (!this._tagTargetListDict[tag]) {
        this._tagTargetListDict[tag] = [target];
      } else {
        this._tagTargetListDict[tag].push(target);
      }
    });
    this._setTargetTagList(target, tagList);
    this.emit(
      new BindingsEvent(BindingsEvent.EVENT_TARGET_TAG_CHANGED, target, tagList)
    );
  }
  /**
   * Get all tags bound to the target.
   * 讀取與 Target 綁定的所有標籤
   * @param  target 綁定目標。會將標籤與該目標綁定。一般為作為 ID 的字串(String)。若於建構 Bindings 物件時將 targetIsObject 參數設為 true，則此綁定目標應為一個物件 (Object)，放入字串會擲回錯誤。
   * @returns 會傳回當前與 Target 綁定的所有標籤清單副本
   */
  get(target: string | Object): Array<string> {
    return this._getTargetTagList(target) || [];
  }
  /**
   * Bind a tag to the specified target.
   * 為指定的 Target 新增綁定標籤
   * @param  target 綁定目標。會將標籤與該目標綁定。一般為作為 ID 的字串(String)。若於建構 Bindings 物件時將 targetIsObject 參數設為 true，則此綁定目標應為一個物件 (Object)，放入字串會擲回錯誤。
   * @param tagOrList 標籤或標籤清單
   */
  bind(target: string | Object, tagOrList: string | Array<string>) {
    let tagList = null;
    if (typeof tagOrList == "string") {
      tagList = [tagOrList];
    } else if (Array.isArray(tagOrList)) {
      tagList = tagOrList;
    } else {
      throw new Error(
        `Invalid value for parameter 'tagOrList'. Expect String or Array, got ${typeof tagOrList}`
      );
    }
    if (tagList.length == 0) {
      return;
    }
    tagList = checkTagListValid(tagList);
    tagList.forEach((tag) => {
      this._tagTargetListDict[tag] = arrayUnion(
        this._tagTargetListDict[tag] || [],
        [target]
      );
    });
    this._setTargetTagList(
      target,
      arrayUnion(this._getTargetTagList(target) || [], tagList)
    );
    this.emit(
      new BindingsEvent(BindingsEvent.EVENT_TARGET_TAG_CHANGED, target, tagList)
    );
  }
  /**
   * Unbind the specified tag from the target.
   * 為指定的 Target 移除綁定標籤
   * @param target 綁定目標。會將標籤與該目標綁定。一般為作為 ID 的字串(String)。若於建構 Bindings 物件時將 targetIsObject 參數設為 true，則此綁定目標應為一個物件 (Object)，放入字串會擲回錯誤。
   * @param tagOrList 標籤或標籤清單
   */
  unbind(target: string | Object, tagOrList: string | Array<string>) {
    let tagList = null;
    if (typeof tagOrList == "string") {
      tagList = [tagOrList];
    } else if (Array.isArray(tagOrList)) {
      tagList = tagOrList;
    } else {
      throw new Error(
        `Invalid value for parameter 'tagOrList'. Expect String or Array, got ${typeof tagOrList}`
      );
    }
    if (tagList.length == 0) {
      return;
    }
    tagList = checkTagListValid(tagList);
    let existTagList = this._getTargetTagList(target);
    if (!existTagList) {
      return;
    }
    //從舊的 Tag 對應的 Target 清單移除 Target
    tagList.forEach((tag) => {
      if (this._getTargetTagList(target)) {
        removeFromList(this._tagTargetListDict[tag], target);
      }
      if (this._tagTargetListDict[tag]) {
        removeFromList(existTagList, tag);
      }
      this._removeEmptyTagTargetList(tag);
    });
    this._removeEmptyTargetTagList(target);
    this.emit(
      new BindingsEvent(
        BindingsEvent.EVENT_TARGET_TAG_CHANGED,
        target,
        existTagList
      )
    );
  }
  /**
   * Collect all targets associated with the specified tag.
   * 取得與指定標籤關聯的所有 Target 清單
   * @param tag 指定標籤
   * @returns 與指定標籤關聯的所有 Target 清單，找不到時傳回空陣列
   */
  collect(tag: string): Array<string | Object> {
    tag = tag.trim();
    let targetList = this._tagTargetListDict[tag];
    if (targetList) {
      return targetList.slice();
    } else {
      return [];
    }
  }
  /**
   * Dismiss all targets associated with the specified tag.
   * 解散指定的標籤。所有 Target 與此標籤的綁定關係都會被解除。系統也不會再保存此標籤。
   * @param {String} tag 要解散的標籤
   * @returns {Array<String|Object>} 已與指定標籤解除關聯的所有 Target 清單，找不到時傳回空陣列
   */
  dismiss(tag: string) {
    tag = tag.trim();
    let targetList = this._tagTargetListDict[tag];
    if (targetList) {
      targetList.forEach((target: string | Object) => {
        let tagList = this._getTargetTagList(target);
        if (this._tagTargetListDict[tag]) {
          removeFromList(tagList, tag);
        }
        this._removeEmptyTargetTagList(target);
        this.emit(
          new BindingsEvent(
            BindingsEvent.EVENT_TARGET_TAG_CHANGED,
            target,
            tagList
          )
        );
      });
      delete this._tagTargetListDict[tag];
      return targetList.slice();
    } else {
      return [];
    }
  }
  /**
   * Replace a tag with a new tag.
   * All targets associated with the original tag will be replaced with the new tag.
   * 取代標籤
   * 會將原本的標籤置換為新的指定標籤
   * @param tag 原有的標籤
   * @param newTag 置換後的新標籤
   * @returns 傳回已被取代的 target 清單
   */
  replace(tag: string, newTag: string): Array<string | Object> {
    tag = tag.trim();
    newTag = newTag.trim();
    let targetList = this.dismiss(tag);
    targetList.forEach((target: string | Object) => {
      this.bind(target, [newTag]);
    });
    return targetList;
  }
  /**
   * Get all tags in this Bindings object.
   * 傳回系統中的所有標籤清單
   * 這只限於有和 Target 綁定的標籤。任何未綁定的標籤不會被保存在系統的記錄中。
   * @returns {Array<String>}
   */
  tags() {
    return Object.keys(this._tagTargetListDict);
  }
  /**
   * Get all targets in this Bindings object.
   * 傳回系統中的所有 Target 清單
   * 這只限於有和標籤綁定的 Target。任何未綁定的 Target 不會被保存在系統的記錄中。
   * @returns {Array<String|Object>}
   */
  targets() {
    return this._getTargetList();
  }

  //PRIVATE
  _removeEmptyTagTargetList(tag: string) {
    let targetList = this._tagTargetListDict[tag];
    if (targetList && targetList.length <= 0) {
      delete this._tagTargetListDict[tag];
      return true;
    } else {
      return false;
    }
  }
  _removeEmptyTargetTagList(target: string | Object) {
    let tagList = this._getTargetTagList(target);
    if (tagList && tagList.length <= 0) {
      return this._setTargetTagList(target, null);
    } else {
      return false;
    }
  }
}

//檢查標籤清單是否合法
function checkTagListValid(tagList: Array<string>) {
  let newTagList: Array<string> = [];
  //檢查陣列元素型別
  tagList.forEach(function (tag, index) {
    if (typeof tag != "string") {
      throw new Error(
        `Invalid tag list. Element #${index} is not a String value`
      );
    }
    tag = tag.trim();
    if (tag == "") {
      throw new Error(
        "Invalid tag list. Element #" + index + " is an empty String"
      );
    }
    newTagList.push(tag);
  });
  return newTagList;
}
//從陣列移除指定元素
function removeFromList(array: Array<any>, item: any) {
  if (!Array.isArray(array)) {
    return;
  }
  let index = array.indexOf(item);
  if (index >= 0) {
    array.splice(index, 1);
    return true;
  }
  return false;
}
