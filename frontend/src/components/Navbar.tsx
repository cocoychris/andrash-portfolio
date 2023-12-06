import DropdownMenu, { IDropItemData } from "./DropdownMenu";
import React, { ReactNode, RefObject } from "react";
import "./Navbar.css";
import { applyDefault } from "../lib/data/util";

interface IProps {
  className?: string;
  data: Array<INavItemData>;
  multiSelect?: boolean;
  selectOnFocus?: boolean;
  deselectOnUnfocus?: boolean;
  selectedIDs?: Array<string>;
}
interface IState {
  focusedID: string | null;
  idSelectedMap: { [id: string]: boolean };
}

export default class Navbar extends React.Component<IProps, IState> {
  private itemRefDict: { [id: string]: RefObject<NavItem> } = {};
  private _selectOnFocus: boolean = true;
  private _deselectOnUnfocus: boolean = true;

  constructor(props: IProps) {
    super(props);
    this.props.selectOnFocus !== undefined &&
      (this._selectOnFocus = this.props.selectOnFocus);
    this.props.deselectOnUnfocus !== undefined &&
      (this._deselectOnUnfocus = this.props.deselectOnUnfocus);
    this.state = {
      focusedID: null,
      idSelectedMap: {},
    };
    // Build itemRefDict
    this.props.data.map((navItemData) => {
      let id = navItemData.id;
      if (this.itemRefDict[id]) {
        throw new Error(`Duplicated item id: ${id}`);
      }
      this.itemRefDict[id] = React.createRef<NavItem>();
    });
    // Set initial selection
    if (this.props.selectedIDs) {
      this.props.selectedIDs.forEach((id) => {
        if (!this.itemRefDict[id]) {
          throw new Error(`Invalid initial selected item id: ${id}`);
        }
        this.state.idSelectedMap[id] = true;
      });
    }
  }
  /**
   * Set focus to a specific item.
   * The focused item will be selected as well by default. To disable this behavior, pass false to the select parameter.
   * If the focused item has a menu, the menu will be opened.
   * When the item loses focus, the menu will be closed.
   */
  public focus(id: string, select: boolean = true) {
    if (!this.itemRefDict[id]) {
      return;
    }
    this.setState({
      focusedID: id,
    });
    if (select) {
      this.select(id);
    }
  }
  /**
   * Unfocus a specific item.
   * If the item is selected, it will be deselected as well by default. To disable this behavior, pass false to the deselect parameter.
   * If the item has a menu, the menu will be closed.
   * Pass null to clear any focus.
   * @param id
   * @param deselect
   * @returns
   */
  public unfocus(id?: string, deselect: boolean = true) {
    if (id && id !== this.state.focusedID) {
      return;
    }
    if (deselect && this.state.focusedID) {
      this.deselect(this.state.focusedID);
    }
    this.setState({
      focusedID: null,
    });
  }

  /**
   * Get the id of the focused item.
   * @returns
   */
  public getFocus(): string | null {
    return this.state.focusedID;
  }
  /**
   * Select items.
   * Will deselect all other items if multiSelect is false.
   */
  public select(...itemIDs: Array<string>) {
    if (itemIDs.length === 0) {
      return;
    }
    let newMap: { [id: string]: boolean };
    if (this.props.multiSelect) {
      newMap = { ...this.state.idSelectedMap };
    } else {
      newMap = {};
      itemIDs = [itemIDs[0]];
    }
    itemIDs.forEach((id) => {
      if (this.itemRefDict[id]) {
        newMap[id] = true;
      }
    });
    this.setState({
      idSelectedMap: newMap,
    });
  }
  /**
   * Deselect items.
   */
  public deselect(...itemIDs: Array<string>) {
    if (itemIDs.length === 0) {
      return;
    }
    let newMap: { [id: string]: boolean } = { ...this.state.idSelectedMap };
    itemIDs.forEach((id) => {
      delete newMap[id];
    });
    this.setState({
      idSelectedMap: newMap,
    });
  }
  /**
   * Clear selection.
   */
  public clearSelection() {
    this.setState({ idSelectedMap: {} });
  }
  /**
   * Check if an item is selected.
   */
  public isSelected(itemID: string): boolean {
    return !!this.state.idSelectedMap[itemID];
  }
  /**
   * Get the ids of all selected items.
   */
  public getSelectedIDs(): Array<string> {
    return Object.keys(this.state.idSelectedMap);
  }

  public render(): React.ReactNode {
    let className = "navbar";
    if (this.props.className) {
      className += " " + this.props.className;
    }
    return (
      <nav className={className}>
        <ul className="navbar-nav">
          {this.props.data.map((navItemData) => {
            let id = navItemData.id;
            return (
              <NavItem
                key={id}
                data={navItemData}
                isFocused={id === this.state.focusedID}
                isSelected={this.isSelected(id)}
                onFocusChange={(focus) => {
                  focus
                    ? this.focus(id, this._selectOnFocus)
                    : this.unfocus(id, this._deselectOnUnfocus);
                }}
                onSelectionChange={(select) => {
                  select ? this.select(id) : this.deselect(id);
                }}
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
  onClick?: (navItem: NavItem) => void | boolean; // boolean: true = select item, false = deselect item, undefined = auto
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
  isFocused: boolean;
  isSelected: boolean;
  onFocusChange: (focus: boolean) => void;
  onSelectionChange: (select: boolean) => void;
}

export class NavItem extends React.Component<INavItemProps> {
  public get isFocused(): boolean {
    return this.props.isFocused;
  }
  public set isFocused(focus: boolean) {
    this.props.onFocusChange(focus);
  }
  public get isSelected(): boolean {
    return this.props.isSelected;
  }
  public set isSelected(select: boolean) {
    this.props.onSelectionChange(select);
  }

  public render(): React.ReactNode {
    const { data, isSelected, isFocused, onFocusChange } = this.props;
    const { id, icon, onClick, menuData, isEnabled } = applyDefault(
      data,
      DEFAULT_DATA
    );
    let classList = [
      "icon-button",
      isEnabled ? "enabled" : "disabled",
      isFocused ? "focused" : "unfocused",
      isSelected ? "selected" : "unselected",
    ];
    return (
      <li className="nav-item">
        <a
          href="#"
          className={classList.join(" ")}
          onClick={() => {
            if (isEnabled) {
              let focus = onClick && onClick(this);
              focus = focus == undefined ? !isFocused : focus;
              if (focus !== isFocused) {
                onFocusChange(focus);
              }
            }
          }}
          draggable="false"
        >
          {icon}
        </a>
        {menuData && isFocused && (
          <DropdownMenu
            data={menuData}
            onClose={() => {
              setTimeout(() => {
                onFocusChange(false);
              }, 0);
            }}
          />
        )}
      </li>
    );
  }
}
