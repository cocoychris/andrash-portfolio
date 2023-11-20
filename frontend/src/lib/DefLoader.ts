import IDefinition, { IDefPack } from "./IDefinition";

// interface Dict<T> {
//   [key: string]: T;
// }

export default class DefLoader<T extends IDefinition> {
  // private _childDefLoaderDict: Dict<Dict<DefLoader<any>>>;
  private _defGroup: IDefPack<T>;

  constructor(defGroup: IDefPack<T>) {
    this._defGroup = defGroup;
    // this._childDefLoaderDict = {};
  }

  public getDef(name: string): T {
    let def = this._defGroup[name];
    if (!def) {
      throw new Error(`Unknown definition: ${name}`);
    }
    return { ...def };
  }

  // /**
  //  * A cool but unused feature.
  //  * Access child definition group with child definition loader.
  //  */
  // public child<T2 extends IDefinition>(name: string, childName: string): DefLoader<T2> {
  //   let def = this.getDef(name);
  //   let childDefGroup = def[childName];
  //   if (!childDefGroup) {
  //     throw new Error(`Unknown child definition: ${name}.${childName}`);
  //   }
  //   if (!this._childDefLoaderDict[name]) {
  //     this._childDefLoaderDict[name] = {};
  //   }
  //   let childDefLoader = this._childDefLoaderDict[name][childName];
  //   if (childDefLoader) {
  //     return childDefLoader;
  //   }
  //   childDefLoader = new DefLoader<T2>(childDefGroup);
  //   this._childDefLoaderDict[name][childName] = childDefLoader;
  //   return childDefLoader;
  // }
}
