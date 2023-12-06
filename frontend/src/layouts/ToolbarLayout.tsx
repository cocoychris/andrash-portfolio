import ASSET_MAP, { SVGComponent } from "../assets/gameDef/asset";
import {
  Component,
  ReactNode,
  RefObject,
  createRef,
  useEffect,
  useRef,
  useState,
} from "react";
import GameClient, { IDidNewGameEvent } from "../lib/GameClient";
import Navbar, { INavItemData } from "../components/Navbar";
import {
  IDropItemDataProvider,
  IDropItemData,
} from "../components/DropdownMenu";
import screenfull from "screenfull";
import { ReactComponent as MenuIcon } from "../assets/icons/menu-svgrepo-com.svg";
import { ReactComponent as BellIcon } from "../assets/icons/bell-svgrepo-com.svg";
import { ReactComponent as RightIcon } from "../assets/icons/chevron-right-svgrepo-com.svg";
import { ReactComponent as CommentIcon } from "../assets/icons/comment-svgrepo-com.svg";
import { ReactComponent as LockIcon } from "../assets/icons/lock-svgrepo-com.svg";
import { ReactComponent as LeftIcon } from "../assets/icons/chevron-left-svgrepo-com.svg";
import { ReactComponent as PersonIcon } from "../assets/icons/person-svgrepo-com.svg";
import { ReactComponent as PeopleIcon } from "../assets/icons/people-svgrepo-com.svg";
import { ReactComponent as HomeIcon } from "../assets/icons/home-svgrepo-com.svg";
import { ReactComponent as LinkIcon } from "../assets/icons/link-svgrepo-com.svg";
import { ReactComponent as GiftIcon } from "../assets/icons/gift-svgrepo-com.svg";
import { ReactComponent as PencilIcon } from "../assets/icons/pencil-svgrepo-com.svg";
import AnyEvent from "../lib/events/AnyEvent";
import { IDidApplyEvent, IDidSetUpdateEvent } from "../lib/DataHolder";
import Game, { IActionPhase } from "../lib/Game";
import PopupLayout from "./PopupLayout";
import Editor, {
  IDidLoadMapEvent,
  IDisposeMapEvent,
  ITileSelectEvent,
  IToolChangeEvent,
  IToolData,
} from "../lib/Editor";
import TileDisplay from "../components/game/TileDisplay";
import Tile, {
  ICharacterAddedEvent,
  ICharacterRemovedEvent,
  IItemAddedEvent,
  IItemRemovedEvent,
  ITileData,
} from "../lib/Tile";
import Position from "../lib/Position";
import "./ToolbarLayout.css";
import Character, { ICharacterData } from "../lib/Character";
import CharacterDisplay from "../components/game/CharacterDisplay";
import CharacterGroup from "../lib/CharacterGroup";
import { IGroupData } from "../lib/Group";
import Item, { IRepositionEvent } from "../lib/Item";
import Player from "../lib/Player";
import { IIndexable, applyDefault } from "../lib/data/util";
import FieldDef from "../lib/data/FieldDef";
import { IWillDestroyEvent } from "../lib/Destroyable";

interface IProps {
  gameClient: GameClient;
  popupRef: React.RefObject<PopupLayout>;
  // onRunServerGame: (mapID: string) => void;
  // onRunLocalGame: (mapID: string) => void;
}
interface IState extends IToolData {
  game: Game | null;
}

export default class ToolbarLayout extends Component<IProps, IState> {
  private _gameClient: GameClient;
  private _editor: Editor;
  private _navbarRef: React.RefObject<Navbar> = createRef<Navbar>();

  private get _popupRef(): RefObject<PopupLayout> {
    return this.props.popupRef;
  }

