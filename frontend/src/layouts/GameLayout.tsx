import React, { ReactNode, RefObject, useEffect, useState } from "react";
import GameClient, {
  IDidNewGameEvent,
  IWillNewGameEvent,
} from "../lib/GameClient";
import Game from "../lib/Game";
import AnyEvent from "../lib/events/AnyEvent";
import GameView from "../components/game/GameView";
import PopupLayout from "./PopupLayout";
import { IDidSetUpdateEvent } from "../lib/data/DataHolder";
import Player from "../lib/Player";

interface IProps {
  gameClient: GameClient;
  popupRef: RefObject<PopupLayout>;
}

interface IState {
  game: Game | null;
}

export default class GameLayout extends React.Component<IProps, IState> {
  private _gameClient: GameClient;

  constructor(props: IProps) {
    super(props);
    this._gameClient = props.gameClient;
    this._onDidNewGame = this._onDidNewGame.bind(this);
    this._onWillNewGame = this._onWillNewGame.bind(this);
    this._onPlayerUpdate = this._onPlayerUpdate.bind(this);
    if (this._gameClient.game) {
      this._setPlayerEventListeners(this._gameClient.game);
    }
    this.state = {
      game: props.gameClient.game || null,
    };
  }

  public componentDidMount(): void {
    this._gameClient.on<IDidNewGameEvent>("didNewGame", this._onDidNewGame);
    this._gameClient.on<IWillNewGameEvent>("willNewGame", this._onWillNewGame);
  }

  public componentWillUnmount(): void {
    this._gameClient.off<IDidNewGameEvent>("didNewGame", this._onDidNewGame);
    this._gameClient.off<IWillNewGameEvent>("willNewGame", this._onWillNewGame);
  }

  private _onWillNewGame(event: AnyEvent<IWillNewGameEvent>) {
    let game = this.state.game;
    if (game) {
      this._removePlayerEventListeners(game);
    }
  }
  private _onDidNewGame(event: AnyEvent<IDidNewGameEvent>) {
    let newGame = this._gameClient.game as Game;
    this._setPlayerEventListeners(newGame);
    this.setState({ game: newGame });
  }

  private _setPlayerEventListeners(game: Game) {
    game.playerGroup.forEach((player) => {
      player.on<IDidSetUpdateEvent>("didSetUpdate", this._onPlayerUpdate);
    });
  }

  private _removePlayerEventListeners(game: Game) {
    game.playerGroup.forEach((player) => {
      player.off<IDidSetUpdateEvent>("didSetUpdate", this._onPlayerUpdate);
    });
  }

  private _onPlayerUpdate(event: AnyEvent<IDidSetUpdateEvent>) {
    if (event.data.changes.updateProps.includes("isOccupied")) {
      let player = event.target as Player;
      // Player joined
      if (player.isOccupied) {
        this.props.popupRef.current?.show({
          type: "success",
          title: `${player.name} joined the room`,
          timeout: 3000,
          showCloseButton: false,
        });
        return;
      }
      // Player left
      this.props.popupRef.current?.show({
        type: "warning",
        title: `${player.name} left the room`,
        timeout: 3000,
        showCloseButton: false,
      });
    }
  }

  public render() {
    let game = this.state.game;
    return (
      <section id="game">
        {game && !game.isDestroyed && <GameView key={game.id} game={game} />}
      </section>
    );
  }
}
