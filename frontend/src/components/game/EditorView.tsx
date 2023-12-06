import React, { ReactNode } from "react";
import Game, { IActionPhase } from "../../lib/Game";
import Position from "../../lib/Position";
import Character, { ITargetUpdateEvent } from "../../lib/Character";
import Player from "../../lib/Player";
import MapView, { IMouseInfo } from "./MapView";
import Editor, { IPlayerSelectEvent, ITileSelectEvent } from "../../lib/Editor";
import AnyEvent from "../../lib/events/AnyEvent";
import { IDidApplyEvent, IDidSetUpdateEvent } from "../../lib/DataHolder";
import Item, { IRepositionEvent } from "../../lib/Item";
import { IWillDestroyEvent } from "../../lib/Destroyable";
import { IDidAddMemberEvent } from "../../lib/Group";
import Tile from "../../lib/Tile";
import PopupLayout from "../../layouts/PopupLayout";
import "./GameView.css";
import "./EditorView.css";

const MIN_VISIBLE_TILE_COUNT = 5;
const AUTO_SCROLL_INTERVAL = 20;
const AUTO_SCROLL_SPEED_RATIO = 0.002;

interface IProps {
  editor: Editor;
}
interface IState {}

export default class EditorView extends React.Component<IProps, IState> {
  private _editor: Editor;
  private _game: Game;
  private _mapViewRef = React.createRef<MapView>();
  private _prevDragPosition: Position | null = null;
  private _autoScrollIntervalID: NodeJS.Timeout | null = null;
  private _mouseInfo: IMouseInfo | null = null;

  private get _mapView(): MapView | null {
    return this._mapViewRef.current;
  }

  public state: Readonly<IState> = {};

  constructor(props: IProps) {
    console.log("EditorView.constructor");
    super(props);
    const { editor } = props;
    this._editor = editor;
    if (!editor.game) {
      throw new Error("EditorView requires an editor with a game");
    }
    this._game = editor.game;
    this._onViewClick = this._onViewClick.bind(this);
    this._onViewDrag = this._onViewDrag.bind(this);
    this._onViewMouseUp = this._onViewMouseUp.bind(this);
    this._onAutoScroll = this._onAutoScroll.bind(this);
    this._onPlayerSelect = this._onPlayerSelect.bind(this);
    this._onTileSelect = this._onTileSelect.bind(this);
    this._onObjectApply = this._onObjectApply.bind(this);
    this._onObjectReposition = this._onObjectReposition.bind(this);
    this._onDidAddObject = this._onDidAddObject.bind(this);
    this._onTargetUpdate = this._onTargetUpdate.bind(this);
  }

  private _onPlayerSelect(event: AnyEvent<IPlayerSelectEvent>) {
    if (event.data.prevPlayer) {
      this._mapView?.updateTileDisplay(
        event.data.prevPlayer.character.position
      );
    }
    if (event.data.player) {
      this._mapView?.updateTileDisplay(event.data.player.character.position);
    }
  }
  private _onTileSelect(event: AnyEvent<ITileSelectEvent>) {
    if (event.data.prevTile) {
      this._mapView?.updateTileDisplay(event.data.prevTile);
      this._removeObjectEventListener(event.data.prevTile);
    }
    if (event.data.tile) {
      this._mapView?.updateTileDisplay(event.data.tile);
      this._addObjectEventListener(event.data.tile);
    }
  }
  private _onViewClick(mouseInfo: IMouseInfo): boolean {
    this._mouseInfo = mouseInfo;
    const position = mouseInfo.position.floor();
    // Position changed
    this._prevDragPosition = position;
    // Apply tool
    if (!this._editor.toolType) {
      return false;
    }
    if (this._editor.toolType == Editor.TOOL_TILE_BRUSH) {
      return this._tool_tileBrush(position);
    }
    if (this._editor.toolType == Editor.TOOL_CHARACTER_PLACER) {
      return this._tool_characterPlacer(position);
    }
    if (this._editor.toolType == Editor.TOOL_ITEM_PLACER) {
      return this._tool_itemPlacer(position);
    }
    if (this._editor.toolType == Editor.TOOL_PLAYER_PLACER) {
      return this._tool_playerPlacer(position);
    }
    if (this._editor.toolType == Editor.TOOL_TILE_SELECTOR) {
      return this._tool_tileSelector(position);
    }
    return false;
  }
  private _onViewDrag(mouseInfo: IMouseInfo) {
    this._mouseInfo = mouseInfo;
    //Auto scroll
    if (!this._autoScrollIntervalID) {
      this._autoScrollIntervalID = setInterval(
        this._onAutoScroll,
        AUTO_SCROLL_INTERVAL
      );
    }
    return false;
  }

