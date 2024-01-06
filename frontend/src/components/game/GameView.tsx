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
  private _mapViewRef = React.createRef<TileGrid>();

  private get _mapView(): TileGrid {
    if (!this._mapViewRef.current) {
      throw new Error("TileGrid is not mounted");
    }
    return this._mapViewRef.current;
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
  }

  private _onCharacterUpdate(event: AnyEvent<IDidSetUpdateEvent>) {
    if (!event.data.changes.isChanged) {
      return;
    }
    // console.log("onCharacterUpdate");
    let positionDict: IIndexable = {};
    this._game.characterGroup.forEach((character: Character) => {
      positionDict[character.position.toString()] = character.position;
      positionDict[character.prevPosition.toString()] = character.prevPosition;
    });
    Object.values(positionDict).forEach((position: Position) => {
      this._mapView.updateTileDisplay(position);
    });
    if (this._mainCharacter.isMoving) {
      this._mapView.ease(this._mainCharacter.position, EASE_DURATION);
    }
  }

  private _onViewClick(mouseInfo: IMouseInfo): boolean {
    // Clearing previous target
    if (this._mainPlayer.stagedTarget) {
      this._mapView.updateTileDisplay(this._mainPlayer.stagedTarget);
    }
    // Setting new target
    this._mainPlayer.target = mouseInfo.position.floor();
    return true;
  }

  public componentDidMount() {
    this._game.characterGroup.on<IDidSetUpdateEvent>(
      "didSetUpdate",
      this._onCharacterUpdate
    );
  }

  public componentWillUnmount() {
    this._game.characterGroup.off<IDidSetUpdateEvent>(
      "didSetUpdate",
      this._onCharacterUpdate
    );
  }

  public render() {
    return (
      <TileGrid
        className="gameView debugOff"
        game={this._game}
        initPosition={this._mainCharacter.position}
        minVisibleTileCount={MIN_VISIBLE_TILE_COUNT}
        ref={this._mapViewRef}
        onClick={this._onViewClick}
      />
    );
  }
}
