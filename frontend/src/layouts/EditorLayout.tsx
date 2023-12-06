import React, { ReactNode, RefObject, useEffect, useState } from "react";
import Game from "../lib/Game";
import AnyEvent from "../lib/events/AnyEvent";
import PopupLayout from "./PopupLayout";
import EditorView from "../components/game/EditorView";
import Editor, {
  IDidLoadMapEvent,
  IDisposeMapEvent,
  INewMapOptions,
} from "../lib/Editor";
import MapCreator from "../components/game/MapCreator";

interface IProps {
  editor: Editor;
  popupRef: RefObject<PopupLayout>;
}

interface IState {
  game: Game | null;
}

export default class EditorLayout extends React.Component<IProps, IState> {
  // private _gameClient: GameClient;
  private _editor: Editor;

  constructor(props: IProps) {
    super(props);
    this._editor = props.editor;
    this._onDidLoadMap = this._onDidLoadMap.bind(this);
    this._onDisposeMap = this._onDisposeMap.bind(this);
    this.state = {
      game: this._editor.game,
    };
  }

  public componentDidMount(): void {
    this._editor.on<IDidLoadMapEvent>("didLoadMap", this._onDidLoadMap);
    this._editor.on<IDisposeMapEvent>("disposeMap", this._onDisposeMap);
  }

  public componentWillUnmount(): void {
    this._editor.off<IDidLoadMapEvent>("didLoadMap", this._onDidLoadMap);
    this._editor.off<IDisposeMapEvent>("disposeMap", this._onDisposeMap);
    // let game = this.state.game;
    // if (game) {
    //   // Clean up listeners for old game
    // }
  }

  private _onDidLoadMap(event: AnyEvent<IDidLoadMapEvent>) {
    // let game = this.state.game;
    // if (game) {
    //   // Clean up listeners for old game
    // }
    let newGame = this._editor.game;
    this.setState({ game: newGame });
  }

  private _onDisposeMap(event: AnyEvent<IDisposeMapEvent>) {
    this.setState({ game: null });
  }

  public render() {
    let game = this.state.game;
    return (
      <section id="editor">
        {game ? (
          <EditorView key={game.id} editor={this._editor} />
        ) : (
          <MapCreator editor={this._editor} />
        )}
      </section>
    );
  }
}