  constructor(props: IProps) {
    console.log("ToolbarLayout.constructor");
    super(props);
    this._gameClient = props.gameClient;
    if (!props.gameClient.editor) {
      throw new Error("ToolbarLayout requires an editor");
    }
    this._editor = props.gameClient.editor;
    this._onDidLoadMap = this._onDidLoadMap.bind(this);
    this._onToolChange = this._onToolChange.bind(this);
    this._onObjectApply = this._onObjectApply.bind(this);
    this._onTileSelect = this._onTileSelect.bind(this);
    this.state = {
      game: this._editor.game,
      ...this._editor.getToolData(),
    };
  }

  public componentDidMount(): void {
    console.log("ToolbarLayout.componentDidMount");
    this._editor.on<IDidLoadMapEvent>("didLoadMap", this._onDidLoadMap);
    this._editor.on<IDisposeMapEvent>("disposeMap", this._onDidLoadMap);
    this._editor.on<IToolChangeEvent>("toolChanged", this._onToolChange);
    this._editor.on<ITileSelectEvent>("tileSelect", this._onTileSelect);
  }

  public componentWillUnmount(): void {
    console.log("ToolbarLayout.componentWillUnmount");
    this._editor.off<IDidLoadMapEvent>("didLoadMap", this._onDidLoadMap);
    this._editor.off<IDisposeMapEvent>("disposeMap", this._onDidLoadMap);
    this._editor.off<IToolChangeEvent>("toolChanged", this._onToolChange);
    this._editor.off<ITileSelectEvent>("tileSelect", this._onTileSelect);
    let game = this.state.game;
    if (game) {
      game.playerGroup.forEach((player: Player) => {
        player.off<IDidApplyEvent>("didApply", this._onObjectApply);
        player.character.off<IDidApplyEvent>("didApply", this._onObjectApply);
      });
      game.map.off<IDidApplyEvent>("didApply", this._onObjectApply);
    }
  }

  private _onDidLoadMap() {
    // Clean up listeners for old game
    let game = this.state.game;
    if (game) {
      game.playerGroup.forEach((player: Player) => {
        player.off<IDidApplyEvent>("didApply", this._onObjectApply);
        player.character.off<IDidApplyEvent>("didApply", this._onObjectApply);
      });
      game.map.off<IDidApplyEvent>("didApply", this._onObjectApply);
    }
    // Handle new game
    game = this._editor.game;
    this.setState({
      game: game,
    });
    if (game) {
      game.playerGroup.forEach((player: Player) => {
        player.on<IDidApplyEvent>("didApply", this._onObjectApply);
        player.character.on<IDidApplyEvent>("didApply", this._onObjectApply);
      });
      game.map.on<IDidApplyEvent>("didApply", this._onObjectApply);
    }
  }
  private _onTileSelect(event: AnyEvent<ITileSelectEvent>) {
    if (event.data.prevTile) {
      event.data.prevTile.off<IDidApplyEvent>("didApply", this._onObjectApply);
      event.data.prevTile.characters.forEach((character: Character) => {
        character.off<IDidApplyEvent>("didApply", this._onObjectApply);
      });
      event.data.prevTile.items.forEach((item: Item) => {
        item.off<IDidApplyEvent>("didApply", this._onObjectApply);
      });
      event.data.prevTile.off<ICharacterAddedEvent>(
        "characterAdded",
        this._onTileAddObject
      );
      event.data.prevTile.off<ICharacterRemovedEvent>(
        "characterRemoved",
        this._onTileRemoveObject
      );
      event.data.prevTile.off<IItemAddedEvent>(
        "itemAdded",
        this._onTileAddObject
      );
      event.data.prevTile.off<IItemRemovedEvent>(
        "itemRemoved",
        this._onTileRemoveObject
      );
    }
    if (event.data.tile) {
      event.data.tile.on<IDidApplyEvent>("didApply", this._onObjectApply);
      event.data.tile.characters.forEach((character: Character) => {
        character.on<IDidApplyEvent>("didApply", this._onObjectApply);
      });
      event.data.tile.items.forEach((item: Item) => {
        item.on<IDidApplyEvent>("didApply", this._onObjectApply);
      });
      event.data.tile.on<ICharacterAddedEvent>(
        "characterAdded",
        this._onTileAddObject
      );
      event.data.tile.on<ICharacterRemovedEvent>(
        "characterRemoved",
        this._onTileRemoveObject
      );
      event.data.tile.on<IItemAddedEvent>("itemAdded", this._onTileAddObject);
      event.data.tile.on<IItemRemovedEvent>(
        "itemRemoved",
        this._onTileRemoveObject
      );
    }
  }
  private _onTileAddObject(
    event: AnyEvent<ICharacterAddedEvent | IItemAddedEvent>
  ) {
    let object =
      (event as AnyEvent<ICharacterAddedEvent>).data.character ||
      (event as AnyEvent<IItemAddedEvent>).data.item;
    object.on<IDidApplyEvent>("didApply", this._onObjectApply);
  }
  private _onTileRemoveObject(
    event: AnyEvent<ICharacterRemovedEvent | IItemRemovedEvent>
  ) {
    let object =
      (event as AnyEvent<ICharacterRemovedEvent>).data.character ||
      (event as AnyEvent<IItemRemovedEvent>).data.item;
    object.off<IDidApplyEvent>("didApply", this._onObjectApply);
  }

