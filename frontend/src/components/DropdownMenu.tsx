import { ReactNode, useState, useEffect, useRef } from "react";
import { CSSTransition } from "react-transition-group";
import "./DropdownMenu.css";
import { applyDefault } from "../lib/data/util";
const LOCATION_SEPARATOR = "-";

export interface IDropItemDataProvider {
  id: string;
  get: (click: () => void) => IDropItemDataWithoutID;
}

export interface IDropItemData extends IDropItemDataWithoutID {
  id: string;
}

export interface IDropItemDataWithoutID {
  label: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  goBack?: boolean;
  onClick?: (isSelected: boolean) => void | boolean; // boolean: true = force select, false = force deselect, undefined = toggle
  menuData?: Array<IDropItemData | IDropItemDataProvider> | null;
  isEnabled?: boolean;
  get?: undefined;
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

interface IDropdownMenuProps {
  data: Array<IDropItemData>;
  onClose: () => void;
}

/*
 * This is a versatile dropdown menu component that can be used to create multi-level dropdown menus.
 * There is no limit to the maximum number of levels.
 * By passing an array of IDropItemData as `data` in props, a single-level dropdown menu can be created.
 * To add a sub-menu, simply add a `menuData` property to an IDropItemData object in the array.
 * To generate sub-menu items dynamically, pass an array of IDropItemDataProvider as `menuData` instead.
 */
export default function DropdownMenu(props: IDropdownMenuProps) {
  const { data: menuData, onClose } = props;
  const [currentMenuRoute, setCurrentMenuRoute] = useState<Array<string>>([]);
  const [prevMenuRoute, setPrevMenuRoute] = useState<Array<string>>([]);
  //進入下一層選單或回到上層  Entering next level or back to previous level.
  const [isEntering, setIsEntering] = useState<boolean>(false);
  //在選單元件 A/B 之間交替切換 Swithing between SubMenu Component A & B
  const [showMenuA, setShowMenuA] = useState<boolean>(true);
  //選單高度用於選單高度漸變動畫  Calculated dynamically for menu height transform animation.
  const [menuHeight, setMenuHeight] = useState<number | string>("");
  const menuARef = useRef<HTMLElement>(null);
  const menuBRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLElement>(null);
  const initialLeft = useRef<number>(0);

  function getMenuData(
    menuRoute: Array<string>
  ): Array<IDropItemData | IDropItemDataProvider> | null | undefined {
    let get = (
      menuData: Array<IDropItemData | IDropItemDataProvider> | undefined | null,
      index: number
    ): Array<IDropItemData | IDropItemDataProvider> | null | undefined => {
      let isEnd = index === menuRoute.length;
      if (isEnd) {
        return menuData;
      }
      if (!menuData) {
        return null;
      }
      let itemID = menuRoute[index];
      let itemDataOrProvider = menuData.find((itemDataOrProvider) => {
        return itemDataOrProvider.id === itemID;
      });
      if (!itemDataOrProvider) {
        return null;
      }
      let itemData = itemDataOrProvider.get
        ? { ...itemDataOrProvider.get(() => {}), id: itemDataOrProvider.id }
        : (itemDataOrProvider as IDropItemData);
      return get(itemData.menuData, index + 1);
    };
    return get(menuData, 0);
  }
  //選單跳轉控制函數們  Functions for menu nevigation
  function gotoMenu(id: string | null) {
    if (id === "") {
      throw new Error("id can't be empty string");
    }
    let isEntering = id !== null;
    let newMenuRoute: Array<string>;
    if (isEntering) {
      newMenuRoute = [...currentMenuRoute, id as string];
    } else {
      newMenuRoute = currentMenuRoute.slice(0, currentMenuRoute.length - 1);
    }
    let menuData = getMenuData(newMenuRoute);
    if (!menuData) {
      console.warn(
        `Menu data not found for route: ${newMenuRoute.join(
          LOCATION_SEPARATOR
        )}`
      );
      onClose();
      return;
    }
    setPrevMenuRoute(currentMenuRoute);
    setCurrentMenuRoute(newMenuRoute);
    setIsEntering(isEntering);
    setShowMenuA(!showMenuA);
  }
  function onItemSelect(itemData: IDropItemData) {
    if (itemData.goBack) {
      gotoMenu(null);
      return;
    }
    if (itemData.menuData && itemData.menuData.length > 0) {
      gotoMenu(itemData.id);
      return;
    }
    onClose();
  }

  //更新選單高度，以便在切換選單時，漸變選單高度  Calculate & update menu height for transform animation.
  useEffect(() => {
    window.addEventListener("resize", reposition);
    updateMenuHeight(showMenuA ? menuARef : menuBRef);
    if (dropdownRef.current) {
      initialLeft.current = dropdownRef.current?.offsetLeft;
    }
    reposition();
  }, []);

  function updateMenuHeight(ref: React.RefObject<HTMLElement>) {
    if (ref.current) {
      setMenuHeight(ref.current.offsetHeight);
    }
  }
  //防止選單超出視窗邊界  Preventing the menu from exceeding the border of the viewport.
  function reposition() {
    let dropdown = dropdownRef.current;
    if (!dropdown) {
      return;
    }
    let maxLeft =
      Math.min(window.outerWidth, window.innerWidth) -
      dropdown.clientWidth * 1.5;
    dropdown.style.left = `${Math.min(maxLeft, initialLeft.current)}px`;
    updateMenuHeight(showMenuA ? menuARef : menuBRef);
  }
  // Render Menu
  let currentMenuData = getMenuData(currentMenuRoute);
  let prevMenuData = getMenuData(prevMenuRoute);
  if (!currentMenuData || !prevMenuData) {
    onClose();
    return null;
  }
  //渲染 HTML 物件  Rendering HTML Elements
  return (
    <div
      className="dropdown"
      style={{ height: menuHeight }}
      ref={dropdownRef as any}
    >
      <CSSTransition
        in={showMenuA}
        unmountOnExit
        timeout={400}
        classNames="menu"
        onEnter={() => {
          updateMenuHeight(menuARef);
        }}
        nodeRef={menuARef}
      >
        <div
          ref={menuARef as any}
          className={isEntering ? "menu-moveLeft" : "menu-moveRight"}
        >
          <SubMenu
            key="menuA"
            menuData={showMenuA ? currentMenuData : prevMenuData}
            onItemSelect={onItemSelect}
            onUpdate={() => {
              showMenuA && updateMenuHeight(menuARef);
            }}
          />
        </div>
      </CSSTransition>

      <CSSTransition
        in={!showMenuA}
        unmountOnExit
        timeout={400}
        classNames="menu"
        onEnter={() => {
          updateMenuHeight(menuBRef);
        }}
        nodeRef={menuBRef}
      >
        <div
          ref={menuBRef as any}
          className={isEntering ? "menu-moveLeft" : "menu-moveRight"}
        >
          <SubMenu
            key="menuB"
            menuData={!showMenuA ? currentMenuData : prevMenuData}
            onItemSelect={onItemSelect}
            onUpdate={() => {
              !showMenuA && updateMenuHeight(menuBRef);
            }}
          />
        </div>
      </CSSTransition>
    </div>
  );
}

function SubMenu(props: {
  menuData: Array<IDropItemData | IDropItemDataProvider>;
  onItemSelect: (itemData: IDropItemData) => void;
  onUpdate: () => void;
}) {
  const { menuData, onItemSelect } = props;
  const [selectedID, setSelectedID] = useState<string | null>(null);

  useEffect(() => {
    props.onUpdate();
  }, [menuData]);

  function onItemClick(itemData: IDropItemData) {
    let { id, onClick } = itemData;
    let select = onClick && onClick(id === selectedID);
    // Force selection
    if (select === true) {
      setSelectedID(id);
      onItemSelect(itemData);
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
      onItemSelect(itemData);
    }
  }
  let propsList: Array<IMenuItemProps> = menuData.map((_data, index) => {
    let data: IDropItemData = _data.get
      ? { ..._data.get(() => onItemClick(data)), id: _data.id }
      : _data;
    data = applyDefault(data, DEFAULT_DATA);
    let props: IMenuItemProps = {
      key: data.id,
      data,
      isSelected: data.id === selectedID,
      onItemClick,
      isEnabled: data.isEnabled as boolean,
      isSelectable: Boolean(data.onClick || data.menuData || data.goBack),
      connectPrev: false,
      connectNext: false,
    };
    return props;
  });

  return (
    <>
      {propsList.map((props, index) => {
        // Update connection info
        let prevProps = propsList[index - 1];
        let nextProps = propsList[index + 1];
        props.connectPrev =
          prevProps &&
          props.isEnabled &&
          !props.isSelectable &&
          // Boolean(props.data.leftIcon) &&
          prevProps.isEnabled &&
          !prevProps.isSelectable;
        // &&
        // Boolean(prevProps.data.leftIcon);
        props.connectNext =
          nextProps &&
          props.isEnabled &&
          !props.isSelectable &&
          // Boolean(props.data.leftIcon) &&
          nextProps.isEnabled &&
          !nextProps.isSelectable;
        // &&
        // Boolean(nextProps.data.leftIcon);
        return <MenuItem {...props} />;
      })}
    </>
  );
}
interface IMenuItemProps {
  key: string;
  data: IDropItemData;
  isSelected: boolean;
  onItemClick: (data: IDropItemData) => void;
  isEnabled: boolean;
  isSelectable: boolean;
  connectPrev: boolean;
  connectNext: boolean;
}
function MenuItem(props: IMenuItemProps) {
  const {
    data,
    isSelected,
    onItemClick,
    isEnabled,
    isSelectable,
    connectPrev,
    connectNext,
  } = props;
  let classList = [
    "menu-item",
    isEnabled ? "enabled" : "disabled",
    isSelected ? "selected" : "unselected",
    isSelectable ? "selectable" : "unselectable",
  ];
  connectPrev && classList.push("connectPrev");
  connectNext && classList.push("connectNext");

  return (
    <a
      href={isEnabled ? "#" : undefined}
      className={classList.join(" ")}
      onClick={() => {
        if (isEnabled && isSelectable) {
          onItemClick(data);
        }
      }}
      draggable="false"
    >
      {data.leftIcon && <span className="icon-left">{data.leftIcon}</span>}
      {data.leftIcon ? (
        data.label
      ) : (
        <span className="standaloneText">{data.label}</span>
      )}
      {data.rightIcon && <span className="icon-right">{data.rightIcon}</span>}
    </a>
  );
}
