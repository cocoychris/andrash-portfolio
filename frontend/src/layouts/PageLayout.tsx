import React, { Component } from "react";
import PageView from "../components/PageView";
import GameClient, { IDidNewGameEvent } from "../lib/GameClient";
import { IDidSetUpdateEvent } from "../lib/data/DataHolder";
import Character from "../lib/Character";
import AnyEvent from "../lib/events/AnyEvent";
import "./PageLayout.css";

const WEBSITE_TITLE = "Playground by Andrash";
const PAGE_BASE_DIR = "/pages";

interface IProps {
  gameClient: GameClient;
}

export default class PageLayout extends Component<IProps> {
  private _pageRef = React.createRef<PageView>();
  private _character: Character | null = null;
  private _preventOpenPage: string | null = null;
  constructor(props: IProps) {
    document.title = WEBSITE_TITLE;
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
    // Close page on character move away
    if (this._pageRef.current?.page && character.isMoving) {
      setTimeout(() => {
        this._pageRef.current?.close();
        this._preventOpenPage = null;
      }, 300);
      return;
    }
    // Open page on character stopped on item
    let itemList = character.hitItem();
    if (!itemList) {
      this._preventOpenPage = null;
      return;
    }
    for (let item of itemList) {
      if (item.page && item.page !== this._preventOpenPage) {
        this._pageRef.current?.open(item.page);
        this._preventOpenPage = item.page;
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

  private _onOpen(page: string, title: string, offsetTop: number) {
    document.title = `${title && `${title} | `}${WEBSITE_TITLE}`;
    window.scrollTo({
      top: offsetTop || 0,
      behavior: "smooth",
    });
  }
  private _onClose() {
    document.title = WEBSITE_TITLE;
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
        gameClient={this.props.gameClient}
        ref={this._pageRef}
        baseDir={PAGE_BASE_DIR}
        onOpen={this._onOpen}
        onClose={this._onClose}
      />
    );
  }
}
