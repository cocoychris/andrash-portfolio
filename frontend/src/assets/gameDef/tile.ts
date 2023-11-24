import { IDefPack, ITileDef } from "../../lib/IDefinition";

const tiles: IDefPack<ITileDef> = {
  empty: {
    bgColor: null,
    bgImageID: null,
    fgImageID: null,
    walkable: true,
  },
  test1: {
    bgColor: "#ffffff",
    bgImageID: "TestSVG",
    fgImageID: "CalendarIcon",
    walkable: true,
  },
  test2: {
    bgColor: "#ffffff",
    bgImageID: "TestSVG",
    fgImageID: null,
    walkable: true,
  },
  blocked: {
    bgColor: "#ff6666",
    bgImageID: "CloseIcon",
    fgImageID: null,
    walkable: false,
  },
  gress: {
    bgColor: "#66dd66",
    bgImageID: null,
    fgImageID: null,
    walkable: true,
  },
  gress_home: {
    bgColor: "#66dd66",
    bgImageID: null,
    fgImageID: "HomeIcon",
    walkable: true,
  },
};

export default tiles;
