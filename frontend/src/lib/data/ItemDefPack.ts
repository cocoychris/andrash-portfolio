import DefPack, {
  IDefPack,
  IDefinition,
  ISpriteFrameDef,
  IDefPackDefault,
  SVG_FRAME_FIELD_DEF,
} from "./DefPack";
import FieldDef, { IFieldDef } from "./FieldDef";

/**
 * Definition of an item.
 */
export interface IItemDef extends IDefinition {
  collectable: boolean;
  page: string | null;
  inFront: boolean; //If true, the item will be displayed in front of the character. If false, the item will be displayed behind the character.
  frames: IDefPackDefault<ISpriteFrameDef>;
  walkable: boolean;
}

const ITEM_FIELD_DEF: FieldDef<IItemDef> = new FieldDef(
  {
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
      walkable: {
        type: "boolean",
      },
    },
  },
  undefined as any,
  "itemDef"
);

export default class ItemDefPack extends DefPack<IItemDef> {
  constructor(defPack: IDefPack<IItemDef>) {
    super("item", defPack, ITEM_FIELD_DEF);
  }
}
