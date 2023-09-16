import { ReactElement, ReactNode, useState, useEffect, useRef } from "react";
import { CSSTransition } from "react-transition-group";
import "./index.css";
import SubMenu, { SubMenuProps } from "./SubMenu";
import { ItemData } from "./ItemData";

const LOCATION_SEPARATOR = "-";

interface Props {
  items: Array<ItemData>; //Contains the entire menu/item tree.
}
export default function DropdownMenu(props: Props) {
  //紀錄當前選單路徑  Location = The path to the current menu in the entire menu/item tree.
  const [currentLocation, setCurrentLocation] = useState<string>("0"); // "0" = Root
  //紀錄舊的選單路徑(用於離場動畫)  Old location for rendering the menu for exiting animation.
  const [prevLocation, setPrevLocation] = useState<string>("0"); // "0" = Root
  //進入下一層選單或回到上層  Entering next level or back to previous level.
  const [isEntering, setIsEntering] = useState<boolean>(false);
  //在選單元件 A/B 之間交替切換 Swithing between SubMenu Component A & B
  const [isMenuA, setIsMenuA] = useState<boolean>(true);
  //選單高度用於選單高度漸變動畫  Calculated dynamically for menu height transform animation.
  const [menuHeight, setMenuHeight] = useState<number | string>("");
  const menuARef = useRef<HTMLElement>(null);
  const menuBRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLElement>(null);

  //選單跳轉控制函數們  Functions for menu nevigation

  function gotoMenu(location: string, isEntering: boolean) {
    setPrevLocation(currentLocation);
    setCurrentLocation(location);
    setIsEntering(isEntering);
    setIsMenuA(!isMenuA);
  }
  function enterMenu(itemIndex: number) {
    let indexList = currentLocation.split(LOCATION_SEPARATOR);
    indexList.push(String(itemIndex));
    gotoMenu(indexList.join(LOCATION_SEPARATOR), true);
  }
  function exitMenu() {
    let indexList = currentLocation.split(LOCATION_SEPARATOR);
    gotoMenu(indexList.slice(0, -1).join(LOCATION_SEPARATOR), false);
  }
  function onItemSelect(itemIndex: number, itemData: ItemData) {
    if (!itemData.items) {
      return;
    }
    if (itemData.items.length == 0) {
      exitMenu();
    } else {
      enterMenu(itemIndex);
    }
  }
  function renderMenu(location: string): ReactNode {
    let items = props.items;
    let indexList = location.split(LOCATION_SEPARATOR);
    for (let level = 1; level < indexList.length; level++) {
      const itemIndex = Number(indexList[level]);
      let subItems = items[itemIndex].items;
      if (!subItems) {
        console.log("Menu not found at location: " + location);
        return <b>Menu not found</b>;
      }
      items = subItems;
    }
    return (
      <SubMenu items={items} onItemSelect={onItemSelect} location={location} />
    );
  }

  //更新選單高度，以便在切換選單時，漸變選單高度  Calculate & update menu height for transform animation.
  useEffect(() => {
    calcHeight(isMenuA ? menuARef : menuBRef);
    reposition();
  }, []);

  function calcHeight(ref: React.RefObject<HTMLElement>) {
    if (ref.current) {
      setMenuHeight(ref.current.offsetHeight);
    }
  }

  //防止選單超出視窗邊界  Preventing the menu from exceeding the border of the viewport.
  window.addEventListener("resize", reposition);
  function reposition() {
    let dropdown = dropdownRef.current;
    if (!dropdown) {
      return;
    }
    let minPosition = 480; //依據選單寬度，自動計算與視窗左側邊界的距離
    dropdown.style.left = "auto";
    let offsetRight = window.innerWidth - dropdown.offsetLeft;
    if (offsetRight < minPosition) {
      dropdown.style.left = `${window.innerWidth - minPosition}px`;
    }
  }
  //渲染 HTML 物件  Rendering HTML Elements
  return (
    <div
      className="dropdown"
      style={{ height: menuHeight }}
      ref={dropdownRef as any}
    >
      <CSSTransition
        in={isMenuA}
        unmountOnExit
        timeout={400}
        classNames="menu"
        onEnter={() => {
          calcHeight(menuARef);
        }}
        nodeRef={menuARef}
      >
        <div
          ref={menuARef as any}
          className={isEntering ? "menu-moveLeft" : "menu-moveRight"}
        >
          {renderMenu(isMenuA ? currentLocation : prevLocation)}
        </div>
      </CSSTransition>

      <CSSTransition
        in={!isMenuA}
        unmountOnExit
        timeout={400}
        classNames="menu"
        onEnter={() => {
          calcHeight(menuBRef);
        }}
        nodeRef={menuBRef}
      >
        <div
          ref={menuBRef as any}
          className={isEntering ? "menu-moveLeft" : "menu-moveRight"}
        >
          {renderMenu(!isMenuA ? currentLocation : prevLocation)}
        </div>
      </CSSTransition>
    </div>
  );
}
