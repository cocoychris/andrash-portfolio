import { IChangeSummary } from "../DataHolder";
/**
 * Represents an event that occurs on a DataHolder instance.
 * @class DataHolderEvent
 */
export default class DataHolderEvent extends Event {
  /**
   * Will be triggered before the data is updated by calling DataHolder.getUpdate().
   * Will STILL be triggered if there is no change to update.
   */
  public static readonly WILL_GET_UPDATE: string = "willGetUpdate";
  /**
   * Will be triggered after the data is updated by calling DataHolder.getUpdate().
   * Will STILL be triggered if there is no change to update.
   */
  public static readonly DID_GET_UPDATE: string = "didGetUpdate";
  /**
   * Will be triggered before the data is updated by calling DataHolder.setUpdate().
   * Will STILL be triggered if there is no change to update.
   */
  public static readonly WILL_SET_UPDATE: string = "willSetUpdate";
  /**
   * Will be triggered after the data is updated by calling DataHolder.setUpdate().
   * Will STILL be triggered if there is no change to update.
   */
  public static readonly DID_SET_UPDATE: string = "didSetUpdate";
  /**
   * Will be triggered before the data is applied by calling DataHolder.apply().
   * Will NOT be triggered if there is no change to apply.
   */
  public static readonly WILL_APPLY: string = "willApply";
  /**
   * Will be triggered after the data is applied by calling DataHolder.apply().
   * Will NOT be triggered if there is no change to apply.
   */
  public static readonly DID_APPLY: string = "didApply";
  /**
   * Will be triggered before the data is dropped by calling DataHolder.drop().
   * Will NOT be triggered if there is no change to drop.
   */
  public static readonly WILL_DROP: string = "willDrop";
  /**
   * Will be triggered after the data is dropped by calling DataHolder.drop().
   * Will NOT be triggered if there is no change to drop.
   */
  public static readonly DID_DROP: string = "didDrop";

  private _changes: IChangeSummary | null;
  /**
   * The changes property indicates the changes that have been collected or sattled when the event is triggered.
   * This property is only available for DID_GET_UPDATE, DID_SET_UPDATE, DID_APPLY, and DID_DROP events.
   * Note that WILL_GET_UPDATE, WILL_SET_UPDATE, WILL_APPLY, and WILL_DROP events will not have the changes property as the data is still being edited by all the listeners.
   * To get the changes in those events, use DataHolder.getChanges() instead.
   */
  public get changes(): IChangeSummary | null {
    return this._changes;
  }

  constructor(type: string, changes?: IChangeSummary) {
    super(type);
    this._changes = changes || null;
  }
}
