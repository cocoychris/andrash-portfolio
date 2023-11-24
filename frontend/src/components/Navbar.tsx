import DropdownMenu, { IDropItemData } from "./DropdownMenu";
import React, { ReactNode, RefObject } from "react";
import "./Navbar.css";
import { applyDefault } from "../lib/data/util";

interface IProps {
  data: Array<INavItemData>;
}
interface IState {
  selectedID: string | null;
}

export default class Navbar extends React.Component<IProps, IState> {
  private itemRefDict: { [id: string]: RefObject<NavItem> } = {};

  constructor(props: IProps) {
    super(props);
    this.state = {
      selectedID: null,
    };
    this._onItemClick = this._onItemClick.bind(this);
  }

  private _onItemClick(itemID: string, onClick: INavItemData["onClick"]) {
    let select = onClick && onClick(itemID === this.state.selectedID);
    // Force selection
    if (select === true) {
      this.setState({ selectedID: itemID });
      return;
    }
    // Force deselection
    if (select === false) {
      itemID === this.state.selectedID && this.setState({ selectedID: null });
      return;
    }
    // Toggle selection
    this.setState({
      selectedID: itemID === this.state.selectedID ? null : itemID,
    });
  }

  public render(): React.ReactNode {
    return (
      <nav className="navbar">
        <ul className="navbar-nav">
          {this.props.data.map((navItemData) => {
            let id = navItemData.id;
            if (!this.itemRefDict[id]) {
              this.itemRefDict[id] = React.createRef<NavItem>();
            }
            return (
              <NavItem
                key={id}
                data={navItemData}
                isSelected={id === this.state.selectedID}
                onItemClick={this._onItemClick}
                ref={this.itemRefDict[id]}
              />
            );
          })}
        </ul>
      </nav>
    );
  }
}

export interface INavItemData {
  id: string;
  icon: ReactNode;
  onClick?: (isSelected: boolean) => void | boolean; // boolean: true = force select, false = force deselect, undefined = toggle
  isEnabled?: boolean;
  menuData?: Array<IDropItemData> | null;
}

const DEFAULT_DATA: INavItemData = {
  id: "",
  icon: null,
  onClick: undefined,
  isEnabled: true,
  menuData: undefined,
};

interface INavItemProps {
  data: INavItemData;
  isSelected: boolean;
  onItemClick: (id: string, onClick: INavItemData["onClick"]) => void;
}

export class NavItem extends React.Component<INavItemProps> {
  public render(): React.ReactNode {
    const { data, isSelected, onItemClick } = this.props;
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
}
