import React, { ReactNode } from "react";
import Game from "../../lib/Game";
import "./GameView.css";
import Position from "../../lib/Position";
import Character from "../../lib/Character";
import Player from "../../lib/Player";
import { IDidSetUpdateEvent } from "../../lib/data/DataHolder";
import AnyEvent from "../../lib/events/AnyEvent";
import TileGrid, { IMouseInfo, IPoint } from "./TileGrid";
import { IIndexable } from "../../lib/data/util";
import {
  IDidAddMemberEvent,
  IDidRemoveMemberEvent,
} from "../../lib/data/Group";
import { IWillDestroyEvent } from "../../lib/Destroyable";

const MIN_VISIBLE_TILE_COUNT = 5;
const EASE_DURATION = 500;

interface IProps {
  game: Game;
}
interface IState {}

export default class GameView extends React.Component<IProps, IState> {
  private _game: Game;
  private _mainPlayer: Player;
  private _mainCharacter: Character;
  private _tileGridRef = React.createRef<TileGrid>();

  private get _tileGrid(): TileGrid {
    if (!this._tileGridRef.current) {
      throw new Error("TileGrid is not mounted");
    }
    return this._tileGridRef.current;
  }

  public state: Readonly<IState> = {};

  constructor(props: IProps) {
    super(props);
    const { game } = props;
    this._mainPlayer = game.playerGroup.mainPlayer as Player;
    if (!this._mainPlayer) {
      throw new Error("this._mainPlayer is null");
    }
    this._mainCharacter = this._mainPlayer.character;
    this._game = game;
    this._onViewClick = this._onViewClick.bind(this);
    this._onCharacterUpdate = this._onCharacterUpdate.bind(this);
    this._onAddCharacter = this._onAddCharacter.bind(this);
    this._onRemoveCharacter = this._onRemoveCharacter.bind(this);
  }

  private _onCharacterUpdate(event: AnyEvent<IDidSetUpdateEvent>) {
    if (!event.data.changes.isChanged) {
      return;
    }
    let character = event.target as Character;
    // console.log("onCharacterUpdate", character.id, character.position);
    this._tileGrid.updateTileDisplay(character.position);
    if (character.isMoving) {
      this._tileGrid.updateTileDisplay(character.prevPosition);
      if (character === this._mainCharacter) {
        this._tileGrid.ease(this._mainCharacter.position, EASE_DURATION);
      }
    }
  }

  private _onViewClick(mouseInfo: IMouseInfo): boolean {
    // Clearing previous target
    if (this._mainPlayer.stagedTarget) {
      this._tileGrid.updateTileDisplay(this._mainPlayer.stagedTarget);
    }
    // Setting new target
    this._mainPlayer.target = mouseInfo.position.floor();
    return true;
  }

  public componentDidMount() {
    this._game.characterGroup.forEach((character: Character) => {
      character.on<IDidSetUpdateEvent>("didSetUpdate", this._onCharacterUpdate);
    });
    this._game.characterGroup.on<IDidAddMemberEvent>(
      "didAddMember",
      this._onAddCharacter
    );
    this._game.characterGroup.on<IDidRemoveMemberEvent>(
      "didRemoveMember",
      this._onRemoveCharacter
    );
    this._game.once<IWillDestroyEvent>("willDestroy", () => {
      this.componentWillUnmount();
    });
  }

  public componentWillUnmount() {
    if (this._game.isDestroyed) {
      return;
    }
    this._game.characterGroup.forEach((character: Character) => {
      character.off<IDidSetUpdateEvent>(
        "didSetUpdate",
        this._onCharacterUpdate
      );
    });
    this._game.characterGroup.off<IDidAddMemberEvent>(
      "didAddMember",
      this._onAddCharacter
    );
    this._game.characterGroup.off<IDidRemoveMemberEvent>(
      "didRemoveMember",
      this._onRemoveCharacter
    );
  }

  private _onAddCharacter(event: AnyEvent<IDidAddMemberEvent>) {
    let character = event.data.member as Character;
    this._tileGrid.updateTileDisplay(character.position);
    character.on<IDidSetUpdateEvent>("didSetUpdate", this._onCharacterUpdate);
  }
  private _onRemoveCharacter(event: AnyEvent<IDidRemoveMemberEvent>) {
    let character = event.data.member as Character;
    this._tileGrid.updateTileDisplay(character.position);
    character.off<IDidSetUpdateEvent>("didSetUpdate", this._onCharacterUpdate);
  }

  public render() {
    return (
      <TileGrid
        className="gameView debugOff"
        game={this._game}
        initPosition={this._mainCharacter.position}
        minVisibleTileCount={MIN_VISIBLE_TILE_COUNT}
        ref={this._tileGridRef}
        onClick={this._onViewClick}
      />
    );
  }
}
