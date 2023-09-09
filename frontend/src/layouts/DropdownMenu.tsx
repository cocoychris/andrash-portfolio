import { ReactNode, useState, useEffect, useRef, Ref } from "react";
import { ReactComponent as RightIcon } from "../assets/icons/chevron-right-svgrepo-com.svg";
import { ReactComponent as CommentIcon } from "../assets/icons/comment-svgrepo-com.svg";
import { ReactComponent as LockIcon } from "../assets/icons/lock-svgrepo-com.svg";
import { ReactComponent as LeftIcon } from "../assets/icons/chevron-left-svgrepo-com.svg";
import { ReactComponent as PersonIcon } from "../assets/icons/person-svgrepo-com.svg";
import { CSSTransition } from "react-transition-group";

export default function DropdownMenu() {
  interface Prop {
    children: ReactNode;
    gotoMenu?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  }

  const [activeMenu, setActiveMenu] = useState("main");
  const [menuHeight, setMenuHeight] = useState<number | string>("");
  const nodeRef1 = useRef<HTMLElement>(null);
  const nodeRef2 = useRef<HTMLElement>(null);

  useEffect(() => {
    console.log("useEffect");
    calcHeight(nodeRef1);
  }, []);

  function calcHeight(ref: React.RefObject<HTMLElement>) {
    if (ref.current) {
      setMenuHeight(ref.current.offsetHeight);
      console.log(ref.current.offsetHeight);
    }
  }

  function DropdownItem(props: Prop) {
    return (
      <a
        href="#"
        className="menu-item"
        onClick={() => props.gotoMenu && setActiveMenu(props.gotoMenu)}
      >
        <span className="icon-button">{props.leftIcon}</span>
        {props.children}
        <span className="icon-right">{props.rightIcon}</span>
      </a>
    );
  }

  return (
    <div className="dropdown" style={{ height: menuHeight }}>
      <CSSTransition
        in={activeMenu == "main"}
        unmountOnExit
        timeout={500}
        classNames="menu-primary"
        onEnter={() => {
          calcHeight(nodeRef1);
        }}
        nodeRef={nodeRef1}
      >
        <div ref={nodeRef1 as any} className="menu">
          <DropdownItem leftIcon={<PersonIcon />}>Main Menu Here</DropdownItem>
          <DropdownItem
            leftIcon={<CommentIcon />}
            rightIcon={<RightIcon />}
            gotoMenu="settings"
          >
            Go Second Menu
          </DropdownItem>
        </div>
      </CSSTransition>

      <CSSTransition
        in={activeMenu == "settings"}
        unmountOnExit
        timeout={500}
        classNames="menu-secondary"
        onEnter={() => {
          calcHeight(nodeRef2);
        }}
        nodeRef={nodeRef2}
      >
        <div ref={nodeRef2 as any} className="menu">
          <DropdownItem leftIcon={<LeftIcon />} gotoMenu="main">
            GO BACK
          </DropdownItem>
          <DropdownItem leftIcon={<LockIcon />}>SECOND MENU HERE</DropdownItem>
          <DropdownItem leftIcon={<LockIcon />}>SECOND MENU HERE</DropdownItem>
          <DropdownItem leftIcon={<LockIcon />}>SECOND MENU HERE</DropdownItem>
        </div>
      </CSSTransition>
    </div>
  );
}
