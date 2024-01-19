import React, { ReactNode } from "react";
import Game, { IActionPhase } from "../../lib/Game";
import Position, { IPosition } from "../../lib/Position";
import Character, { ITargetUpdateEvent } from "../../lib/Character";
import Player from "../../lib/Player";
import TileGrid, { IMouseInfo, IPoint } from "./TileGrid";
import Editor, { IPlayerSelectEvent, ITileSelectEvent } from "../../lib/Editor";
import AnyEvent from "../../lib/events/AnyEvent";
import {
  IDidApplyEvent,
  IDidSetUpdateEvent,
  IWillApplyEvent,
} from "../../lib/data/DataHolder";
import Item, { IRepositionEvent } from "../../lib/Item";
import { IWillDestroyEvent } from "../../lib/Destroyable";
import { IDidAddMemberEvent } from "../../lib/data/Group";
import Tile from "../../lib/Tile";
import "./GameView.css";
import "./EditorView.css";
import { randomElement } from "../../lib/data/util";

const MIN_VISIBLE_TILE_COUNT = 5;
const AUTO_SCROLL_MAX_SPEED_RATIO = 0.1;
const AUTO_SCROLL_ACCELERATION = 0.005;

interface IProps {
  editor: Editor;
  updateInterval: number;
}
interface IState {}

export default class EditorView extends React.Component<IProps, IState> {
  private _editor: Editor;
  private _tileGridRef = React.createRef<TileGrid>();
  private _prevDragPosition: Position | null = null;
  private _autoScrollIntervalID: NodeJS.Timeout | null = null;
  private _mouseInfo: IMouseInfo | null = null;
  private _game: Game;
  private _velocity: Position = new Position({ col: 0, row: 0 });

  private get _tileGrid(): TileGrid | null {
    return this._tileGridRef.current;
  }
  public state: Readonly<IState> = {};

