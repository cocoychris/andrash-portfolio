interface IAssetDict<T> {
  [key: string]: T;
}
export type SVGComponent = FunctionComponent<React.SVGProps<SVGSVGElement>>;

import { FunctionComponent } from "react";
import { ReactComponent as PersonIcon } from "../icons/person-svgrepo-com.svg";
import { ReactComponent as HeartIcon } from "../icons/heart-solid-svgrepo-com.svg";
import { ReactComponent as SearchIcon } from "../icons/search-svgrepo-com.svg";
import { ReactComponent as GiftIcon } from "../icons/gift-svgrepo-com.svg";
import { ReactComponent as CartIcon } from "../icons/shopping-cart-svgrepo-com.svg";
import { ReactComponent as StarIcon } from "../icons/star-svgrepo-com.svg";
import { ReactComponent as ReactSVG } from "../icons/react.svg";
import { ReactComponent as GhostStanding } from "../svgs/ghost_standing.svg";
import { ReactComponent as GhostSearching } from "../svgs/ghost_searching.svg";
import { ReactComponent as GhostChasing } from "../svgs/ghost_chasing.svg";
import { ReactComponent as GhostArrived } from "../svgs/ghost_arrived.svg";
import { ReactComponent as PacManStanding } from "../svgs/pacMan_standing.svg";
import { ReactComponent as PacManSearching } from "../svgs/pacMan_searching.svg";
import { ReactComponent as PacManChasing } from "../svgs/pacMan_chasing.svg";
import { ReactComponent as PacManArrived } from "../svgs/pacMan_arrived.svg";

import TestSVG from "../icons/test.svg";
import CalendarIcon from "../icons/calendar-svgrepo-com.svg";
import CloseIcon from "../icons/close-svgrepo-com.svg";
import HomeIcon from "../icons/home-svgrepo-com.svg";

const SVG_DICT: IAssetDict<SVGComponent> = {
  PersonIcon,
  HeartIcon,
  SearchIcon,
  GiftIcon,
  CartIcon,
  StarIcon,
  ReactSVG,
  GhostStanding,
  GhostSearching,
  GhostChasing,
  GhostArrived,
  PacManStanding,
  PacManSearching,
  PacManChasing,
  PacManArrived,
};
const IMAGE_DICT: IAssetDict<string> = {
  TestSVG,
  CalendarIcon,
  CloseIcon,
  HomeIcon,
} as IAssetDict<string>;
export default {
  svg: (key: string): SVGComponent => {
    let svg = SVG_DICT[key];
    if (!svg) {
      throw new Error(`SVG asset not found: ${key}`);
    }
    return svg;
  },
  image: (key: string): string => {
    let image = IMAGE_DICT[key];
    if (!image) {
      throw new Error(`Image asset not found: ${key}`);
    }
    return image;
  },
};
