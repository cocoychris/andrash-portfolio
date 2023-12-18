import DataHolder, { DataObject, IDidApplyEvent } from "./data/DataHolder";
import DataUpdater from "./data/DataUpdater";
import FieldDef from "./data/FieldDef";
import { randomInterger } from "./data/util";

const MAP_INFO_FIELD_DEF = new FieldDef<IMapInfo>({
  type: "object",
  children: {
    id: {
      type: "string",
      acceptUndefined: true,
    },
    name: {
      type: "string",
    },
    width: {
      type: "number",
    },
    height: {
      type: "number",
    },
  },
});

export interface IMapInfo extends DataObject {
  id?: string;
  name: string;
  width: number;
  height: number;
}

export default class MapInfo extends DataUpdater<IMapInfo> {
  public readonly width: number;
  public readonly height: number;

  public get id(): string {
    return this.data.id as string;
  }
  public set id(value: string) {
    this.data.id = convertToMapID(value);
  }

  public get name(): string {
    return this.data.name;
  }
  public set name(name: string) {
    this.data.name = name;
  }
  constructor(data: IMapInfo) {
    let result = MAP_INFO_FIELD_DEF.validate(data);
    if (!result.isValid) {
      throw new Error(`Invalid map info: ${result.message}`);
    }
    data.id = convertToMapID(data.id || generateMapID());
    super(data);
    this.width = data.width;
    this.height = data.height;
  }
}
function convertToMapID(value: string): string {
  return value.replace(/[\r\n\s\t]/g, "_");
}

function generateMapID(): string {
  return `M${Date.now().toString(36)}-${randomInterger(10000, 99999).toString(
    36
  )}`;
}
