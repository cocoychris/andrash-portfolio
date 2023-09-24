import { ReactComponent as StarIcon } from "../assets/icons/star-svgrepo-com.svg";
import { ReactComponent as ReactSVG } from "../assets/react.svg";
import { IDefGroup, IItemDef } from "../lib/IDefinition";

let items: IDefGroup<IItemDef> = {
  star: {
    collectable: true,
    page: null,
    inFront: false,
    frames: {
      default: {
        svg: StarIcon,
      },
    },
  },
  reactIcon: {
    collectable: true,
    page: null,
    inFront: true,
    frames: {
      default: {
        svg: ReactSVG,
      },
    },
  },
};

export default items;
