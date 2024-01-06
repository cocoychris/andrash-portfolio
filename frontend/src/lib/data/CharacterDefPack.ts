import DefPack, {
  IDefPack,
  IDefinition,
  ISpriteFrameDef,
  IDefPackDefault,
  SVG_FRAME_FIELD_DEF,
} from "./DefPack";
import FieldDef from "./FieldDef";

/**
 * Definition of a character.
 */
export interface ICharacterDef extends IDefinition {
  isNPC: boolean; //NPCs (none character characters) can only be controlled by computer not character.
  frames: IDefPackDefault<ISpriteFrameDef>;
}

const CHARACTER_FIELD_DEF: FieldDef<ICharacterDef> = new FieldDef(
  {
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
  },
  undefined as any,
  "characterDef"
);

export default class CharacterDefPack extends DefPack<ICharacterDef> {
  constructor(defPack: IDefPack<ICharacterDef>) {
    super("character", defPack, CHARACTER_FIELD_DEF);
  }
}
