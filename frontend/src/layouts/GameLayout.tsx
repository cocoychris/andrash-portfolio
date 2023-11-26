import React, { ReactNode, RefObject, useEffect, useState } from "react";
import GameClient, { IDidNewGameEvent } from "../lib/GameClient";
import Game from "../lib/Game";
import AnyEvent from "../lib/events/AnyEvent";
import GameView from "../components/GameView";
import PopupLayout from "./PopupLayout";
import { IDidSetUpdateEvent } from "../lib/DataHolder";
import { type } from "os";

interface IProps {
  gameClient: GameClient;
  popupRef: RefObject<PopupLayout>;
}

interface IState {
  game: Game | null;
}

export default class GameLayout extends React.Component<IProps, IState> {
  private _gameClient: GameClient;
  private _playerIDDict: { [key: string]: boolean } = {};

  constructor(props: IProps) {
    super(props);
    this._gameClient = props.gameClient;
    this._onNewGame = this._onNewGame.bind(this);
    this._onPlayerGroupUpdate = this._onPlayerGroupUpdate.bind(this);
    this._gameClient.game?.playerGroup.on<IDidSetUpdateEvent>(
      "didSetUpdate",
      this._onPlayerGroupUpdate
    );
    this.state = {
      game: props.gameClient.game || null,
    };
  }

  public componentDidMount(): void {
    this._gameClient.on<IDidNewGameEvent>("didNewGame", this._onNewGame);
  }

  public componentWillUnmount(): void {
    this._gameClient.off<IDidNewGameEvent>("didNewGame", this._onNewGame);
    let game = this.state.game;
    if (game) {
      game.playerGroup.off<IDidSetUpdateEvent>(
        "didSetUpdate",
        this._onPlayerGroupUpdate
      );
    }
  }

  private _onPlayerGroupUpdate(event: AnyEvent<IDidSetUpdateEvent>) {
    if (!event.data.changes.isChanged) {
      return;
    }
    let game = this.state.game;
    if (!game) {
      return;
    }
    let addedPlayerList = game.playerGroup.filter((player) => {
      if (player.isOccupied && !this._playerIDDict[player.id]) {
        this._playerIDDict[player.id] = true;
        return true;
      }
      return false;
    });
    if (addedPlayerList.length > 0) {
      let addedNameList = addedPlayerList.map((player) => player.name);
      console.log("GameLayout onPlayerGroupUpdate", addedNameList);
      this.props.popupRef.current?.open({
        type: "success",
        title: `${addedNameList.length} player(s) joined the room`,
        content: (
          <ul>
            {addedNameList.map((name, index) => (
              <li key={index}>{name}</li>
            ))}
          </ul>
        ),
        timeout: 3000,
        showCloseButton: false,
      });
      return;
    }
    let removePlayerList = game.playerGroup.filter((player) => {
      if (!player.isOccupied && this._playerIDDict[player.id]) {
        this._playerIDDict[player.id] = false;
        return true;
      }
      return false;
    });
    if (removePlayerList.length > 0) {
      let removeNameList = removePlayerList.map((player) => player.name);
      this.props.popupRef.current?.open({
        type: "warning",
        title: `${removeNameList.length} player(s) left the room`,
        content: (
          <ul>
            {removeNameList.map((name, index) => (
              <li key={index}>{name}</li>
            ))}
          </ul>
        ),
        timeout: 3000,
        showCloseButton: false,
      });
      return;
    }
  }

  private _onNewGame(event: AnyEvent<IDidNewGameEvent>) {
    let game = this.state.game;
    if (game) {
      game.playerGroup.off<IDidSetUpdateEvent>(
        "didSetUpdate",
        this._onPlayerGroupUpdate
      );
    }
    let newGame = this._gameClient.game as Game;
    newGame.playerGroup.on<IDidSetUpdateEvent>(
      "didSetUpdate",
      this._onPlayerGroupUpdate
    );
    this.setState({ game: newGame });
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
