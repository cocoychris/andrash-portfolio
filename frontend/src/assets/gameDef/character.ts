import { IDefPack, ICharacterDef } from "../../lib/IDefinition";

const characters: IDefPack<ICharacterDef> = {
  pac_man: {
    isNPC: false,
    frames: {
      default: {
        svgID: "PacManStanding",
      },
      searching: {
        svgID: "PacManSearching",
      },
      chasing: {
        svgID: "PacManChasing",
      },
      arrived: {
        svgID: "PacManArrived",
      },
    },
  },
  ghost: {
    isNPC: false,
    frames: {
      default: {
        svgID: "GhostStanding",
      },
      searching: {
        svgID: "GhostSearching",
      },
      chasing: {
        svgID: "GhostChasing",
      },
      arrived: {
        svgID: "GhostArrived",
      },
    },
  },
};

export default characters;
