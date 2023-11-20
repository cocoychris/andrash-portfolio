import DropdownMenu, { IDropItemData } from "./DropdownMenu";
import { ReactNode, useState } from "react";
import "./Navbar.css";
import { applyDefault } from "../lib/data/util";

export default function Navbar(props: { data: Array<INavItemData> }) {
  const { data: itemDataList } = props;
  const [selectedID, setSelectedID] = useState<string | null>(null);

  function onItemClick(itemID: string, onClick: INavItemData["onClick"]) {
    let select = onClick && onClick(itemID === selectedID);
    // Force selection
    if (select === true) {
      setSelectedID(itemID);
      return;
    }
    // Force deselection
    if (select === false) {
      itemID === selectedID && setSelectedID(null);
      return;
    }
    // Toggle selection
    setSelectedID(itemID === selectedID ? null : itemID);
  }

  return (
    <nav className="navbar">
      <ul className="navbar-nav">
        {itemDataList.map((navItemData) => {
          let id = navItemData.id;
          return (
            <NavItem
              key={id}
              data={navItemData}
              isSelected={id === selectedID}
              onItemClick={onItemClick}
            />
          );
        })}
      </ul>
    </nav>
  );
}

export interface INavItemData {
  id: string;
  icon: ReactNode;
  onClick?: (isSelected: boolean) => void | boolean; // boolean: true = force select, false = force deselect, undefined = toggle
  isEnabled?: boolean;
  menuData?: Array<IDropItemData>;
}

const DEFAULT_DATA: INavItemData = {
  id: "",
  icon: null,
  onClick: undefined,
  isEnabled: true,
  menuData: undefined,
};

export function NavItem(props: {
  data: INavItemData;
  isSelected: boolean;
  onItemClick: (id: string, onClick: INavItemData["onClick"]) => void;
}) {
  const { data, isSelected, onItemClick } = props;
  const { id, icon, onClick, menuData, isEnabled } = applyDefault(
    data,
    DEFAULT_DATA
  );
  let classList = [
    "icon-button",
    isEnabled ? "enabled" : "disabled",
    isSelected ? "selected" : "unselected",
  ];
  return (
    <li className="nav-item">
      <a
        href="#"
        className={classList.join(" ")}
        onClick={() => {
          if (isEnabled) {
            onItemClick(id, onClick);
          }
        }}
      >
        {icon}
      </a>
      {menuData && isSelected && (
        <DropdownMenu
          data={menuData}
          onClose={() => {
            onItemClick(id, () => false);
          }}
        />
      )}
    </li>
  );
}
