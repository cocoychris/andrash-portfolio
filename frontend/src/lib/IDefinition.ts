import { FunctionComponent, SVGProps } from "react";
import { ReactComponent as PersonIcon } from "../assets/icons/person-svgrepo-com.svg";

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
export interface IDefGroup<T extends IDefinition> {
  [key: string]: T;
}
/**
 * A base interface for all frame definition groups.
 */
export interface IDefGroupDefault<T extends IDefinition> extends IDefGroup<T> {
  default: T;
}

// ## Character definitons ##
/**
 * Definition of a character frame.
 */
export interface ICharacterFrameDef {
  svg: FunctionComponent<SVGProps<SVGSVGElement>>;
}
/**
 * Definition of a character.
 */
export interface ICharacterDef extends IDefinition {
  isNPC: boolean; //NPCs (none character characters) can only be controlled by computer not character.
  frames: IDefGroupDefault<ICharacterFrameDef>;
}

// ## Item definitons ##
/**
 * Definition of an item frame.
 */
export interface IItemFrameDef {
  svg: FunctionComponent<SVGProps<SVGSVGElement>>;
}
/**
 * Definition of an item.
 */
export interface IItemDef {
  collectable: boolean;
  page: string | null;
  inFront: boolean; //If true, the item will be displayed in front of the character. If false, the item will be displayed behind the character.
  frames: IDefGroupDefault<IItemFrameDef>;
}

// ## Tile definitons ##
/**
 * Definition of a tile.
 */
export interface ITileDef extends IDefinition {
  bgColor: string | null;
  bgImage: string | null;
  fgImage: string | null;
  walkable: boolean;
}