  private _onObjectApply() {
    console.log("ToolbarLayout._onObjectApply");
    this.forceUpdate();
  }

  private _onToolChange(event: AnyEvent<IToolChangeEvent>) {
    let toolType = event.data.toolType;
    this.setState({
      toolType: toolType,
      templateTile: event.data.templateTile,
      templateCharacter: event.data.templateCharacter,
      templateItem: event.data.templateItem,
      selectedPlayer: event.data.selectedPlayer,
    });
    if (toolType) {
      this._navbarRef.current?.select(toolType);
    } else {
      this._navbarRef.current?.clearSelection();
    }
  }

  render(): ReactNode {
    console.log("ToolbarLayout.render");
    const { gameClient } = this.props;
    let nevbarData: Array<INavItemData> = [
      {
        id: "fullscreen",
        icon: "🖥️",
        onClick: () => {
          screenfull.toggle();
          return false;
        },
        isEnabled: true,
      },
      {
        id: Editor.TOOL_TILE_SELECTOR,
        icon:
          this._editor.toolType == Editor.TOOL_TILE_SELECTOR &&
          this._editor.selectedTile
            ? "[👆]"
            : "👆",
        menuData: getSelectedTileMenu(this._editor, this._popupRef),
        isEnabled: this.state.game != null,
        onClick: () => {
          this._editor.setToolData({
            toolType: Editor.TOOL_TILE_SELECTOR,
            selectedPlayer: null,
          });
        },
      },
      {
        id: Editor.TOOL_PLAYER_PLACER,
        icon: this.state.selectedPlayer
          ? getPlayerDisplay(this.state.selectedPlayer)
          : "👤",
        menuData: getPlayersMenu(this._editor, this._popupRef),
        isEnabled: this.state.game != null,
        onClick: () => {
          this._editor.setToolData({
            toolType: Editor.TOOL_PLAYER_PLACER,
            selectedTile: null,
          });
        },
      },
      {
        id: Editor.TOOL_TILE_BRUSH,
        icon: this.state.templateTile
          ? getTileDisplay(this.state.templateTile)
          : "🧱",
        // menuData: this.state.tilesMenuData,
        menuData: getTilesMenu(this._editor),
        isEnabled: this.state.game != null,
        onClick: () => {
          this._editor.setToolData({
            toolType: Editor.TOOL_TILE_BRUSH,
            selectedPlayer: null,
            selectedTile: null,
          });
        },
      },
      {
        id: Editor.TOOL_CHARACTER_PLACER,
        icon: this.state.templateCharacter
          ? getCharacterDisplay(this.state.templateCharacter)
          : "🧑‍🤝‍🧑",
        menuData: getCharactersMenu(this._editor),
        isEnabled: this.state.game != null,
        onClick: () => {
          this._editor.setToolData({
            toolType: Editor.TOOL_CHARACTER_PLACER,
            selectedPlayer: null,
            selectedTile: null,
          });
        },
      },
      {
        id: Editor.TOOL_ITEM_PLACER,
        icon: this.state.templateItem
          ? getItemDisplay(this.state.templateItem)
          : "🎁",
        menuData: getItemsMenu(this._editor),
        isEnabled: this.state.game != null,
        onClick: () => {
          this._editor.setToolData({
            toolType: Editor.TOOL_ITEM_PLACER,
            selectedPlayer: null,
            selectedTile: null,
          });
        },
      },
      {
        id: "EditorMenu",
        icon: "🔧",
        menuData: getEditorMenu(gameClient, this._popupRef),
      },
    ];
    return (
      <Navbar
        className="toolbar"
        data={nevbarData}
        selectOnFocus={false}
        deselectOnUnfocus={false}
        selectedIDs={
          this._editor.toolType ? [this._editor.toolType] : undefined
        }
        ref={this._navbarRef}
      />
    );
  }
}