  private _onViewMouseUp(mouseInfo: IMouseInfo) {
    if (this._autoScrollIntervalID) {
      clearInterval(this._autoScrollIntervalID);
      this._autoScrollIntervalID = null;
    }
    return false;
  }

  private _onAutoScroll() {
    if (!this._mouseInfo) {
      return false;
    }
    if (!this._mapView) {
      return false;
    }
    let { pageX, pageY } = this._mouseInfo;
    // Auto scroll
    const viewWidth = this._mapView.width;
    const viewHeight = this._mapView.height;
    const PADDING = Math.min(viewWidth, viewHeight) * 0.35;
    const MIN_X = PADDING;
    const MIN_Y = PADDING;
    const MAX_X = viewWidth - PADDING;
    const MAX_Y = viewHeight - PADDING;
    let moveX = 0;
    let moveY = 0;
    if (pageX < MIN_X) {
      moveX = pageX - MIN_X;
    } else if (pageX > MAX_X) {
      moveX = pageX - MAX_X;
    }
    if (pageY < MIN_Y) {
      moveY = pageY - MIN_Y;
    } else if (pageY > MAX_Y) {
      moveY = pageY - MAX_Y;
    }
    this._mapView.position = this._mapView.position.add({
      col: moveX * AUTO_SCROLL_SPEED_RATIO,
      row: moveY * AUTO_SCROLL_SPEED_RATIO,
    });
    // Check Position
    const position = this._mapView.getPosition(pageX, pageY).floor();
    // Position unchanged
    if (this._prevDragPosition && this._prevDragPosition.equals(position)) {
      return;
    }
    // Position changed
    this._prevDragPosition = position;
    // No tool
    if (!this._editor.toolType) {
      return;
    }
    // Have tool
    if (this._editor.toolType == Editor.TOOL_TILE_BRUSH) {
      if (this._tool_tileBrush(position)) {
        this._mapView.updateTileDisplay(position);
      }
    }
  }

  private _tool_tileBrush(position: Position): boolean {
    let tile = this._game.map.getTile(position);
    if (!tile) {
      return false;
    }
    if (!this._editor.templateTile) {
      return false;
    }
    tile.type = this._editor.templateTile.type;
    tile.apply();
    return true;
  }

  private _tool_characterPlacer(position: Position): boolean {
    let tile = this._game.map.getTile(position);
    if (!tile) {
      return false;
    }
    // Delete character
    if (!this._editor.templateCharacter) {
      let character = tile.characters.at(tile.characters.length - 1);
      if (!character) {
        return false;
      }
      if (this._editor.playerCharacterList.includes(character)) {
        return false;
      }
      character.destroy();
      // return true;
      return false;
    }
    // Place character
    let existCharacter: Character = tile.characters.at(0) as Character;
    if (existCharacter) {
      existCharacter.type = this._editor.templateCharacter.type;
      existCharacter.apply();
      // return true;
      return false;
    }
    let data = this._editor.templateCharacter.getData();
    data.position = position.toObject();
    let character = this._game.characterGroup.new(data);
    character.init();
    return true;
  }

  private _tool_itemPlacer(position: Position): boolean {
    let tile = this._game.map.getTile(position);
    if (!tile) {
      return false;
    }
    // Delete item
    if (!this._editor.templateItem) {
      let item = tile.items.at(tile.items.length - 1);
      if (!item) {
        return false;
      }
      item.destroy();
      //return true;
      return false;
    }
    let data = this._editor.templateItem.getData();
    data.position = position.toObject();
    let item = this._game.itemGroup.new(data);
    item.init();
    return true;
  }

  private _tool_playerPlacer(position: Position): boolean {
    let tile = this._game.map.getTile(position);
    if (!tile) {
      return false;
    }
    let character = this._editor.selectedPlayer?.character;
    if (!character) {
      return false;
    }
    console.log("_tool_playerPlacer");
    if (tile.characters.includes(character) && character.isMoving) {
      character.update<IActionPhase>("action");
      character.apply();
      //return true;
      return false;
    }
    // Place player character
    if (tile.characters.length > 0) {
      return false;
    }
    let oldPosition = character.position;
    character.position = position;
    character.update<IActionPhase>("action");
    character.apply();
    //this._mapView.updateTileDisplay(oldPosition);
    //return true;
    return false;
  }

