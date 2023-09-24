import { ReactComponent as PersonIcon } from "../assets/icons/person-svgrepo-com.svg";
import { ReactComponent as SearchIcon } from "../assets/icons/search-svgrepo-com.svg";
import { ReactComponent as GiftIcon } from "../assets/icons/gift-svgrepo-com.svg";
import { ReactComponent as CartIcon } from "../assets/icons/shopping-cart-svgrepo-com.svg";
import { IDefGroup, ICharacterDef } from "../lib/IDefinition";

const characters: IDefGroup<ICharacterDef> = {
  pac_man: {
    isNPC: false,
    frames: {
      default: {
        svg: PersonIcon,
      },
      search: {
        svg: SearchIcon,
      },
      gift: {
        svg: GiftIcon,
      },
      cart: {
        svg: CartIcon,
      },
    },
  },
  ghost: {
    isNPC: false,
    frames: {
      default: {
        svg: PersonIcon,
      },
      second: {
        svg: PersonIcon,
      },
    },
  },
};

export default characters;
