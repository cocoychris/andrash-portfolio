import { ReactElement, ReactNode, useState, useEffect, useRef } from "react";
import { CSSTransition } from "react-transition-group";
import "./DropdownMenu.css";
import { applyDefault } from "../lib/data/util";
const LOCATION_SEPARATOR = "-";

export interface IDropItemData {
  id: string;
  label: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  goBack?: boolean;
  onClick?: (isSelected: boolean) => void | boolean; // boolean: true = force select, false = force deselect, undefined = toggle
  menuData?: Array<IDropItemData>;
  isEnabled?: boolean;
}
const DEFAULT_DATA: IDropItemData = {
  id: "",
  label: "",
  leftIcon: null,
  rightIcon: null,
  goBack: false,
  onClick: undefined,
  menuData: undefined,
  isEnabled: true,
};

export default function DropdownMenu(props: {
  data: Array<IDropItemData>;
  onClose: () => void;
}) {
  const { data: menuData, onClose } = props;
  const [currentMenuData, setCurrentMenuData] =
    useState<Array<IDropItemData>>(menuData); // "0" = Root
  const [prevMenuData, setPrevMenuData] =
    useState<Array<IDropItemData>>(menuData); // "0" = Root
  //進入下一層選單或回到上層  Entering next level or back to previous level.
  const [isEntering, setIsEntering] = useState<boolean>(false);
  //在選單元件 A/B 之間交替切換 Swithing between SubMenu Component A & B
  const [isMenuA, setIsMenuA] = useState<boolean>(true);
  //選單高度用於選單高度漸變動畫  Calculated dynamically for menu height transform animation.
  const [menuHeight, setMenuHeight] = useState<number | string>("");
  const menuARef = useRef<HTMLElement>(null);
  const menuBRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLElement>(null);
  const [menuDataList, setMenuDataList] = useState<Array<Array<IDropItemData>>>(
    [menuData]
  );

  //選單跳轉控制函數們  Functions for menu nevigation
  function gotoMenu(menuData: Array<IDropItemData>, isEntering: boolean) {
    setPrevMenuData(currentMenuData);
    setCurrentMenuData(menuData);
    setIsEntering(isEntering);
    setIsMenuA(!isMenuA);
  }
  function enterMenu(menuData: Array<IDropItemData>) {
    setMenuDataList([...menuDataList, menuData]);
    gotoMenu(menuData, true);
  }
  function exitMenu() {
    let newMenuDataList = menuDataList.slice();
    newMenuDataList.pop();
    setMenuDataList(newMenuDataList);
    if (newMenuDataList.length === 0) {
      onClose();
      return;
    }
    gotoMenu(newMenuDataList[newMenuDataList.length - 1], false);
  }
  function onItemSelect(data: IDropItemData) {
    if (data.goBack) {
      exitMenu();
      return;
    }
    if (data.menuData && data.menuData.length > 0) {
      enterMenu(data.menuData);
      return;
    }
    onClose();
  }
  function renderMenu(menuData: Array<IDropItemData>): ReactNode {
    return <SubMenu menuData={menuData} onItemSelect={onItemSelect} />;
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
          {renderMenu(isMenuA ? currentMenuData : prevMenuData)}
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
          {renderMenu(!isMenuA ? currentMenuData : prevMenuData)}
        </div>
      </CSSTransition>
    </div>
  );
}

function SubMenu(props: {
  menuData: Array<IDropItemData>;
  onItemSelect: (data: IDropItemData) => void;
}) {
  const { menuData, onItemSelect } = props;
  const [selectedID, setSelectedID] = useState<string | null>(null);

  function onItemClick(data: IDropItemData) {
    let { id, onClick } = data;
    let select = onClick && onClick(id === selectedID);
    // Force selection
    if (select === true) {
      setSelectedID(id);
      onItemSelect(data);
      return;
    }
    // Force deselection
    if (select === false) {
      id === selectedID && setSelectedID(null);
      return;
    }
    // Toggle selection
    if (id === selectedID) {
      setSelectedID(null);
    } else {
      setSelectedID(id);
      onItemSelect(data);
    }
  }

  return (
    <>
      {menuData.map((data) => {
        let id = data.id;
        return (
          <MenuItem
            key={`${id}`}
            data={data}
            isSelected={id === selectedID}
            onItemClick={onItemClick}
          />
        );
      })}
    </>
  );
}

function MenuItem(props: {
  data: IDropItemData;
  isSelected: boolean;
  onItemClick: (data: IDropItemData) => void;
}) {
  const { data, isSelected, onItemClick } = props;
  const { isEnabled } = applyDefault(data, DEFAULT_DATA);
  const isSelectable = data.onClick || data.menuData || data.goBack;
  let classList = [
    "menu-item",
    isEnabled ? "enabled" : "disabled",
    isSelected ? "selected" : "unselected",
    isSelectable ? "selectable" : "unselectable",
  ];
  return (
    <a
      href={isEnabled ? "#" : undefined}
      className={classList.join(" ")}
      onClick={() => {
        if (isEnabled && isSelectable) {
          onItemClick(data);
        }
      }}
    >
      {data.leftIcon && <span className="icon-left">{data.leftIcon}</span>}
      {data.label}
      {data.rightIcon && <span className="icon-right">{data.rightIcon}</span>}
    </a>
  );
}
