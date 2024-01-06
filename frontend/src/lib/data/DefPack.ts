// ## Base definitons ##

import FieldDef, { IFieldDef } from "./FieldDef";

/**
 * A base interface for all definitions.
 */
export interface IDefinition {
  [key: string]: any;
}
/**
 * A group of definitions.
 */
export interface IDefPack<T extends IDefinition> {
  [key: string]: T;
}
/**
 * A base interface for all frame definition groups.
 */
export interface IDefPackDefault<T extends IDefinition> extends IDefPack<T> {
  default: T;
}

/**
 * Definition a svg image frame.
 */
export interface ISpriteFrameDef {
  svgName?: string;
  imageName?: string;
}
/**
 * Field definition of a svg image frame.
 */
export const SVG_FRAME_FIELD_DEF: IFieldDef = {
  type: "object",
  children: {
    svgName: {
      type: "string",
      acceptUndefined: true,
    },
    imageName: {
      type: "string",
      acceptUndefined: true,
    },
  },
};
/**
 * Properties that should be treated as image names.
 * These images will be preloaded by the AssetPack class before the game starts.
 */
const IMAGE_KEY_SET: Set<string> = new Set([
  "bgImageName",
  "fgImageName",
  "imageName",
]);
/**
 * Properties that should be treated as svg names.
 * These svgs will be preloaded by the AssetPack class before the game starts.
 */
const SVG_KEY_SET: Set<string> = new Set(["svgName", "fgSVGName"]);

/**
 * A definition pack that holds a group of definitions of same type.
 */
export default abstract class DefPack<T extends IDefinition> {
  protected defPack: IDefPack<T>;

  /**
   * Get all definition types.
   */
  public readonly typeNames: Array<string>;
  /**
   * Get all svg names used in the definitions.
   * Any property name that ends with "svgName" (case insensitive) will be considered as a svg name.
   */
  public readonly svgNames: Array<string>;
  /**
   * Get all image names used in the definitions.
   */
  public readonly imageNames: Array<string>;

  constructor(
    defType: string,
    defPack: IDefPack<T>,
    fieldDef: FieldDef<T>,
    requiredKeys?: Array<string>
  ) {
    // Validate definition pack with field definition.
    for (let key in defPack) {
      let result = fieldDef.validate(defPack[key]);
      if (!result.isValid) {
        throw new Error(
          `Invalid ${defType} definition: ${key} - ${result.message}`
        );
      }
    }
    // Validate required keys.
    if (requiredKeys) {
      for (let key of requiredKeys) {
        if (!defPack[key]) {
          throw new Error(`Missing required ${defType} definition: ${key}`);
        }
      }
    }
    this.defPack = defPack;
    this.typeNames = Object.keys(defPack);
    this.svgNames = Array.from(this._getSVGNameSet(defPack));
    this.imageNames = Array.from(this._getImageNameSet(defPack));
  }
  /**
   * Get definition of specified type.
   * @param typeName Type name.
   * @returns Definition of specified type.
   */
  public get(typeName: string): T {
    let def = this.defPack[typeName];
    if (!def) {
      throw new Error(`Cannot find definition of type: ${typeName}`);
    }
    return { ...def };
  }

  private _getSVGNameSet(
    def: IDefinition,
    svgNameSet: Set<string> = new Set()
  ) {
    for (let key in def) {
      if (SVG_KEY_SET.has(key) && typeof def[key] === "string") {
        svgNameSet.add(def[key]);
      } else if (typeof def[key] === "object") {
        this._getSVGNameSet(def[key], svgNameSet);
      }
    }
    return svgNameSet;
  }

  private _getImageNameSet(
    def: IDefinition,
    imageNameSet: Set<string> = new Set()
  ) {
    for (let key in def) {
      if (IMAGE_KEY_SET.has(key) && typeof def[key] === "string") {
        imageNameSet.add(def[key]);
      } else if (typeof def[key] === "object") {
        this._getImageNameSet(def[key], imageNameSet);
      }
    }
    return imageNameSet;
  }
}
