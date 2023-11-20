import { IDefPack, ICharacterDef } from "../../lib/IDefinition";

const characters: IDefPack<ICharacterDef> = {
  pac_man: {
    isNPC: false,
    frames: {
      default: {
        svgID: "PersonIcon",
      },
      search: {
        svgID: "SearchIcon",
      },
      gift: {
        svgID: "GiftIcon",
      },
      cart: {
        svgID: "CartIcon",
      },
    },
  },
  ghost: {
    isNPC: false,
    frames: {
      default: {
        svgID: "HeartIcon",
      },
      search: {
        svgID: "SearchIcon",
      },
      gift: {
        svgID: "GiftIcon",
      },
      cart: {
        svgID: "CartIcon",
      },
    },
  },
};

export default characters;
