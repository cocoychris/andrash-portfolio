// ## Base definitons ##
/**
 * A base interface for all definitions.
 */
export default interface IDefinition {
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

// ## Character definitons ##
/**
 * Definition of a character frame.
 */
export interface ICharacterFrameDef {
  // svg: FunctionComponent<SVGProps<SVGSVGElement>>;
  svgID: string;
}
/**
 * Definition of a character.
 */
export interface ICharacterDef extends IDefinition {
  isNPC: boolean; //NPCs (none character characters) can only be controlled by computer not character.
  frames: IDefPackDefault<ICharacterFrameDef>;
}

// ## Item definitons ##
/**
 * Definition of an item frame.
 */
export interface IItemFrameDef {
  // svg: FunctionComponent<SVGProps<SVGSVGElement>>;
  svgID: string;
}
/**
 * Definition of an item.
 */
export interface IItemDef {
  collectable: boolean;
  page: string | null;
  inFront: boolean; //If true, the item will be displayed in front of the character. If false, the item will be displayed behind the character.
  frames: IDefPackDefault<IItemFrameDef>;
}

// ## Tile definitons ##
/**
 * Definition of a tile.
 */
export interface ITileDef extends IDefinition {
  bgColor: string | null;
  bgImageID: string | null;
  fgImageID: string | null;
  walkable: boolean;
}
