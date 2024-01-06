import DefPack, { IDefPack, IDefinition } from "./DefPack";
import FieldDef from "./FieldDef";

export interface ISysObjDef extends IDefinition {
  svgName: string;
}

export const SYS_OBJ_KEY = Object.freeze({
  TARGET_BEACON: "targetBeacon",
});

const SYS_OBJ_FIELD_DEF: FieldDef<ISysObjDef> = new FieldDef(
  {
    type: "object",
    children: {
      svgName: {
        type: "string",
      },
    },
  },
  undefined as any,
  "sysObjDef"
);

export default class SysObjDefPack extends DefPack<ISysObjDef> {
  constructor(defPack: IDefPack<ISysObjDef>) {
    super("sysObj", defPack, SYS_OBJ_FIELD_DEF, Object.values(SYS_OBJ_KEY));
  }
}