  private _tool_tileSelector(position: Position): boolean {
    //Clear previous highlight
    if (this._editor.selectedTile) {
      this._editor.selectedTile.isSelected = false;
    }
    //Select new tile
    let tile = this._game.map.getTile(position);
    if (tile) {
      //Highlight new tile
      tile.isSelected = true;
      tile.apply();
    }
    this._editor.setToolData({
      selectedTile: tile,
      selectedPlayer: null,
    });
    // return true;
    return false;
  }

  private _onObjectApply(
    event: AnyEvent<IDidApplyEvent> | AnyEvent<IDidSetUpdateEvent>
  ) {
    let object = event.target as Character | Item;
    if (event.data.changes.isChanged) {
      this._mapView?.updateTileDisplay(object);
    }
  }
  private _onObjectReposition(event: AnyEvent<IRepositionEvent>) {
    if (event.data.currentTile) {
      this._mapView?.updateTileDisplay(event.data.currentTile);
    }
    if (event.data.prevTile) {
      this._mapView?.updateTileDisplay(event.data.prevTile);
    }
  }
  private _onTargetUpdate(event: AnyEvent<ITargetUpdateEvent>) {
    if (event.data.target) {
      this._mapView?.updateTileDisplay(event.data.target);
    }
    if (event.data.prevTarget) {
      this._mapView?.updateTileDisplay(event.data.prevTarget);
    }
  }

  private _onDidAddObject(event: AnyEvent<IDidAddMemberEvent>) {
    let object = event.data.member as Character | Item;
    this._addObjectEventListener(object);
  }

  private _removeObjectEventListener(object: Character | Item | Tile) {
    this._mapView?.updateTileDisplay(object);
    if (object instanceof Character) {
      object.prevTile && this._mapView?.updateTileDisplay(object.prevTile);
      object.on<ITargetUpdateEvent>("targetUpdate", this._onTargetUpdate);
    }
    object.off<IDidApplyEvent>("didApply", this._onObjectApply);
    object.off<IRepositionEvent>("reposition", this._onObjectReposition);
  }

  private _addObjectEventListener(object: Character | Item | Tile) {
    if (object instanceof Character) {
      object.on<ITargetUpdateEvent>("targetUpdate", this._onTargetUpdate);
    }
    object.on<IDidApplyEvent>("didApply", this._onObjectApply);
    object.on<IRepositionEvent>("reposition", this._onObjectReposition);
    object.once<IWillDestroyEvent>("willDestroy", () => {
      this._removeObjectEventListener(object);
    });
  }

  public componentDidMount() {
    this._editor.on<IPlayerSelectEvent>("playerSelect", this._onPlayerSelect);
    this._editor.on<ITileSelectEvent>("tileSelect", this._onTileSelect);
    this._game.characterGroup.forEach((character) => {
      this._addObjectEventListener(character);
    });
    this._game.itemGroup.forEach((item) => {
      this._addObjectEventListener(item);
    });
    this._game.characterGroup.on<IDidAddMemberEvent>(
      "didAddMember",
      this._onDidAddObject
    );
    this._game.itemGroup.on<IDidAddMemberEvent>(
      "didAddMember",
      this._onDidAddObject
    );
  }

  public componentWillUnmount() {
    if (this._autoScrollIntervalID) {
      clearInterval(this._autoScrollIntervalID);
      this._autoScrollIntervalID = null;
    }
    this._editor.off<IPlayerSelectEvent>("playerSelect", this._onPlayerSelect);
    this._editor.off<ITileSelectEvent>("tileSelect", this._onTileSelect);
    this._game.characterGroup.forEach((character) => {
      this._removeObjectEventListener(character);
    });
    this._game.itemGroup.forEach((item) => {
      this._removeObjectEventListener(item);
    });
    this._game.characterGroup.off<IDidAddMemberEvent>(
      "didAddMember",
      this._onDidAddObject
    );
    this._game.itemGroup.off<IDidAddMemberEvent>(
      "didAddMember",
      this._onDidAddObject
    );
  }

  public render() {
    return (
      <MapView
        className="gameView editorView"
        game={this._game}
        initPosition={{ col: 0, row: 0 }}
        minVisibleTileCount={MIN_VISIBLE_TILE_COUNT}
        paddingCellCount={1}
        ref={this._mapViewRef}
        onClick={this._onViewClick}
        onDrag={this._onViewDrag}
        onMouseUp={this._onViewMouseUp}
      />
    );
  }
}