  constructor(props: IProps) {
    super(props);
    const { editor } = props;
    this._editor = editor;
    if (!editor.game) {
      throw new Error("EditorView: game is null");
    }
    // Saving a reference to the game object so we can do the cleanup in componentWillUnmount even editor.game is null
    this._game = editor.game;

    this._onGameWillDestroy = this._onGameWillDestroy.bind(this);
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
      this._tileGrid?.updateTileDisplay(
        event.data.prevPlayer.character.position
      );
    }
    if (event.data.player) {
      this._tileGrid?.updateTileDisplay(event.data.player.character.position);
    }
  }
  private _onTileSelect(event: AnyEvent<ITileSelectEvent>) {
    if (event.data.prevTile) {
      this._tileGrid?.updateTileDisplay(event.data.prevTile);
      this._removeObjectEventListener(event.data.prevTile);
    }
    if (event.data.tile) {
      this._tileGrid?.updateTileDisplay(event.data.tile);
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
        this.props.updateInterval
      );
    }
    return false;
  }

  private _onViewMouseUp(mouseInfo: IMouseInfo) {
    if (this._autoScrollIntervalID) {
      clearInterval(this._autoScrollIntervalID);
      this._autoScrollIntervalID = null;
    }
    this._velocity = new Position({ col: 0, row: 0 });
    return false;
  }

  private _onAutoScroll() {
    if (!this._mouseInfo) {
      return false;
    }
    if (!this._tileGrid) {
      return false;
    }
    let { pageX, pageY } = this._mouseInfo;
    // Auto scroll
    const CELL_SIZE = this._tileGrid.cellSize;
    const viewWidth = this._tileGrid.width;
    const viewHeight = this._tileGrid.height;
    const PADDING = Math.min(viewWidth, viewHeight) * 0.35;
    const MIN_X = PADDING;
    const MIN_Y = PADDING;
    const MAX_X = viewWidth - PADDING;
    const MAX_Y = viewHeight - PADDING;
    let maxSpeed: Position = new Position();
    let minSpeed: Position = new Position();
    let moveX = 0;
    let moveY = 0;
    if (pageX < MIN_X) {
      moveX = pageX - MIN_X;
      minSpeed.col = (moveX / CELL_SIZE) * AUTO_SCROLL_MAX_SPEED_RATIO;
      this._velocity.col -= AUTO_SCROLL_ACCELERATION;
    } else if (pageX > MAX_X) {
      moveX = pageX - MAX_X;
      maxSpeed.col = (moveX / CELL_SIZE) * AUTO_SCROLL_MAX_SPEED_RATIO;
      this._velocity.col += AUTO_SCROLL_ACCELERATION;
    } else {
      this._velocity.col = 0;
    }
    if (pageY < MIN_Y) {
      moveY = pageY - MIN_Y;
      minSpeed.row = (moveY / CELL_SIZE) * AUTO_SCROLL_MAX_SPEED_RATIO;
      this._velocity.row -= AUTO_SCROLL_ACCELERATION;
    } else if (pageY > MAX_Y) {
      moveY = pageY - MAX_Y;
      maxSpeed.row = (moveY / CELL_SIZE) * AUTO_SCROLL_MAX_SPEED_RATIO;
      this._velocity.row += AUTO_SCROLL_ACCELERATION;
    } else {
      this._velocity.row = 0;
    }
    this._tileGrid.position = this._tileGrid.position.add(
      this._velocity.max(minSpeed).min(maxSpeed)
    );
    // Check Position
    const position = this._tileGrid.getPosition(pageX, pageY).floor();
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
        this._tileGrid.updateTileDisplay(position);
      }
    }
  }

  private _tool_tileBrush(position: Position): boolean {
    let tile = this._game.tileManager.getTile(position);
    if (!tile) {
      return false;
    }
    const tileDefPack = this._game.assetPack.tileDefPack;
    const templateTile = this._editor.templateTile;
    if (!templateTile) {
      return false;
    }
    // Auto transition
    if (this._editor.autoTile) {
      // Placing a tile with random tile type of the same texture
      if (templateTile.pathwayTexture) {
        tile.type = templateTile.type;
      } else {
        let tileTypeList = tileDefPack.getTextureMainTileTypes(
          templateTile.texture
        );
        tile.type = randomElement(tileTypeList);
      }
      tile.apply();
      // Auto transition adjacent tiles
      const MAX_STEP = 2;
      for (let step = 0; step < MAX_STEP; step++) {
        tile.adjacentTiles.forEach((adjacentTile) => {
          adjacentTile.autoTransition();
        });
        tile.adjacentTiles.forEach((adjacentTile) => {
          adjacentTile.apply();
          this._tileGrid?.updateTileDisplay(adjacentTile);
        });
      }
    } else {
      // Placing a tile without auto transition nor randomized tile type
      tile.type = templateTile.type;
      tile.apply();
    }
    return true;
  }

  private _tool_characterPlacer(position: Position): boolean {
    let tile = this._game.tileManager.getTile(position);
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
    this._game.characterGroup.new(data);
    this._game.characterGroup.apply();
    return true;
  }

  private _tool_itemPlacer(position: Position): boolean {
    let tile = this._game.tileManager.getTile(position);
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
      return false;
    }
    let data = this._editor.templateItem.getData();
    data.position = position.toObject();
    this._game.itemGroup.new(data);
    this._game.itemGroup.apply();
    return true;
  }

  private _tool_playerPlacer(position: Position): boolean {
    let tile = this._game.tileManager.getTile(position);
    if (!tile) {
      return false;
    }
    let character = this._editor.selectedPlayer?.character;
    if (!character) {
      return false;
    }
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
    //this._tileGrid.updateTileDisplay(oldPosition);
    //return true;
    return false;
  }

  private _tool_tileSelector(position: Position): boolean {
    //Clear previous highlight
    if (this._editor.selectedTile) {
      this._editor.selectedTile.isSelected = false;
    }
    //Select new tile
    let tile = this._game.tileManager.getTile(position);
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
    let object = event.target as Character | Item | Tile;
    if (event.data.changes.isChanged) {
      this._tileGrid?.updateTileDisplay(object);
    }
  }
  private _onObjectReposition(event: AnyEvent<IRepositionEvent>) {
    if (event.data.currentTile) {
      this._tileGrid?.updateTileDisplay(event.data.currentTile);
    }
    if (event.data.prevTile) {
      this._tileGrid?.updateTileDisplay(event.data.prevTile);
    }
  }
  private _onTargetUpdate(event: AnyEvent<ITargetUpdateEvent>) {
    if (event.data.target) {
      this._tileGrid?.updateTileDisplay(event.data.target);
    }
    if (event.data.prevTarget) {
      this._tileGrid?.updateTileDisplay(event.data.prevTarget);
    }
  }

  private _onDidAddObject(event: AnyEvent<IDidAddMemberEvent>) {
    let object = event.data.member as Character | Item;
    this._addObjectEventListener(object);
  }

  private _removeObjectEventListener(object: Character | Item | Tile) {
    this._tileGrid?.updateTileDisplay(object);
    if (object instanceof Character) {
      object.prevTile && this._tileGrid?.updateTileDisplay(object.prevTile);
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
    this._game.once<IWillDestroyEvent>("willDestroy", this._onGameWillDestroy);
  }

  // public componentWillUnmount() {
  public _onGameWillDestroy() {
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
      <TileGrid
        className="gameView editorView"
        game={this._game}
        initPosition={{ col: 0, row: 0 }}
        minVisibleTileCount={MIN_VISIBLE_TILE_COUNT}
        paddingCellCount={1}
        ref={this._tileGridRef}
        onClick={this._onViewClick}
        onDrag={this._onViewDrag}
        onMouseUp={this._onViewMouseUp}
      />
    );
  }
}