function getTilesMenu(editor: Editor): Array<IDropItemData> | null {
  return editor.templateTileList.map((tile: Tile) => {
    return {
      id: tile.type,
      label: tile.type,
      leftIcon: getTileDisplay(tile),
      onClick: () => {
        editor.setToolData({
          templateTile: tile,
          toolType: Editor.TOOL_TILE_BRUSH,
          selectedPlayer: null,
          selectedTile: null,
        });
        return true;
      },
    };
  });
}

function getCharactersMenu(editor: Editor): Array<IDropItemData> | null {
  let menuData: Array<IDropItemData> = [
    {
      id: "delete",
      label: "Character Remover",
      leftIcon: "🗑️",
      onClick: () => {
        editor.setToolData({
          templateCharacter: null,
          toolType: Editor.TOOL_CHARACTER_PLACER,
          selectedPlayer: null,
          selectedTile: null,
        });
        return true;
      },
    },
  ];
  editor.templateCharacterList.forEach((character: Character) => {
    menuData.push({
      id: character.type,
      label: character.type,
      leftIcon: getCharacterDisplay(character),
      onClick: () => {
        editor.setToolData({
          templateCharacter: character,
          toolType: Editor.TOOL_CHARACTER_PLACER,
          selectedPlayer: null,
          selectedTile: null,
        });
        return true;
      },
    });
  });
  return menuData;
}

function getItemsMenu(editor: Editor): Array<IDropItemData> | null {
  let menuData: Array<IDropItemData> = [
    {
      id: "delete",
      label: "Item Remover",
      leftIcon: "🗑️",
      onClick: () => {
        editor.setToolData({
          templateItem: null,
          toolType: Editor.TOOL_ITEM_PLACER,
          selectedPlayer: null,
          selectedTile: null,
        });
        return true;
      },
    },
  ];
  editor.templateItemList.forEach((item: Item) => {
    menuData.push({
      id: item.type,
      label: item.type,
      leftIcon: getItemDisplay(item),
      onClick: () => {
        editor.setToolData({
          templateItem: item,
          toolType: Editor.TOOL_ITEM_PLACER,
          selectedPlayer: null,
          selectedTile: null,
        });
        return true;
      },
    });
  });
  return menuData;
}

function getPlayersMenu(
  editor: Editor,
  popupRef: RefObject<PopupLayout>
): Array<IDropItemData> | null {
  let game = editor.game as Game;
  if (!game) {
    return null;
  }
  let menuData: Array<IDropItemData> = [];
  game.playerGroup.forEach((player: Player) => {
    let fieldDef = player.getFieldDef();
    /**
     * Apply Changes to data
     * Return true if successful
     */
    let apply = (value: any): boolean => {
      let result = fieldDef.validate(value);
      if (!result.isValid) {
        // alert(`Path: ${result.errorPath}\nError: ${result.message}`);
        invalidValueAlert(popupRef, result.message);
        return false;
      }
      player.setData(value);
      player.updateCharacter();
      player.apply();
      player.character.apply();
      return true;
    };
    let subMenu = getPropsMenu(fieldDef, apply, popupRef) || [];
    subMenu.splice(1, 0, {
      id: "movePlayer",
      label: "Move Player",
      leftIcon: "♟️",
      onClick: () => {
        editor.setToolData({
          selectedPlayer: player,
          selectedTile: null,
          toolType: Editor.TOOL_PLAYER_PLACER,
        });
        return true;
      },
    });
    menuData.push({
      id: `player-${player.id}`,
      label: `[Player #${player.id}] ${player.name}`,
      leftIcon: getPlayerDisplay(player),
      rightIcon: <RightIcon />,
      menuData: subMenu,
    });
  });
  return menuData;
}

