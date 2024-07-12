import "./App.css";
import GameLayout from "./layouts/GameLayout";
import React, {
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import GameClient, { IErrorEvent } from "./lib/GameClient";
import { IGameStopEvent, IGameTickEvent } from "./lib/events/transEventTypes";
import { IDisconnectEvent } from "./lib/events/Transmitter";
import NavbarLayout from "./layouts/NavbarLayout";
import PopupLayout from "./layouts/PopupLayout";
import { IPopupOptions } from "./components/Popup";
import { update } from "@tweenjs/tween.js";
import Editor, { IStartTestingEvent, IStopTestingEvent } from "./lib/Editor";
import preventLongPressMenu from "./components/preventLongPressMenu";
import SmarterSuspense from "./components/SmarterSuspense";
// import ToolbarLayout from "./layouts/ToolbarLayout";
// import PageLayout from "./layouts/PageLayout";
// import EditorLayout from "./layouts/EditorLayout";
// import { fakeImport } from "./util/fakeImport";

/**
 * Keep the game running at 60fps
 * Do not change this value, otherwise the camera movement will be desynced with the character movement.
 * The character movement will look laggy.
 */
const UPDATE_INTERVAL = 1000 / 60;

// Get parameter `mode` from url
let gameClient: GameClient = new GameClient("/");
let started = false;
preventLongPressMenu();

export default function App() {
  const popupRef = useRef<PopupLayout>(null);
  const [showEditor, setShowEditor] = useState<boolean>(
    gameClient.editor != null && !gameClient.editor.isTesting
  );
  useEffect(() => {
    if (started) {
      return;
    }
    started = true;
    initGameClient(gameClient, popupRef);
    setInterval(update, UPDATE_INTERVAL);

    gameClient.editor?.on<IStartTestingEvent>("startTesting", (event) => {
      setShowEditor(false);
    });
    gameClient.editor?.on<IStopTestingEvent>("stopTesting", (event) => {
      setShowEditor(true);
    });
  }, []);

  // Render layouts
  let layouts: Array<ReactElement> = [
    <PopupLayout key="popup-layout" gameClient={gameClient} ref={popupRef} />,
  ];
  if (showEditor) {
    const ToolbarLayout = React.lazy(
      () =>
        // fakeImport("./layouts/ToolbarLayout", true)
        import("./layouts/ToolbarLayout")
    );
    const EditorLayout = React.lazy(
      () =>
        //  fakeImport("./layouts/EditorLayout", true)
        import("./layouts/EditorLayout")
    );
    layouts.push(
      <SmarterSuspense key="toolbar-layout" name="Toolbar Layout">
        <ToolbarLayout gameClient={gameClient} popupRef={popupRef} />
      </SmarterSuspense>
    );
    layouts.push(
      <SmarterSuspense key="editor-layout" name="Editor Layout">
        <EditorLayout
          editor={gameClient.editor as Editor}
          popupRef={popupRef}
          updateInterval={UPDATE_INTERVAL}
        />
      </SmarterSuspense>
    );
  } else {
    layouts.push(
      <NavbarLayout
        key="navbar-layout"
        gameClient={gameClient}
        popupRef={popupRef}
      />
    );
    layouts.push(
      <GameLayout
        key="game-layout"
        gameClient={gameClient}
        popupRef={popupRef}
      />
    );
  }
  const PageLayout = React.lazy(
    () =>
      //  fakeImport("./layouts/PageLayout", true)
      import("./layouts/PageLayout")
  );
  layouts.push(
    <SmarterSuspense key="page-layout" name="Page Layout">
      <PageLayout gameClient={gameClient} />
    </SmarterSuspense>
  );
  return <>{layouts}</>;
}

async function initGameClient(
  gameClient: GameClient,
  popupRef: React.RefObject<PopupLayout>
) {
  function show(options: IPopupOptions): Promise<any> {
    if (!popupRef.current) {
      alert(options.content);
      return Promise.resolve();
    }
    return popupRef.current.show(options);
  }
  function close() {
    if (!popupRef.current) {
      return;
    }
    popupRef.current.close();
  }
  function showError(title: string, message?: ReactNode) {
    if (!popupRef.current) {
      alert(`[Error] ${title}\n${message}`);
      return;
    }
    popupRef.current.error(title, message);
  }
  function showWarn(title: string, message?: ReactNode) {
    if (!popupRef.current) {
      alert(`[Warning] ${title}\n${message}`);
      return;
    }
    popupRef.current.warning(title, message);
  }

  gameClient.on<IDisconnectEvent>("disconnect", (event) => {
    show({
      type: "warning",
      title: "Disconnected from server",
      content: (
        <>
          This may happen due to the following reasons:
          <ul>
            <li key={1}>You have been idle for too long.</li>
            <li key={2}>You have more than one tab of this website opened.</li>
            <li key={3}>Bad network connection or server error.</li>
          </ul>
          <p>
            You can <b>Reload</b> the page to reconnect to the server.
          </p>
        </>
      ),
      onClose: () => {
        window.location.reload();
      },
      buttonLabels: ["Reload"],
      buttonActions: [null],
    });
  });

  gameClient.on<IErrorEvent>("error", (event) => {
    if (event.data.continuable) {
      showWarn(event.data.error.name, event.data.error.message);
      return;
    }
    showError(event.data.error.name, event.data.error.message);
  });

  gameClient.on<IGameStopEvent>("gameStop", (event) => {
    gameClient.once<IGameTickEvent>("gameTick", (event) => {
      close();
    });
    if (event.data.type == "pause") {
      let options: IPopupOptions = {
        type: "info",
        title: "Game Paused",
        content: (
          <>
            {event.data.reason} <br />
            {gameClient.isHost ? (
              "Please resume the game before idling for too long."
            ) : (
              <>
                Please wait for the game to resume.
                <br />
                You can also <b>Leave This Room</b> if you do not want to wait.
              </>
            )}
          </>
        ),
        showCloseButton: false,
      };
      if (gameClient.isHost) {
        options.buttonLabels = ["Resume Game"];
        options.buttonActions = [
          async () => {
            show({ title: "Resuming game...", showCloseButton: false });
            try {
              await gameClient.startGame();
            } catch (error) {
              showError(
                "Failed to resume game from server",
                (error as Error).message
              );
            }
          },
        ];
      } else {
        options.buttonLabels = ["Leave This Room"];
        options.buttonActions = [
          () => {
            gameClient.clearPublicID();
            window.location.reload();
          },
        ];
      }
      show(options);
      return;
    }
    if (event.data.type == "waiting") {
      let options: IPopupOptions = {
        type: "warning",
        title: "Waiting for players",
        content: (
          <>
            {event.data.reason}
            <br />
            Waiting player list:
            <ul>
              {event.data.waitingPlayerNames.map((playerName, index) => {
                return <li key={index}>{playerName}</li>;
              })}
            </ul>
          </>
        ),
      };
      if (gameClient.isHost) {
        options.buttonLabels = ["Kick Players"];
        options.buttonActions = [
          async () => {
            show({
              title: "Kicking players...",
              showCloseButton: false,
            });
            try {
              await gameClient.startGame(true);
            } catch (error) {
              showError(
                "Failed to kick players and force start game",
                (error as Error).message
              );
            }
          },
        ];
      }
      show(options);
      return;
    }

    if (event.data.type == "end") {
      let options: IPopupOptions = {
        type: "info",
        title: "The game has ended",
        content: (
          <>
            {event.data.reason}
            <br />
          </>
        ),
        onClose: () => {
          gameClient.clearPublicID();
          window.location.reload();
        },
        buttonLabels: ["Leave", "Rejoin"],
        buttonActions: [
          null,
          () => {
            window.location.reload();
          },
        ],
      };
      show(options);
      return;
    }
  });

  try {
    show({ title: "Loading...", showCloseButton: false });
    await gameClient.init();
    if (gameClient.joinRoomWarning) {
      show({
        type: "warning",
        title: `Failed to join room`,
        content: (
          <>
            <p>{gameClient.joinRoomWarning}</p>
            <p>
              We have redirected you to your own room ({gameClient.publicID}).{" "}
              <br />
              Please share the URL of this page with your friends to invite them
              to join your room.
            </p>
          </>
        ),
        buttonLabels: ["OK"],
        buttonActions: [null],
      });
    } else {
      close();
    }
  } catch (error) {
    let suggestMode = gameClient.isLocalGame ? "Online Mode" : "Local Mode";
    show({
      type: "error",
      title: `Faild to start in ${gameClient.mode} mode`,
      content: (
        <>
          <p>
            Please check your network connection and <b>Reload</b> the page or
            try run the game in <b>{suggestMode}</b> instead.
          </p>
          <details>
            <summary>Addtional Information</summary>
            <p>
              If nothing above works, please{" "}
              <b>
                <a
                  href="#"
                  onClick={() => {
                    gameClient.clearSession();
                    window.location.reload();
                  }}
                >
                  CLICK HERE
                </a>
              </b>{" "}
              to reset the game. Note that this will clear your game session.
            </p>
            <p>Error message: {(error as Error).message || String(error)}</p>
          </details>
        </>
      ),
      buttonLabels: ["Reload", suggestMode],
      buttonActions: [
        () => {
          window.location.reload();
        },
        () => {
          gameClient.mode = gameClient.isLocalGame
            ? GameClient.MODE_ONLINE
            : GameClient.MODE_LOCAL;
        },
      ],
    });

    return;
  }
}
