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
  return (
    <>
      {renderAlert()}
      <Navbar>
        <NavItem icon="🥣">
          <DropdownMenu></DropdownMenu>
        </NavItem>
        <NavItem icon="👍" />
        <NavItem icon="🤩" />
        <NavItem icon={<MenuIcon />} />
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
