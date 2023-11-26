import React, { Component } from "react";
import PageView from "../components/PageView";
import { create } from "domain";
import GameClient, { IDidNewGameEvent } from "../lib/GameClient";
import Game from "../lib/Game";
import { IDidSetUpdateEvent } from "../lib/DataHolder";
import Character from "../lib/Character";
import AnyEvent from "../lib/events/AnyEvent";

const PAGE_BASE_DIR = "/pages";

interface IProps {
  gameClient: GameClient;
}
interface IState {
  //
}

export default class PageLayout extends Component<IProps, IState> {
  private _pageRef = React.createRef<PageView>();
  private _character: Character | null = null;
  constructor(props: IProps) {
    super(props);
    this._onDidNewGame = this._onDidNewGame.bind(this);
    this._onCharacterUpdate = this._onCharacterUpdate.bind(this);
    this._onOpen = this._onOpen.bind(this);
    this._onClose = this._onClose.bind(this);
    props.gameClient.on<IDidNewGameEvent>("didNewGame", this._onDidNewGame);
  }

  private _onDidNewGame() {
    if (this._character) {
      this._character.off<IDidSetUpdateEvent>(
        "didSetUpdate",
        this._onCharacterUpdate
      );
    }
    this._character =
      this.props.gameClient.game?.playerGroup.mainPlayer?.character || null;
    if (!this._character) {
      return;
    }
    this._character.on<IDidSetUpdateEvent>(
      "didSetUpdate",
      this._onCharacterUpdate
    );
  }

  private _onCharacterUpdate(event: AnyEvent<IDidSetUpdateEvent>) {
    let character = this._character as Character;
    if (!event.data.changes.isChanged) {
      return;
    }
    if (this._pageRef.current?.page && character.isMoving) {
      setTimeout(() => {
        this._pageRef.current?.close();
      }, 300);
      return;
    }
    let itemList = character.hitItem();
    if (!itemList) {
      return;
    }
    for (let item of itemList) {
      if (item.page) {
        this._pageRef.current?.open(item.page);
        break;
      }
    }
  }

  public componentWillUnmount(): void {
    this.props.gameClient.off<IDidNewGameEvent>(
      "didNewGame",
      this._onDidNewGame
    );
  }

  private _onOpen(page: string, offsetTop: number) {
    window.scrollTo({
      top: offsetTop || 0,
      behavior: "smooth",
    });
  }
  private _onClose() {
    if (window.scrollY < 100) {
      return;
    }
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  public render() {
    return (
      <PageView
        ref={this._pageRef}
        baseDir={PAGE_BASE_DIR}
        onOpen={this._onOpen}
        onClose={this._onClose}
      />
    );
  }
}
