import { ReactNode, useState } from "react";
import Alert from "./components/Alert";
import Button from "./components/Button";
import Navbar from "./layouts/Navbar";
import NavItem from "./layouts/NavItem";
import axios from "axios";
import "./App.css";
import { ReactComponent as MenuIcon } from "./assets/icons/menu-svgrepo-com.svg";
import { ReactComponent as BellIcon } from "./assets/icons/bell-svgrepo-com.svg";
import DropdownMenu from "./layouts/DropdownMenu";
import SubMenu from "./layouts/SubMenu";
import MenuItem from "./layouts/MenuItem";

import { ReactComponent as RightIcon } from "./assets/icons/chevron-right-svgrepo-com.svg";
import { ReactComponent as CommentIcon } from "./assets/icons/comment-svgrepo-com.svg";
import { ReactComponent as LockIcon } from "./assets/icons/lock-svgrepo-com.svg";
import { ReactComponent as LeftIcon } from "./assets/icons/chevron-left-svgrepo-com.svg";
import { ReactComponent as PersonIcon } from "./assets/icons/person-svgrepo-com.svg";

function App() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertContent, setAlertContent] = useState<ReactNode>(<>HI</>);
  function renderAlert() {
    return (
      alertVisible && (
        <Alert
          onClose={() => {
            setAlertVisible(false);
          }}
        >
          {alertContent}
        </Alert>
      )
    );
  }
  function alert(content: ReactNode) {
    setAlertContent(content);
    setAlertVisible(true);
  }
  const items = [
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
    <>
      {renderAlert()}
      <Navbar>
        <NavItem icon="🥣">
          <DropdownMenu items={items} />
        </NavItem>
        <NavItem icon="👍" />
        <NavItem icon="🤩" />
        <NavItem icon={<MenuIcon />}>
          <DropdownMenu items={items} />
        </NavItem>
        <NavItem icon={<BellIcon />} />
      </Navbar>
      <Button
        onClick={() => {
          alert(<>HELLO WORLD {Math.floor(Math.random() * 10)}</>);
        }}
      >
        Click Me
      </Button>
    </>
  );
}
export default App;
