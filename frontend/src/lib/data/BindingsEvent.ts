export default class BindingsEvent extends Event {
  /**
   * The event that is triggered when the tag list of a target object is changed.
   * 事件：Target 對應之 tag 清單已變更。
   * 參數：bindingTarget 和 tagList。
   */
  public static readonly EVENT_TARGET_TAG_CHANGED: string = "targetTagChanged";

  public targetObj: string | Object;
  public tagList: Array<string>;

  constructor(
    type: string,
    targetObj: string | Object,
    tagList: Array<string>
  ) {
    super(type);
    this.targetObj = targetObj;
    this.tagList = tagList;
  }
}
