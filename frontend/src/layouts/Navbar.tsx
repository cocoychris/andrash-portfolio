import { ReactNode, useState } from "react";
import "./Navbar.css";
import { ReactComponent as MenuIcon } from "../assets/icons/menu-svgrepo-com.svg";
import { ReactComponent as BellIcon } from "../assets/icons/bell-svgrepo-com.svg";
import DropdownMenu from "../components/DropdownMenu";
import NavItem from "../layouts/NavItem";
import screenfull from "screenfull";

import { ReactComponent as RightIcon } from "../assets/icons/chevron-right-svgrepo-com.svg";
import { ReactComponent as CommentIcon } from "../assets/icons/comment-svgrepo-com.svg";
import { ReactComponent as LockIcon } from "../assets/icons/lock-svgrepo-com.svg";
import { ReactComponent as LeftIcon } from "../assets/icons/chevron-left-svgrepo-com.svg";
import { ReactComponent as PersonIcon } from "../assets/icons/person-svgrepo-com.svg";

export default function Navbar() {
  const [currentItemID, setCurrentItemID] = useState<string>("");
  function openFullscreen() {
    document.documentElement.requestFullscreen();
  }
  function onItemClick(itemID: string) {
    setCurrentItemID(itemID == currentItemID ? "" : itemID);
    if (itemID == "fullscreen" && screenfull.isEnabled) {
      if (screenfull.isFullscreen) {
        screenfull.exit();
      } else {
        screenfull.request();
      }
    }
  }

  const dropdownItems = [
    {
      label: "Main Menu Here",
      leftIcon: <PersonIcon />,
      rightIcon: null,
      onClick: () => {
        console.log("ITEM CLICKED!");
      },
      items: null,
    },
    {
      label: "Go Second Menu",
      leftIcon: <CommentIcon />,
      rightIcon: <RightIcon />,
      onClick: null,
      items: [
        {
          label: "GO BACK",
          leftIcon: <LeftIcon />,
          rightIcon: null,
          onClick: null,
          items: [],
        },
        {
          label: "SECOND MENU HERE",
          leftIcon: <LockIcon />,
          rightIcon: null,
          onClick: null,
          items: null,
        },
        {
          label: "SECOND MENU HERE",
          leftIcon: <LockIcon />,
          rightIcon: null,
          onClick: null,
          items: null,
        },
        {
          label: "GO THIRD MENU",
          leftIcon: <LockIcon />,
          rightIcon: <RightIcon />,
          onClick: null,
          items: [
            {
              label: "GO BACK",
              leftIcon: <LeftIcon />,
              rightIcon: null,
              onClick: null,
              items: [],
            },
            {
              label: "THIRD MENU HERE",
              leftIcon: <LockIcon />,
              rightIcon: null,
              onClick: null,
              items: null,
            },
            {
              label: "THIRD MENU HERE",
              leftIcon: <LockIcon />,
              rightIcon: null,
              onClick: null,
              items: null,
            },
          ],
        },
      ],
    },
  ];

  return (
    <nav className="navbar">
      <ul className="navbar-nav">
        <NavItem
          id="fullscreen"
          icon="👍"
          currentID={currentItemID}
          onClick={onItemClick}
        />
        <NavItem
          id="Menu1"
          icon="🥣"
          currentID={currentItemID}
          onClick={onItemClick}
        >
          <DropdownMenu items={dropdownItems} />
        </NavItem>
        <NavItem
          id="C"
          icon="🤩"
          currentID={currentItemID}
          onClick={onItemClick}
        />
        <NavItem
          id="D"
          icon={<MenuIcon />}
          currentID={currentItemID}
          onClick={onItemClick}
        >
          <DropdownMenu items={dropdownItems} />
        </NavItem>
        <NavItem
          id="E"
          icon={<BellIcon />}
          currentID={currentItemID}
          onClick={onItemClick}
        />
      </ul>
    </nav>
  );
}
