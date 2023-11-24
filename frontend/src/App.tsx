import "./App.css";
import GameLayout from "./layouts/GameLayout";
import { ReactNode, useEffect, useRef } from "react";
import GameClient, { IErrorEvent } from "./lib/GameClient";
import { IGameStopEvent, IGameTickEvent } from "./lib/events/transEventTypes";
import { IConnectEvent, IDisconnectEvent } from "./lib/events/Transmitter";
import NavbarLayout from "./layouts/NavbarLayout";
import PopupLayout from "./layouts/PopupLayout";
import { IPopupOptions } from "./components/Popup";
import { update } from "@tweenjs/tween.js";
const UPDATE_INTERVAL = 16;
let started = false;
let gameClient: GameClient = new GameClient("/");

function App() {
  console.log("App");
  const popupRef = useRef<PopupLayout>(null);
  useEffect(() => {
    if (started) {
      return;
    }
    started = true;
    startGaneClient();
    setInterval(update, UPDATE_INTERVAL);
  }, []);

  function popupOpen(options: IPopupOptions): Promise<any> {
    if (!popupRef.current) {
      return Promise.reject("PopupLayout is not mounted");
    }
    return popupRef.current.open(options);
  }
  function popupClose() {
    popupRef.current?.close();
  }
  function popupError(title: string, message?: ReactNode) {
    popupRef.current?.error(title, message);
  }
  function popupWarning(title: string, message?: ReactNode) {
    popupRef.current?.warning(title, message);
  }

  function startGaneClient() {
    // Set up gameClient event listeners
    gameClient.on<IConnectEvent>("connect", async (event) => {
      try {
        let response = await gameClient.authenticate();
        if (response.joinRoomWarning) {
          await popupOpen({
            type: "warning",
            title: `Failed to join room`,
            content: (
              <>
                <p>{response.joinRoomWarning}</p>
                <p>
                  We have redirected you to your own room ({response.publicID}).{" "}
                  <br />
                  Please share the URL of this page with your friends to invite
                  them to join your room.
                </p>
              </>
            ),
            buttonLabels: ["OK"],
            buttonActions: [null],
          });
        }
      } catch (error) {
        // Authenticate failed
        popupError(
          "Failed to authenticate with server",
          (error as Error).message
        );
        return;
      }
      // Authenticate success
      await runServerGame();
    });

    gameClient.on<IDisconnectEvent>("disconnect", (event) => {
      popupOpen({
        type: "warning",
        title: "Disconnected from server",
        content: (
          <>
            This may happen due to the following reasons:
            <ul>
              <li key={1}>You have been idle for too long.</li>
              <li key={2}>
                You have more than one tab of this website opened.
              </li>
              <li key={3}>Network connection lost, server error or restart.</li>
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
        popupWarning(event.data.error.name, event.data.error.message);
        return;
      }
      popupError(event.data.error.name, event.data.error.message);
    });

    gameClient.on<IGameStopEvent>("gameStop", (event) => {
      gameClient.once<IGameTickEvent>("gameTick", (event) => {
        popupClose();
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
                  You can also <b>Leave This Room</b> if you do not want to
                  wait.
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
              popupOpen({ title: "Resuming game...", showCloseButton: false });
              try {
                await gameClient.startGame();
              } catch (error) {
                popupError(
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
        popupOpen(options);
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
              popupOpen({
                title: "Kicking players...",
                showCloseButton: false,
              });
              try {
                await gameClient.startGame(true);
              } catch (error) {
                popupError(
                  "Failed to kick players and force start game",
                  (error as Error).message
                );
              }
            },
          ];
        }
        popupOpen(options);
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
        popupOpen(options);
        return;
      }
    });
    // Start gameClient
    // Has local game data - run local game
    if (gameClient.hasLocalGameData) {
      console.log("Has local game data - run local game");
      runLocalGame();
    } else {
      console.log("No local game data - connect to server");
      // No local game data - connect to server
      gameClient.connect();
    }
  }

  async function runServerGame(mapID?: string) {
    console.log("runServerGame");
    try {
      popupOpen({ title: "Loading...", showCloseButton: false });
      await gameClient.loadGame({
        isLocalGame: false,
        tickInterval: undefined,
        mapID: mapID,
      });
    } catch (error) {
      popupError("Failed to load game from server", (error as Error).message);
      return;
    }
    try {
      // await delay(5000); // For testing
      await gameClient.startGame();
      popupClose();
    } catch (error) {
      popupError("Failed to start game from server", (error as Error).message);
      return;
    }
  }

  async function runLocalGame(mapID?: string) {
    console.log("runLocalGame");
    try {
      await gameClient.loadGame({
        isLocalGame: true,
        tickInterval: undefined,
        mapID,
      });
    } catch (error) {
      popupError("Failed to run game on local", (error as Error).message);
      return;
    }

    // Notify user that the game is running in local mode
    popupOpen({
      type: "warning",
      title: "Local Mode",
      content: (
        <>
          <p>You are currently playing in local mode.</p>
          <p>
            This feature allows you to play the game even with a poor network
            connection or server errors. <br />
          </p>
          <p>
            Please note that in this mode, the multiplayer feature will not be
            available.{" "}
          </p>
          Available actions:
          <ul>
            <li key={0}>
              <b>Continue</b> the game in local mode.
            </li>
            <li key={1}>
              Start a <b>New Game</b> in online mode.
            </li>
          </ul>
        </>
      ),
      onClose: () => {
        gameClient.startGame();
      },
      buttonLabels: ["Continue", "New Game"],
      buttonActions: [
        null,
        () => {
          gameClient.clearSession();
          window.location.reload();
        },
      ],
    });
  }

  return (
    <>
      <PopupLayout
        gameClient={gameClient}
        onRunLocalGame={runLocalGame}
        ref={popupRef}
      />
      <NavbarLayout
        gameClient={gameClient}
        onRunServerGame={runServerGame}
        onRunLocalGame={runLocalGame}
      />
      <GameLayout gameClient={gameClient} />
    </>
  );
}
export default App;
