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
  svgName: string;
}
/**
 * Definition of a character.
 */
export interface ICharacterDef extends IDefinition {
  isNPC: boolean; //NPCs (none character characters) can only be controlled by computer not character.
  frames: IDefPackDefault<ISpriteFrameDef>;
}
/**
 * Definition of an item.
 */
export interface IItemDef {
  collectable: boolean;
  page: string | null;
  inFront: boolean; //If true, the item will be displayed in front of the character. If false, the item will be displayed behind the character.
  frames: IDefPackDefault<ISpriteFrameDef>;
}
// ## Tile definitons ##
/**
 * Definition of a tile.
 */
export interface ITileDef extends IDefinition {
  bgColor: string | null;
  bgSVGName: string | null;
  fgSVGName: string | null;
  walkable: boolean;
}

export interface ISysObjDef extends IDefinition {
  svgName: string;
}

const SVG_FRAME_FIELD_DEF: IFieldDef = {
  type: "object",
  children: {
    svgName: {
      type: "string",
    },
  },
};

const CHARACTER_FIELD_DEF: FieldDef<ICharacterDef> = new FieldDef({
  type: "object",
  children: {
    isNPC: {
      type: "boolean",
    },
    frames: {
      type: "object",
      children: {
        default: SVG_FRAME_FIELD_DEF,
        searching: SVG_FRAME_FIELD_DEF,
        chasing: SVG_FRAME_FIELD_DEF,
        arrived: SVG_FRAME_FIELD_DEF,
      },
    },
  },
});

const ITEM_FIELD_DEF: FieldDef<IItemDef> = new FieldDef({
  type: "object",
  children: {
    collectable: {
      type: "boolean",
    },
    page: {
      type: "string",
      acceptNull: true,
    },
    inFront: {
      type: "boolean",
    },
    frames: {
      type: "object",
      children: {
        default: SVG_FRAME_FIELD_DEF,
      },
    },
  },
});

const TILE_FIELD_DEF: FieldDef<ITileDef> = new FieldDef({
  type: "object",
  children: {
    bgColor: {
      type: "string",
      acceptNull: true,
    },
    bgSVGName: {
      type: "string",
      acceptNull: true,
    },
    fgSVGName: {
      type: "string",
      acceptNull: true,
    },
    walkable: {
      type: "boolean",
    },
  },
});

export const SYS_OBJ_KEY = Object.freeze({
  TARGET_BEACON: "targetBeacon",
});
const SYS_OBJ_FIELD_DEF: FieldDef<ISysObjDef> = new FieldDef({
  type: "object",
  children: {
    svgName: {
      type: "string",
    },
  },
});

const SVG_KEY_DICT: { [key: string]: boolean } = {
  svgName: true,
  bgSVGName: true,
  fgSVGName: true,
};

/**
 * A definition pack that holds a group of definitions of same type.
 */
export default class DefPack<T extends IDefinition> {
  private static _allowNew = false;

  public static character(
    defPack: IDefPack<ICharacterDef>
  ): DefPack<ICharacterDef> {
    DefPack._allowNew = true;
    let instance = new DefPack<ICharacterDef>(
      "character",
      defPack,
      CHARACTER_FIELD_DEF
    );
    DefPack._allowNew = false;
    return instance;
  }

  public static item(defPack: IDefPack<IItemDef>): DefPack<IItemDef> {
    DefPack._allowNew = true;
    let instance = new DefPack<IItemDef>("item", defPack, ITEM_FIELD_DEF);
    DefPack._allowNew = false;
    return instance;
  }

  public static tile(defPack: IDefPack<ITileDef>): DefPack<ITileDef> {
    DefPack._allowNew = true;
    let instance = new DefPack<ITileDef>("tile", defPack, TILE_FIELD_DEF);
    DefPack._allowNew = false;
    return instance;
  }

  public static sysObj(defPack: IDefPack<ISysObjDef>): DefPack<ISysObjDef> {
    DefPack._allowNew = true;
    let instance = new DefPack<ISysObjDef>(
      "sysObj",
      defPack,
      SYS_OBJ_FIELD_DEF,
      Object.values(SYS_OBJ_KEY)
    );
    DefPack._allowNew = false;
    return instance;
  }

  private _defPack: IDefPack<T>;

  /**
   * Get all definition types.
   */
  public readonly typeNames: Array<string>;
  /**
   * Get all svg names used in the definitions.
   * Any property name that ends with "svgName" (case insensitive) will be considered as a svg name.
   */
  public readonly svgNames: Array<string>;

  constructor(
    defType: string,
    defPack: IDefPack<T>,
    fieldDef: FieldDef<T>,
    requiredKeys?: Array<string>
  ) {
    if (!DefPack._allowNew) {
      throw new Error(
        `Cannot create a new DefPack directly. Use static factory methods instead.`
      );
    }
    for (let key in defPack) {
      let result = fieldDef.validate(defPack[key]);
      if (!result.isValid) {
        throw new Error(
          `Invalid ${defType} definition: ${key} - ${result.message}`
        );
      }
    }
    if (requiredKeys) {
      for (let key of requiredKeys) {
        if (!defPack[key]) {
          throw new Error(`Missing required ${defType} definition: ${key}`);
        }
      }
    }
    this._defPack = defPack;
    this.typeNames = Object.keys(defPack);
    let svgNameSet = this._getSVGNameSet(defPack);
    this.svgNames = Array.from(svgNameSet);
  }
  /**
   * Get definition of specified type.
   * @param typeName Type name.
   * @returns Definition of specified type.
   */
  public get(typeName: string): T {
    let def = this._defPack[typeName];
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
      if (SVG_KEY_DICT[key] && typeof def[key] === "string") {
        svgNameSet.add(def[key]);
      } else if (typeof def[key] === "object") {
        this._getSVGNameSet(def[key], svgNameSet);
      }
    }
    return svgNameSet;
  }
}
