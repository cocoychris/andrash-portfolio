import { IDefPack, IItemDef } from "../../lib/IDefinition";

let items: IDefPack<IItemDef> = {
  star: {
    collectable: true,
    page: null,
    inFront: false,
    frames: {
      default: {
        svgID: "StarIcon",
      },
    },
  },
  reactIcon: {
    collectable: true,
    page: null,
    inFront: true,
    frames: {
      default: {
        svgID: "ReactSVG",
      },
    },
  },
};

export default items;
