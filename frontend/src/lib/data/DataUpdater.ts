import DataHolder from "./DataHolder";
import { IIndexable } from "./util";

export interface IUpdatePhase {
  phase: string;
  props: IIndexable | null;
}

interface IPhaseCallbackDict {
  [phase: string]: Array<(props: IIndexable | null) => void>;
}

export default class DataUpdater<T extends IIndexable> extends DataHolder<T> {
  private _updatePhase: string = "";
  private _phaseCallbackDict: IPhaseCallbackDict = {};
  private _allUpdateCallbackList: Array<
    (phase: string, props: IIndexable | null) => void
  > = [];
  /**
   * The current update phase.
   */
  public get updatePhase(): string {
    return this._updatePhase;
  }
  /**
   * Trigger an update of the specified phase.
   * The update will be propagated to all children that are DataUpdater.
   * @param phase
   * @param props
   */
  public update<P extends IUpdatePhase>(
    phase: P["phase"],
    props: P["props"] = null
  ) {
    // Update children
    Object.values(this.children).forEach((child) => {
      if (child instanceof DataUpdater) {
        child.update(phase, props);
      }
    });
    // Update self
    let updated = false;
    let callbackList = this._phaseCallbackDict[phase];
    if (callbackList) {
      for (let callback of callbackList) {
        callback(props);
        updated = true;
      }
    }
    for (let callback of this._allUpdateCallbackList) {
      callback(phase, props);
      updated = true;
    }
    if (updated) {
      this._updatePhase = phase;
    }
  }
  /**
   * Set a callback for all update phases.
   * @param callback
   */
  public onAllUpdate(
    callback: (phase: string, props: IIndexable | null) => void
  ) {
    this._allUpdateCallbackList.push(callback);
  }

  /**
   * Set a callback for specified update phase.
   */
  protected onUpdate<P extends IUpdatePhase>(
    phase: P["phase"],
    callback: (props: P["props"]) => void
  ): void {
    let callbackList = this._phaseCallbackDict[phase];
    if (!callbackList) {
      callbackList = [];
      this._phaseCallbackDict[phase] = callbackList;
    }
    callbackList.push(callback);
  }
  //  The following methods may not be needed as the parent DataUpdater will update all children automatically.
  // /**
  //  * Forward the update to another DataUpdater.
  //  */
  // protected forwardUpdate<P extends IUpdatePhase>(
  //   phase: P["phase"],
  //   target: DataUpdater<any>
  // ) {
  //   this.onUpdate(phase, (props: P["props"]) => {
  //     target.update(phase, props);
  //   });
  // }
  // /**
  //  * Forward all update to another DataUpdater.
  //  * @param target
  //  */
  // protected forwardAllUpdate(target: DataUpdater<any>) {
  //   this.onAllUpdate((phase: string, props: IIndexable | null) => {
  //     target.update(phase, props);
  //   });
  // }
}
