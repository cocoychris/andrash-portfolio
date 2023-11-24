import React, { ReactNode } from "react";
import Game from "../../lib/Game";
import "./index.css";
import Position from "../../lib/Position";
import Character, { IMoveEvent } from "../../lib/Character";
import Player from "../../lib/Player";
import { IDidSetUpdateEvent } from "../../lib/DataHolder";
import AnyEvent from "../../lib/events/AnyEvent";
import MapView, { IPoint } from "./MapView";

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
    this._onGameUpdate = this._onGameUpdate.bind(this);
    this._onCharacterMove = this._onCharacterMove.bind(this);
    this._onViewClick = this._onViewClick.bind(this);
  }

  private _onGameUpdate(event: AnyEvent<IDidSetUpdateEvent>) {
    if (!event.data.changes.isChanged) {
      return;
    }
    // Do something
  }

  private _onCharacterMove(event: AnyEvent<IMoveEvent>) {
    // console.log("onCharacterMove");
    this._mapView.ease(this._mainCharacter.position, EASE_DURATION, EASE_DELAY);
  }

  private _onViewClick(position: Position, point: IPoint) {
    console.log("onViewClick", position, point);
    this._mainPlayer.target = position.floor();
    return true;
  }

  public componentDidMount() {
    this._game.on<IDidSetUpdateEvent>("didSetUpdate", this._onGameUpdate);
    this._mainCharacter.on<IMoveEvent>("move", this._onCharacterMove);
  }

  public componentWillUnmount() {
    this._game.off<IDidSetUpdateEvent>("didSetUpdate", this._onGameUpdate);
    this._mainCharacter.off<IMoveEvent>("move", this._onCharacterMove);
  }

  public render() {
    return (
      <MapView
        game={this._game}
        initPosition={this._mainCharacter.position}
        minVisibleTileCount={MIN_VISIBLE_TILE_COUNT}
        ref={this._mapViewRef}
        onClick={this._onViewClick}
      />
    );
  }
}
