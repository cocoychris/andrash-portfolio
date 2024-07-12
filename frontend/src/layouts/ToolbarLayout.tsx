import SVGDisplay from "../components/game/SVGDisplay";
import React, { Component, ReactNode, RefObject, createRef } from "react";
import GameClient, { IDidNewGameEvent } from "../lib/GameClient";
import Navbar, { INavItemData } from "../components/Navbar";
import {
  IDropItemDataProvider,
  IDropItemData,
} from "../components/DropdownMenu";
import screenfull from "screenfull";
import { ReactComponent as RightIcon } from "../icons/chevron-right-svgrepo-com.svg";
import { ReactComponent as LeftIcon } from "../icons/chevron-left-svgrepo-com.svg";
import { ReactComponent as PencilIcon } from "../icons/pencil-svgrepo-com.svg";
import { ReactComponent as FullscreenIcon } from "../icons/andrash-full-screen.svg";
import { ReactComponent as ExitFullscreenIcon } from "../icons/andrash-exit-full-screen.svg";
import AnyEvent from "../lib/events/AnyEvent";
import {
  DataObject,
  IDidApplyEvent,
  IDidSetUpdateEvent,
} from "../lib/data/DataHolder";
import Game, { IActionPhase } from "../lib/Game";
import PopupLayout from "./PopupLayout";
import Editor, {
  IDidLoadGameEvent,
  ITileSelectEvent,
  IToolChangeEvent,
  IToolData,
  IWillUnloadGameEvent,
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
import { IGroupData } from "../lib/data/Group";
import Item, { IRepositionEvent } from "../lib/Item";
import Player from "../lib/Player";
import { IIndexable, applyDefault } from "../lib/data/util";
import FieldDef from "../lib/data/FieldDef";
import { IWillDestroyEvent } from "../lib/Destroyable";
import { ChromePicker } from "react-color";

interface IProps {
  gameClient: GameClient;
  popupRef: React.RefObject<PopupLayout>;
}

export default class ToolbarLayout extends Component<IProps> {
  private _game: Game | null = null;
  private _editor: Editor;
  private _navbarRef: React.RefObject<Navbar> = createRef<Navbar>();

  private get _popupRef(): RefObject<PopupLayout> {
    return this.props.popupRef;
  }

  constructor(props: IProps) {
    super(props);
    if (!props.gameClient.editor) {
      throw new Error("ToolbarLayout requires an editor");
    }
    this._editor = props.gameClient.editor;
    // Saving a reference to the game object so we can do the cleanup in componentWillUnmount even editor.game is null
    this._game = this._editor.game;
    this._onDidLoadGame = this._onDidLoadGame.bind(this);
    this._onWillUnloadGame = this._onWillUnloadGame.bind(this);
    this._onToolChange = this._onToolChange.bind(this);
    this._onObjectApply = this._onObjectApply.bind(this);
    this._onTileSelect = this._onTileSelect.bind(this);
  }

  public componentDidMount(): void {
    this._editor.on<IDidLoadGameEvent>("didLoadGame", this._onDidLoadGame);
    this._editor.on<IWillUnloadGameEvent>(
      "willUnloadGame",
      this._onWillUnloadGame
    );
    this._editor.on<IToolChangeEvent>("toolChanged", this._onToolChange);
    this._editor.on<ITileSelectEvent>("tileSelect", this._onTileSelect);
  }

  public componentWillUnmount(): void {
    this._editor.off<IDidLoadGameEvent>("didLoadGame", this._onDidLoadGame);
    this._editor.off<IWillUnloadGameEvent>(
      "willUnloadGame",
      this._onWillUnloadGame
    );
    this._editor.off<IToolChangeEvent>("toolChanged", this._onToolChange);
    this._editor.off<ITileSelectEvent>("tileSelect", this._onTileSelect);
  }

  private _onWillUnloadGame(event: AnyEvent<IWillUnloadGameEvent>) {
    if (!this._game || this._game.isDestroyed) {
      return;
    }
    // Clean up listeners for old game
    this._game.playerGroup.forEach((player: Player) => {
      player.off<IDidApplyEvent>("didApply", this._onObjectApply);
      player.character.off<IDidApplyEvent>("didApply", this._onObjectApply);
    });
    this._game.mapInfo.off<IDidApplyEvent>("didApply", this._onObjectApply);

    this._navbarRef.current?.clearSelection();
    // this.forceUpdate();
  }
  private _onDidLoadGame() {
    // Handle new game
    this._game = this._editor.game;
    if (this._game) {
      this._game.playerGroup.forEach((player: Player) => {
        player.on<IDidApplyEvent>("didApply", this._onObjectApply);
        player.character.on<IDidApplyEvent>("didApply", this._onObjectApply);
      });
      this._game.mapInfo.on<IDidApplyEvent>("didApply", this._onObjectApply);
    }
    this.forceUpdate();
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
    this.forceUpdate();
  }

  private _onToolChange() {
    if (this._editor.toolType) {
      this._navbarRef.current?.select(this._editor.toolType);
    } else {
      this._navbarRef.current?.clearSelection();
    }
    this.forceUpdate();
  }

  render(): ReactNode {
    const { gameClient } = this.props;
    let nevbarData: Array<INavItemData> = [
      {
        id: "fullscreen",
        // icon: "🖥️",
        icon: screenfull.isFullscreen ? (
          <ExitFullscreenIcon />
        ) : (
          <FullscreenIcon />
        ),
        onClick: () => {
          let isFullscreen = screenfull.isFullscreen;
          setTimeout(() => {
            if (screenfull.isFullscreen == isFullscreen) {
              this.props.popupRef.current?.show({
                type: "warning",
                title: "Fullscreen not supported",
                content: (
                  <p>
                    Your browser or device does not support fullscreen mode.
                    Please try another browser or device (Google Chrome and
                    Microsoft Edge are recommended).
                  </p>
                ),
              });
            } else {
              this.forceUpdate();
            }
          }, 100);
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
        isEnabled: this._editor.game != null,
        onClick: () => {
          this._editor.setToolData({
            toolType: Editor.TOOL_TILE_SELECTOR,
            selectedPlayer: null,
          });
        },
      },
      {
        id: Editor.TOOL_PLAYER_PLACER,
        icon: this._editor.selectedPlayer
          ? getPlayerDisplay(this._editor.selectedPlayer)
          : "👤",
        menuData: getPlayersMenu(this._editor, this._popupRef),
        isEnabled: this._editor.game != null,
        onClick: () => {
          this._editor.setToolData({
            toolType: Editor.TOOL_PLAYER_PLACER,
            selectedTile: null,
          });
        },
      },
      {
        id: Editor.TOOL_TILE_BRUSH,
        icon: this._editor.templateTile
          ? getTileDisplay(this._editor.templateTile)
          : "🧱",
        // menuData: this.state.tilesMenuData,
        menuData: getTilesMenu(this._editor),
        isEnabled: this._editor.game != null,
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
        icon: this._editor.templateCharacter
          ? getCharacterDisplay(this._editor.templateCharacter)
          : "🧑‍🤝‍🧑",
        menuData: getCharactersMenu(this._editor),
        isEnabled: this._editor.game != null,
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
        icon: this._editor.templateItem
          ? getItemDisplay(this._editor.templateItem)
          : "🎁",
        menuData: getItemsMenu(this._editor),
        isEnabled: this._editor.game != null,
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
        // icon: "☰",
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
  if (!editor.game) {
    return null;
  }
  const MAX_LABEL_LENGTH = 40;
  let menuData: Array<IDropItemData> = [
    {
      id: "autoTile",
      label: `Auto Tile: ${editor.autoTile ? "On" : "Off"}`,
      leftIcon: editor.autoTile ? "🐵" : "🙈",
      onClick: () => {
        let toolData: Partial<IToolData> = {
          autoTile: !editor.autoTile,
        };
        // Main tile only in auto tile mode
        if (
          toolData.autoTile &&
          editor.templateTile &&
          editor.templateTile.isTransition
        ) {
          toolData.templateTile = null;
        }
        editor.setToolData(toolData);
        return false;
      },
    },
  ];
  // Main tiles (non-pathway tiles)
  const tileDefPack = editor.game.assetPack.tileDefPack;
  tileDefPack.tileTextureNames.forEach((textureName: string) => {
    let mainTileTypes = tileDefPack.getTextureMainTileTypes(textureName);
    let tileType = mainTileTypes[0];
    let tile = editor.getTemplateTile(tileType);
    if (!tile) {
      throw new Error(`Tile ${tileType} not found`);
    }
    let textureItemData: IDropItemData = {
      id: textureName,
      label: toDisplayString(textureName, MAX_LABEL_LENGTH),
      leftIcon: getTileDisplay(tile),
    };
    // If autoTile is on, clicking on the texture will select the main tile type
    if (editor.autoTile) {
      textureItemData.onClick = () => {
        editor.setToolData({
          templateTile: tile,
          toolType: Editor.TOOL_TILE_BRUSH,
          selectedPlayer: null,
          selectedTile: null,
        });
        return true;
      };
    } else {
      // If autoTile is off, clicking on the texture will show a menu of all the tile types in the texture
      let transTileTypes =
        tileDefPack.getTextureTransitionTileTypes(textureName);
      textureItemData.rightIcon = <RightIcon />;
      let subMenuData: Array<IDropItemData> = [
        {
          id: "back",
          label: "Back",
          leftIcon: <LeftIcon />,
          goBack: true,
        },
      ];
      [...mainTileTypes, ...transTileTypes].forEach((tileType: string) => {
        let tile = editor.getTemplateTile(tileType);
        if (!tile) {
          throw new Error(`Tile ${tileType} not found`);
        }
        subMenuData.push({
          id: tileType,
          label: toDisplayString(tileType, MAX_LABEL_LENGTH),
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
        });
      });
      textureItemData.menuData = subMenuData;
    }
    menuData.push(textureItemData);
  });
  // Pathway tiles
  tileDefPack.pathwayTextureNames.forEach((textureName: string) => {
    let pathwayTileTypes;
    if (editor.autoTile) {
      pathwayTileTypes =
        tileDefPack.getTextureBasicPathwayTileTypes(textureName);
    } else {
      pathwayTileTypes = tileDefPack.getTexturePathwayTileTypes(textureName);
    }
    let tileType = pathwayTileTypes[0];
    let tile = editor.getTemplateTile(tileType);
    if (!tile) {
      throw new Error(`Tile ${tileType} not found`);
    }
    let textureItemData: IDropItemData = {
      id: textureName,
      label: toDisplayString(`Pathway: ${textureName}`, MAX_LABEL_LENGTH),
      leftIcon: getTileDisplay(tile),
      rightIcon: <RightIcon />,
    };
    // If autoTile is off, clicking on the texture will show a menu of all the tile types in the texture
    let subMenuData: Array<IDropItemData> = [
      {
        id: "back",
        label: "Back",
        leftIcon: <LeftIcon />,
        goBack: true,
      },
    ];
    pathwayTileTypes.forEach((tileType: string) => {
      let tile = editor.getTemplateTile(tileType);
      if (!tile) {
        throw new Error(`Tile ${tileType} not found`);
      }
      subMenuData.push({
        id: tileType,
        label: toDisplayString(tileType, MAX_LABEL_LENGTH),
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
      });
    });
    textureItemData.menuData = subMenuData;
    menuData.push(textureItemData);
  });
  return menuData;
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
        invalidValueAlert(popupRef, result.message);
        return false;
      }
      player.setData(value as DataObject);
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
  const MSG_EXIT_EDITOR = (
    <>
      <p>
        You're about to exit the Map Editor. Make sure you've saved all your
        changes before you go.
      </p>
      <p>
        Note: Playing custom maps outside the editor isn't supported just yet.
      </p>
      <p>Still want to leave?</p>
    </>
  );
  return [
    {
      id: "mapName",
      label: `Map: ${game?.mapInfo.name || "(No Map)"}`,
      leftIcon: "🗺️",
      rightIcon: <RightIcon />,
      isEnabled: game != null,
      menuData: getPropsMenu(
        new FieldDef<string>(
          {
            type: "string",
            regExp: Editor.MAP_NAME_REGEXP,
            minLength: 1,
          },
          game?.mapInfo.name
        ),
        (value: string) => {
          if (!game) {
            return false;
          }
          game.mapInfo.name = value;
          game.mapInfo.apply();
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
        editor.unloadMap();
        return true;
      },
    },
    {
      id: "exitEditor",
      label: "Exit Editor",
      leftIcon: "🚪",
      onClick: () => {
        popupRef.current?.show({
          type: "info",
          title: "Exit Editor",
          content: MSG_EXIT_EDITOR,
          buttonLabels: ["Yes", "No"],
          buttonActions: [
            () => {
              gameClient.mode = GameClient.DEFAULT_MODE;
            },
            null,
          ],
        });
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
      invalidValueAlert(popupRef, result.message);
      return false;
    }
    tile.setData(value);
    tile.apply();
    return true;
  };

  let templateTile = editor.getTemplateTile(tile.type);
  menuData.push({
    id: `tile-${tile.position.toString()}`,
    label: `[Tile ${tile.col},${tile.row}] ${tile.type}`,
    leftIcon: getTileDisplay(templateTile || tile),
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
          invalidValueAlert(popupRef, result.message);
          return false;
        }
        character.setData(value);
        character.update<IActionPhase>("action");
        character.apply();
        return true;
      };
      let characterPlayer: Player | null = null;
      editor.game?.playerGroup.forEach((player: Player) => {
        if (player.character == character) {
          characterPlayer = player;
        }
      });
      let subMenu = getPropsMenu(fieldDef, apply, popupRef) || [];
      if (characterPlayer) {
        subMenu.push({
          id: "movePlayer",
          label: "Move Player",
          leftIcon: "♟️",
          onClick: () => {
            editor.setToolData({
              selectedPlayer: characterPlayer,
              selectedTile: null,
              toolType: Editor.TOOL_PLAYER_PLACER,
            });
            return true;
          },
        });
      } else {
        subMenu.push({
          id: "delete",
          label: "Delete Character",
          leftIcon: "🗑️",
          onClick: () => {
            character.destroy();
            return true;
          },
        });
      }
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
  let valueList: Array<string> = [];
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
                  {fieldDef.inputType == "color" ? (
                    // Using a custom color picker because the default one doesn't support copy and paste of hex codes
                    <ColorPicker
                      color={value as string}
                      onChange={(color) => {
                        value = color.hex as T;
                      }}
                    />
                  ) : (
                    <input
                      type={fieldDef.inputType || "text"}
                      defaultValue={String(value)}
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
                  )}
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
    fieldDef.forEachChild((childDef, key) => {
      let displayValue = childDef.fallbackValue;
      if (childDef.type == "object" && childDef.childCount > 0) {
        displayValue = JSON.stringify(childDef.fallbackValue);
      }
      let itemData: IDropItemData = {
        id: String(key),
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
    transform: "scale(1.2)",
    borderRadius: "50%",
    border: "none",
  };
  if (!tile.walkable) {
    style.margin = "-1px";
    style.border = "1px solid red";
  }

  return <TileDisplay tile={tile} style={style} />;
}

function getCharacterDisplay(character: Character) {
  const assetPack = character.group.game.assetPack;
  if (character.frameDef.imageName) {
    return (
      <img
        src={assetPack.getImageURL(character.frameDef.imageName)}
        style={{
          width: "100%",
          height: "100%",
          transform: "scale(1.2)",
        }}
      />
    );
  }
  if (character.frameDef.svgName) {
    return (
      <SVGDisplay
        assetPack={assetPack}
        svgName={character.frameDef.svgName}
        svgStyle={{
          fill: character.color,
          transform: "scale(1.2)",
        }}
      />
    );
  }
  return null;
}

function getItemDisplay(item: Item) {
  const assetPack = item.group.game.assetPack;
  if (item.frameDef.imageName) {
    return (
      <img
        src={assetPack.getImageURL(item.frameDef.imageName)}
        style={{
          width: "100%",
          height: "100%",
          transform: "scale(1.2)",
        }}
      />
    );
  }
  if (item.frameDef.svgName) {
    return (
      <SVGDisplay
        assetPack={assetPack}
        svgName={item.frameDef.svgName}
        svgStyle={{
          transform: "scale(1.2)",
        }}
      />
    );
  }
  return null;
}

function getPlayerDisplay(player: Player) {
  const character: Character = player.character;
  return getCharacterDisplay(character);
}

function invalidValueAlert(popupRef: RefObject<PopupLayout>, message: string) {
  if (popupRef.current) {
    popupRef.current.show({
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
/**
 * Truncate a string to a certain length and capitalize the first letter
 */
function toDisplayString(value: string, maxLength: number) {
  const endString = "...";
  value = value.replace(/_/g, " ").trim();
  if (value.length > maxLength + endString.length) {
    value = value.slice(0, maxLength) + endString;
  }
  value = value.charAt(0).toUpperCase() + value.slice(1);
  return value;
}

function ColorPicker(props: {
  color: string | null;
  onChange: (color: any) => void;
}) {
  const [displayColorPicker, setDisplayColorPicker] = React.useState(false);
  const [color, setColor] = React.useState(props.color || "#000000");
  const handleClick = () => {
    setDisplayColorPicker(!displayColorPicker);
  };
  const handleClose = () => {
    setDisplayColorPicker(false);
  };
  const handleChange = (color: any) => {
    setColor(color.hex);
    props.onChange(color);
  };
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          marginRight: "5px",
          backgroundColor: color,
          borderRadius: "5px",
          border: "none",
        }}
        onClick={handleClick}
      />
      {displayColorPicker ? (
        <div
          style={{
            position: "relative",
            zIndex: 99999,
            borderRadius: "5px",
            border: "none",
          }}
        >
          <ChromePicker
            color={color}
            onChange={handleChange}
            disableAlpha={true}
          />
        </div>
      ) : null}
    </div>
  );
}
