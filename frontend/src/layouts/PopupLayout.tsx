import React, { ReactNode, createRef } from "react";
import Popup, { IPopupOptions } from "../components/Popup";
import GameClient from "../lib/GameClient";

interface IProps {
  gameClient: GameClient;
  onRunLocalGame: () => void;
}

export default class PopupLayout extends React.Component<IProps> {
  private popupRef = createRef<Popup>();

  public open(options: IPopupOptions): Promise<any> {
    if (!this.popupRef.current) {
      return Promise.reject("PopupLayout is not mounted");
    }
    return this.popupRef.current.open(options);
  }

  public close() {
    if (!this.popupRef.current) {
      return;
    }
    this.popupRef.current.close();
  }

  public error(title: string, message?: ReactNode) {
    let gameClient = this.props.gameClient;
    title = title ? String(title) : "";
    title = title.startsWith("Error") ? title.substring(6) : title;
    title = title.startsWith(":") ? title.substring(1) : title;
    let itemList: Array<ReactNode> = [
      <>
        <b>Reload</b> to try restore your game session.
      </>,
      <>
        Start a <b>New Game</b> with current session dropped.
      </>,
    ];
    let buttonLabels: Array<string> = ["Reload", "New Game"];
    let buttonActions: Array<any> = [
      () => {
        window.location.reload();
      },
      () => {
        gameClient.clearSession();
        window.location.reload();
      },
    ];
    if (!gameClient.isLocalGame) {
      itemList.push(
        <>
          Start a new game in <b>Local Mode</b> to avoid network or server
          issues.
        </>
      );
      buttonLabels.push("Local Mode");
      buttonActions.push(this.props.onRunLocalGame);
    }
    this.open({
      type: "error",
      title: <>Error｜{title}</>,
      content: (
        <>
          {message && <p>{message}</p>}
          Available actions:
          <ul>
            {itemList.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      ),
      onClose: buttonActions[0],
      buttonLabels,
      buttonActions,
    });
  }

  public warning(title: string, message?: ReactNode) {
    let gameClient = this.props.gameClient;
    title = title ? String(title) : "";
    title = title.startsWith("Error") ? title.substring(6) : title;
    title = title.startsWith(":") ? title.substring(1) : title;
    title = title ? `Warning - ${title}` : "Warning";
    let itemList: Array<ReactNode> = [
      <>
        <b>Dismiss</b> this message and see if the game can continue.
      </>,
      <>
        <b>Reload</b> to try restore your game session.
      </>,
      <>
        Start a <b>New Game</b> with current session dropped.
      </>,
    ];
    let buttonLabels: Array<string> = ["Dismiss", "Reload", "New Game"];
    let buttonActions: Array<any> = [
      () => {
        this.close();
      },
      () => {
        window.location.reload();
      },
      () => {
        gameClient.clearSession();
        window.location.reload();
      },
    ];
    if (!gameClient.isLocalGame) {
      itemList.push(
        <>
          Start a new game in <b>Local Mode</b> to avoid network or server
          issues.
        </>
      );
      buttonLabels.push("Local Mode");
      buttonActions.push(this.props.onRunLocalGame);
    }
    this.open({
      type: "warning",
      title,
      content: (
        <>
          {message && <p>{message}</p>}
          Available actions:
          <ul>
            {itemList.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      ),
      onClose: buttonActions[0],
      buttonLabels,
      buttonActions,
    });
  }

  render() {
    return <Popup ref={this.popupRef} />;
  }
}
