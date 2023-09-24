import TestSVG from "../assets/test.svg";
import CalendarIcon from "../assets/icons/calendar-svgrepo-com.svg";
import CloseIcon from "../assets/icons/close-svgrepo-com.svg";
import HomeIcon from "../assets/icons/home-svgrepo-com.svg";
import { IDefGroup, ITileDef } from "../lib/IDefinition";

const tiles: IDefGroup<ITileDef> = {
  empty: {
    bgColor: null,
    bgImage: null,
    fgImage: null,
    walkable: true,
  },
  empty_blocked: {
    bgColor: null,
    bgImage: CloseIcon,
    fgImage: null,
    walkable: false,
  },
  test1: {
    bgColor: "#ffffff",
    bgImage: TestSVG,
    fgImage: CalendarIcon,
    walkable: true,
  },
  test2: {
    bgColor: "#ffffff",
    bgImage: TestSVG,
    fgImage: null,
    walkable: true,
  },
  blocked: {
    bgColor: "#ff6666",
    bgImage: CloseIcon,
    fgImage: null,
    walkable: false,
  },
  gress: {
    bgColor: "#66dd66",
    bgImage: null,
    fgImage: null,
    walkable: true,
  },
  gress_home: {
    bgColor: "#66dd66",
    bgImage: null,
    fgImage: HomeIcon,
    walkable: true,
  },
};

export default tiles;
