interface IAssetDict<T> {
  [key: string]: T;
}
type SVGComponent = FunctionComponent<React.SVGProps<SVGSVGElement>>;

import { FunctionComponent } from "react";
import { ReactComponent as PersonIcon } from "../icons/person-svgrepo-com.svg";
import { ReactComponent as HeartIcon } from "../icons/heart-solid-svgrepo-com.svg";
import { ReactComponent as SearchIcon } from "../icons/search-svgrepo-com.svg";
import { ReactComponent as GiftIcon } from "../icons/gift-svgrepo-com.svg";
import { ReactComponent as CartIcon } from "../icons/shopping-cart-svgrepo-com.svg";
import { ReactComponent as StarIcon } from "../icons/star-svgrepo-com.svg";
import { ReactComponent as ReactSVG } from "../icons/react.svg";
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
