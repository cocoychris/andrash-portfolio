import React, { ReactNode } from "react";
import Game from "../../lib/Game";
import "./GameView.css";
import Position from "../../lib/Position";
import Character from "../../lib/Character";
import Player from "../../lib/Player";
import { IDidSetUpdateEvent } from "../../lib/DataHolder";
import AnyEvent from "../../lib/events/AnyEvent";
import MapView, { IMouseInfo, IPoint } from "./MapView";
import { IIndexable } from "../../lib/data/util";

const MIN_VISIBLE_TILE_COUNT = 5;
const EASE_DURATION = 500;
const EASE_DELAY = 16;

interface IProps {
  game: Game;
}
interface IState {}

export default class GameView extends React.Component<IProps, IState> {
  private _game: Game;
  private _mainPlayer: Player;
  private _mainCharacter: Character;
  private _mapViewRef = React.createRef<MapView>();

  private get _mapView(): MapView {
    if (!this._mapViewRef.current) {
      throw new Error("MapView is not mounted");
    }
    return this._mapViewRef.current;
  }

  public state: Readonly<IState> = {};

  constructor(props: IProps) {
    console.log("GameView");
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
      this._mapView.ease(
        this._mainCharacter.position,
        EASE_DURATION,
        EASE_DELAY
      );
    }
  }

  private _onViewClick(mouseInfo: IMouseInfo): boolean {
    // Clearing previous target
    if (this._mainPlayer.target) {
      this._mapView.updateTileDisplay(this._mainPlayer.target);
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
      <MapView
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
