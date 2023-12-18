import React, { ReactNode, RefObject, useEffect, useState } from "react";
import Game from "../lib/Game";
import AnyEvent from "../lib/events/AnyEvent";
import PopupLayout from "./PopupLayout";
import EditorView from "../components/game/EditorView";
import Editor, { IDidLoadGameEvent, IWillUnloadGameEvent } from "../lib/Editor";
import MapCreator from "../components/game/MapCreator";

interface IProps {
  editor: Editor;
  popupRef: RefObject<PopupLayout>;
}

export default class EditorLayout extends React.Component<IProps> {
  // private _gameClient: GameClient;
  private _editor: Editor;
  private _game: Game | null;
  private _isLoading: boolean = false;

  constructor(props: IProps) {
    super(props);
    this._editor = props.editor;
    this._game = this._editor.game;
    this._onDidLoadGame = this._onDidLoadGame.bind(this);
    this._onWillUnloadGame = this._onWillUnloadGame.bind(this);
  }

  public componentDidMount(): void {
    this._editor.on<IDidLoadGameEvent>("didLoadGame", this._onDidLoadGame);
    this._editor.on<IWillUnloadGameEvent>(
      "willUnloadGame",
      this._onWillUnloadGame
    );
  }

  public componentWillUnmount(): void {
    this._editor.off<IDidLoadGameEvent>("didLoadGame", this._onDidLoadGame);
    this._editor.off<IWillUnloadGameEvent>(
      "willUnloadGame",
      this._onWillUnloadGame
    );
  }

  private _onDidLoadGame() {
    this._game = this._editor.game;
    this.forceUpdate();
  }

  private _onWillUnloadGame(event: AnyEvent<IWillUnloadGameEvent>) {
    this._game = null;
    this._isLoading = event.data.isLoading;
    this.forceUpdate();
  }

  public render() {
    let showEditor = this._game != null && !this._game.isDestroyed;
    let content: ReactNode;
    if (showEditor) {
      content = <EditorView key={Date.now()} editor={this._editor} />;
    } else if (this._isLoading) {
      content = null;
    } else {
      content = (
        <MapCreator
          key={Date.now()}
          editor={this._editor}
          popupRef={this.props.popupRef}
        />
      );
    }
    return <section id="editor">{content}</section>;
  }
}