function getEditorMenu(
  gameClient: GameClient,
  popupRef: RefObject<PopupLayout>
): Array<IDropItemData> | null {
  let editor = gameClient.editor as Editor;
  if (!editor) {
    console.warn("ToolbarLayout.getEditorMenu: editor is null");
    return null;
  }
  let game = editor.game;
  return [
    {
      id: "mapName",
      label: `Map: ${game?.map.name || "(No Map)"}`,
      leftIcon: "🗺️",
      rightIcon: <RightIcon />,
      isEnabled: game != null,
      menuData: getPropsMenu(
        new FieldDef<string>(
          {
            type: "string",
            // regExp: /[^\\/:*?"<>|]/,
            regExp: /^[^\\\/:*?"<>\|]+$/,
          },
          game?.map.name
        ),
        (value: string) => {
          if (!game) {
            return false;
          }
          game.map.name = value;
          game.map.apply();
          return true;
        },
        popupRef
      ),
    },
    {
      id: "testMap",
      label: "Test Map",
      leftIcon: "🕹️",
      onClick: () => {
        editor.startTesting();
        return true;
      },
      isEnabled: game != null,
    },
    {
      id: "loadMap",
      label: "Load Map",
      leftIcon: "📂",
      onClick: () => {
        editor.loadFile();
        return true;
      },
    },
    {
      id: "saveMap",
      label: "Save Map",
      leftIcon: "💾",
      onClick: () => {
        editor.saveFile();
        return true;
      },
      isEnabled: game != null,
    },
    {
      id: "newMap",
      label: "New Map",
      leftIcon: "🆕",
      onClick: () => {
        editor.disposeMap();
        return true;
      },
    },
    {
      id: "exitEditor",
      label: "Exit Editor",
      leftIcon: "🚪",
      onClick: () => {
        gameClient.mode = GameClient.MODE_SERVER;
        return true;
      },
    },
  ];
}

function getSelectedTileMenu(
  editor: Editor,
  popupRef: RefObject<PopupLayout>
): Array<IDropItemData> | null {
  if (!editor.selectedTile) {
    return null;
  }
  let tile = editor.selectedTile;
  let characters = tile.characters;
  let items = tile.items;
  let menuData: Array<IDropItemData> = [];
  //Tile
  let fieldDef = tile.getFieldDef();
  /**
   * Apply Changes to data
   * Return true if successful
   */
  let apply = (value: any): boolean => {
    let result = fieldDef.validate(value);
    if (!result.isValid) {
      // alert(`Path: ${result.errorPath}\nError: ${result.message}`);
      invalidValueAlert(popupRef, result.message);
      return false;
    }
    tile.setData(value);
    tile.apply();
    return true;
  };
  menuData.push({
    id: `tile-${tile.position.toString()}`,
    label: `[Tile ${tile.col},${tile.row}] ${tile.type}`,
    leftIcon: getTileDisplay(tile),
    rightIcon: <RightIcon />,
    menuData: getPropsMenu(fieldDef, apply, popupRef),
  });

  //Characters
  if (characters.length > 0) {
    characters.forEach((character: Character) => {
      let fieldDef = character.getFieldDef();
      /**
       * Apply Changes to characterData
       * Return true if successful
       */
      let apply = (value: any): boolean => {
        let result = fieldDef.validate(value);
        if (!result.isValid) {
          // alert(`Path: ${result.errorPath}\nError: ${result.message}`);
          invalidValueAlert(popupRef, result.message);
          return false;
        }
        character.setData(value);
        character.update<IActionPhase>("action");
        character.apply();
        return true;
      };
      let isPlayerCharacter = editor.playerCharacterList.includes(character);
      let subMenu = getPropsMenu(fieldDef, apply, popupRef) || [];
      subMenu.push({
        id: "delete",
        label: "Delete Character",
        leftIcon: "🗑️",
        isEnabled: !isPlayerCharacter,
        onClick: () => {
          !isPlayerCharacter && character.destroy();
          return true;
        },
      });
      menuData.push({
        id: `character-${character.id}`,
        label: `[Character #${character.id}] ${character.type}`,
        leftIcon: getCharacterDisplay(character),
        rightIcon: <RightIcon />,
        menuData: subMenu,
      });
    });
  }

  //Items
  if (items.length > 0) {
    items.forEach((item: Item) => {
      let fieldDef = item.getFieldDef();
      /**
       * Apply Changes to data
       * Return true if successful
       */
      let apply = (value: any): boolean => {
        let result = fieldDef.validate(value);
        if (!result.isValid) {
          // alert(`Path: ${result.errorPath}\nError: ${result.message}`);
          invalidValueAlert(popupRef, result.message);
          return false;
        }
        item.setData(value);
        item.apply();
        return true;
      };
      let subMenu = getPropsMenu(fieldDef, apply, popupRef) || [];
      subMenu.push({
        id: "delete",
        label: "Delete Item",
        leftIcon: "🗑️",
        onClick: () => {
          item.destroy();
          return true;
        },
      });
      menuData.push({
        id: `item-${item.id}`,
        label: `[Item #${item.id}] ${item.type}`,
        leftIcon: getItemDisplay(item),
        rightIcon: <RightIcon />,
        menuData: subMenu,
      });
    });
  }
  return menuData;
}
/**
 * Generate a menu for editing the properties of an object
 * @param fieldDef The field definition of the object
 * @param apply A callback function to apply changes to the object. The return value indicates whether the changes were successful.
 * @returns
 */
function getPropsMenu<T>(
  fieldDef: FieldDef<T>,
  apply: (value: any) => boolean,
  popupRef: RefObject<PopupLayout>
): Array<IDropItemData | IDropItemDataProvider> | null {
  let menuData: Array<IDropItemData | IDropItemDataProvider> = [
    {
      id: "back",
      label: "Back",
      leftIcon: <LeftIcon />,
      goBack: true,
    },
  ];
  let valueList: Array<any> = [];
  let isEndNode =
    fieldDef.type !== "object" || fieldDef.fallbackValue == undefined;
  // End node
  if (isEndNode) {
    // Value list
    if (fieldDef.valueList) {
      valueList = fieldDef.valueList;
    } else if (fieldDef.type == "boolean") {
      valueList = ["true", "false"];
    }
    if (valueList.length == 0) {
      let clickApply: () => void;
      let onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clickApply();
        return false;
      };
      let value: T = fieldDef.fallbackValue;
      if (fieldDef.type == "number") {
        let itemInputNumber: IDropItemDataProvider = {
          id: "number",
          get: () => {
            value = fieldDef.fallbackValue;
            return {
              id: "number",
              label: (
                <form onSubmit={onSubmit}>
                  <input
                    type="number"
                    max={fieldDef.maxNum == null ? undefined : fieldDef.maxNum}
                    min={fieldDef.minNum == null ? undefined : fieldDef.minNum}
                    defaultValue={Number(fieldDef.fallbackValue) | 0}
                    onChange={(event) => {
                      value = event.target.value as T;
                    }}
                  />
                </form>
              ),
              leftIcon: <PencilIcon />,
            };
          },
        };
        menuData.push(itemInputNumber);
      } else {
        let itemInputText: IDropItemDataProvider = {
          id: "text",
          get: () => {
            value = fieldDef.fallbackValue;
            return {
              id: "text",
              label: (
                <form onSubmit={onSubmit}>
                  <input
                    type={fieldDef.inputType || "text"}
                    defaultValue={String(fieldDef.fallbackValue)}
                    maxLength={
                      fieldDef.maxLength === null
                        ? undefined
                        : fieldDef.maxLength
                    }
                    minLength={
                      fieldDef.minLength === null
                        ? undefined
                        : fieldDef.minLength
                    }
                    pattern={
                      fieldDef.regExp ? fieldDef.regExp.source : undefined
                    }
                    onChange={(event) => {
                      value = event.target.value as T;
                    }}
                  />
                </form>
              ),
              leftIcon: <PencilIcon />,
            };
          },
        };
        menuData.push(itemInputText);
      }
      let itemApply: IDropItemDataProvider = {
        id: "apply",
        get: (click) => {
          clickApply = click;
          return {
            label: "Apply",
            leftIcon: "✔️",
            goBack: true,
            onClick: () => {
              let result = fieldDef.parseString(String(value));
              if (!result.isValid) {
                // alert(`Path: ${result.errorPath}\nError: ${result.message}`);
                invalidValueAlert(popupRef, result.message);
                return false;
              }
              return apply(result.value);
            },
          };
        },
      };
      menuData.push(itemApply);
    }
  } else {
    // Not end node
    fieldDef.objectChildren?.forEach((childDef, key) => {
      let displayValue = childDef.fallbackValue;
      if (childDef.type == "object" && childDef.objectChildren) {
        displayValue = JSON.stringify(childDef.fallbackValue);
      }
      let itemData: IDropItemData = {
        id: key,
        label: `${key}: ${String(displayValue).slice(0, 50)}`,
        isEnabled: childDef.editable,
      };
      if (childDef.editable) {
        itemData.rightIcon = <RightIcon />;
        itemData.menuData = getPropsMenu(
          childDef,
          (value: any) => {
            return apply({ ...fieldDef.fallbackValue, [key]: value });
          },
          popupRef
        );
      }
      menuData.push(itemData);
    });
  }

  // Add null and undefined to value list
  fieldDef.acceptNull && valueList.push("null");
  fieldDef.acceptUndefined && valueList.push("undefined");
  // render value list
  valueList.forEach((value, index) => {
    menuData.push({
      id: `value#${index}`,
      label: value,
      leftIcon: "＝",
      goBack: true,
      onClick: () => {
        let result = fieldDef.parseString(value);
        if (!result.isValid) {
          // alert(`${result.errorPath}: ${result.message}`);
          invalidValueAlert(popupRef, result.message);
          return false;
        }
        return apply(result.value);
      },
    });
  });
  return menuData;
}

function getTileDisplay(tile: Tile) {
  let style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    top: "0px",
    left: "0px",
    transform: "scale(1.2)",
    borderRadius: "50%",
    border: tile.walkable ? "none" : "1px solid red",
  };
  return <TileDisplay tile={tile} style={style} />;
}

function getCharacterDisplay(character: Character) {
  const CharacterSVG = ASSET_MAP.svg(character.frameDef.svgID) as SVGComponent;
  const svgStype = {
    fill: character.color,
    transform: "scale(1.8)",
  };
  return <CharacterSVG style={svgStype} />;
}

function getItemDisplay(item: Item) {
  const ItemSVG = ASSET_MAP.svg(item.frameDef.svgID) as SVGComponent;
  const svgStype = {
    transform: "scale(1.8)",
  };
  return <ItemSVG style={svgStype} />;
}

function getPlayerDisplay(player: Player) {
  const character: Character = player.character;
  return getCharacterDisplay(character);
}

function invalidValueAlert(popupRef: RefObject<PopupLayout>, message: string) {
  if (popupRef.current) {
    popupRef.current.open({
      type: "warning",
      title: "Invalid Value",
      content: message,
      buttonLabels: ["OK"],
      showCloseButton: false,
    });
    return;
  }
  alert(message);
}
