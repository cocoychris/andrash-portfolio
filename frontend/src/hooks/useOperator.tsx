import screenfull from "screenfull";
import { ReactComponent as MenuIcon } from "../assets/icons/menu-svgrepo-com.svg";
import { ReactComponent as BellIcon } from "../assets/icons/bell-svgrepo-com.svg";
import { ReactComponent as RightIcon } from "../assets/icons/chevron-right-svgrepo-com.svg";
import { ReactComponent as CommentIcon } from "../assets/icons/comment-svgrepo-com.svg";
import { ReactComponent as LockIcon } from "../assets/icons/lock-svgrepo-com.svg";
import { ReactComponent as LeftIcon } from "../assets/icons/chevron-left-svgrepo-com.svg";
import { ReactComponent as PersonIcon } from "../assets/icons/person-svgrepo-com.svg";
import { ReactComponent as PeopleIcon } from "../assets/icons/people-svgrepo-com.svg";
import { ReactComponent as HomeIcon } from "../assets/icons/home-svgrepo-com.svg";

import { ReactNode, useEffect, useState } from "react";
import Game from "../lib/Game";
import GameClient, {
  IDidNewGameEvent,
  IErrorEvent,
  IWillNewGameEvent,
} from "../lib/GameClient";
import { IGameStopEvent, IGameTickEvent } from "../lib/events/transEventTypes";
import { IConnectEvent, IDisconnectEvent } from "../lib/events/Transmitter";
import { delay } from "../lib/data/util";

import { IPopupOptions } from "../components/Popup";
import { INavItemData } from "../components/Navbar";
import { IDropItemData } from "../components/DropdownMenu";
import { IDidSetUpdateEvent } from "../lib/DataHolder";
import AnyEvent from "../lib/events/AnyEvent";

let setPopup: (props: IPopupOptions | null) => void;
let setGame: (game: Game | null) => void;
let setNavbar: (dataList: Array<INavItemData> | null) => void;
let gameClient: GameClient;

export default function useOperator() {
  const [popupOptions, _setPopup] = useState<IPopupOptions | null>({
    title: "Loading...",
  });
  const [game, _setGame] = useState<Game | null>(null);
  const [navbarData, _setNavbar] = useState<Array<INavItemData> | null>(null);

  useEffect(() => {
    if (!gameClient) {
      setGame = _setGame;
      setNavbar = _setNavbar;
      setPopup = initPopup(_setPopup);
      gameClient = initGameClient();
      updateNavbar();
    }
  }, []);
  return { popupOptions, game, navbarData };
}

function initPopup(
  _setPopup: (props: IPopupOptions | null) => void
): (props: IPopupOptions | null) => void {
  return function (options: IPopupOptions | null): Promise<number | void> {
    return new Promise((resolve, reject) => {
      if (!options) {
        _setPopup(null);
        resolve();
        return;
      }
      let closeFunc = options.onClose;
      if (closeFunc) {
        options.onClose = async () => {
          try {
            closeFunc && (await closeFunc());
            resolve(0);
          } catch (error) {
            reject(error);
          }
        };
      }
      if (options.buttonActions) {
        options.buttonActions = options.buttonActions.map((action, index) => {
          if (!action) {
            return async () => {
              try {
                closeFunc && (await closeFunc());
                resolve(index);
              } catch (error) {
                reject(error);
              }
            };
          }
          return async () => {
            try {
              await action();
              resolve(index);
            } catch (error) {
              reject(error);
            }
          };
        });
      }
      _setPopup(options);
    });
  };
}

function errorPopup(title: string, message?: ReactNode) {
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
        Start a new game in <b>Local Mode</b> to avoid network or server issues.
      </>
    );
    buttonLabels.push("Local Mode");
    buttonActions.push(runLocalGame);
  }
  setPopup({
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

function warningPopup(title: string, message?: ReactNode) {
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
      setPopup(null);
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
        Start a new game in <b>Local Mode</b> to avoid network or server issues.
      </>
    );
    buttonLabels.push("Local Mode");
    buttonActions.push(runLocalGame);
  }
  setPopup({
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

function updateNavbar() {
  let playerGroup = gameClient.game?.playerGroup;
  let hostPlayer = playerGroup?.hostPlayer;
  let mainPlayer = playerGroup?.mainPlayer;
  let playerList = playerGroup?.list() || [];
  let isHost = gameClient.isHost;

  let playerDataList: Array<IDropItemData> = [];
  playerDataList.push({
    id: "players",
    label: <h3 style={{ paddingLeft: "15px" }}>Game Players:</h3>,
  });
  playerDataList.push({
    id: "host",
    label: `${hostPlayer?.name} [Host]${
      hostPlayer?.isOccupied ? "" : " [Offline]"
    }${hostPlayer == mainPlayer ? " [You]" : ""}`,
    leftIcon: "🤴",
    isEnabled: hostPlayer?.isOccupied,
  });
  let playerAvailable = false;
  playerDataList = playerDataList.concat(
    playerList
      .filter((player) => player != hostPlayer)
      .map((player) => {
        if (!player.isOccupied) {
          playerAvailable = true;
        }
        return {
          id: String(player.id),
          label: `${player.name}${player.isOccupied ? "" : " [offline]"}${
            player == mainPlayer ? " [You]" : ""
          }`,
          leftIcon: <PersonIcon />,
          isEnabled: player.isOccupied,
        };
      })
  );
  if (playerAvailable) {
    playerDataList.push({
      id: "join",
      label: <>Invite your friend to this world!</>,
      leftIcon: "⚽",
      rightIcon: <RightIcon />,
      menuData: [
        {
          id: "1",
          label: <>Just share the URL of this page with your friend!</>,
          leftIcon: "☝️",
          goBack: true,
        },
      ],
    });
  }

  let navItemDataList: Array<INavItemData> = [
    {
      id: "fullscreen",
      icon: "➕",
      onClick: () => {
        screenfull.toggle();
        return false;
      },
      isEnabled: true,
    },
    {
      id: "players",
      icon: <PeopleIcon />,
      menuData: playerDataList,
    },
    {
      id: "menu",
      icon: <MenuIcon />,
      menuData: [
        {
          id: "hello",
          label: (
            <h3 style={{ paddingLeft: "15px", fontSize: "22px" }}>
              Hello <b>{mainPlayer?.name}</b>!
            </h3>
          ),
        },
        {
          id: "room",
          label: `You're at ${
            isHost ? `your own` : `${hostPlayer?.name}'s`
          } room.`,
          leftIcon: <HomeIcon />,
        },
        {
          id: "pause",
          label: "Pause Game",
          leftIcon: "⏸️",
          onClick: () => {
            gameClient.stopGame();
            return true;
          },
          isEnabled: isHost,
        },
        {
          id: "restart",
          label: "New Game",
          leftIcon: "♟️",
          onClick: () => {
            runServerGame("default"); //Specify mapID to start a new game
            return true;
          },
          isEnabled: isHost,
        },
        {
          id: "leave",
          label: "Leave this room",
          leftIcon: "🚪",
          onClick: () => {
            gameClient.clearPublicID();
            window.location.reload();
            return true;
          },
          isEnabled: !isHost,
        },
        {
          id: "newSession",
          label: "New room with new identity",
          leftIcon: "💡",
          onClick: () => {
            gameClient.clearSession();
            window.location.reload();
            return true;
          },
          isEnabled: isHost,
        },
      ],
    },
    {
      id: "notification",
      icon: <BellIcon />,
    },
  ];

  setNavbar(navItemDataList);
}

function initGameClient() {
  // Create GameClient
  gameClient = new GameClient("/");
  gameClient.on<IConnectEvent>("connect", async (event) => {
    try {
      let response = await gameClient.authenticate();
      if (response.joinRoomWarning) {
        await setPopup({
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
          onClose: () => {
            setPopup(null);
          },
          buttonLabels: ["OK"],
          buttonActions: [null],
        });
      }
    } catch (error) {
      // Authenticate failed
      errorPopup(
        "Failed to authenticate with server",
        (error as Error).message
      );
      return;
    }
    // Authenticate success
    console.log("runServerGame");
    await runServerGame();
  });

  gameClient.on<IDisconnectEvent>("disconnect", (event) => {
    setPopup({
      type: "warning",
      title: "Disconnected from server",
      content: (
        <>
          This may happen due to the following reasons:
          <ul>
            <li key={1}>You have been idle for too long.</li>
            <li key={2}>You have more than one tab of this website opened.</li>
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

  gameClient.on<IWillNewGameEvent>("willNewGame", () => {
    setGame(null);
  });
  gameClient.on<IDidNewGameEvent>("didNewGame", () => {
    setGame(gameClient.game);
    updateNavbar();
    gameClient.game?.playerGroup.on<IDidSetUpdateEvent>(
      "didSetUpdate",
      (event: AnyEvent<IDidSetUpdateEvent>) => {
        if (event.data.changes?.isChanged) {
          event.data.changes?.isChanged && updateNavbar();
        }
      }
    );
  });

  gameClient.on<IErrorEvent>("error", (event) => {
    if (event.data.continuable) {
      warningPopup(event.data.error.name, event.data.error.message);
      return;
    }
    errorPopup(event.data.error.name, event.data.error.message);
  });

  gameClient.on<IGameStopEvent>("gameStop", (event) => {
    gameClient.once<IGameTickEvent>("gameTick", (event) => {
      setPopup(null);
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
      };
      if (gameClient.isHost) {
        options.buttonLabels = ["Resume Game"];
        options.buttonActions = [
          async () => {
            setPopup({ title: "Resuming game..." });
            try {
              await gameClient.startGame();
            } catch (error) {
              errorPopup(
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
      setPopup(options);
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
            setPopup({ title: "Kicking players..." });
            try {
              await gameClient.startGame(true);
            } catch (error) {
              errorPopup(
                "Failed to kick players and force start game",
                (error as Error).message
              );
            }
          },
        ];
      }
      setPopup(options);
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
        buttonLabels: ["Ok Bye", "Try Rejoin"],
        buttonActions: [
          null,
          () => {
            window.location.reload();
          },
        ],
      };
      setPopup(options);
      return;
    }
  });

  // Has local game data - run local game
  if (gameClient.hasLocalGameData) {
    console.log("Has local game data - run local game");
    runLocalGame();
  } else {
    console.log("No local game data - connect to server");
    // No local game data - connect to server
    gameClient.connect();
  }
  return gameClient;
}

async function runLocalGame() {
  try {
    await gameClient.loadGame({
      isLocalGame: true,
      tickInterval: undefined,
      mapID: undefined,
    });
  } catch (error) {
    errorPopup("Failed to run game on local", (error as Error).message);
    return;
  }

  // Notify user that the game is running in local mode
  setPopup({
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
      setPopup(null);
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

async function runServerGame(mapID?: string) {
  try {
    setPopup({ title: "Loading..." });
    let game = await gameClient.loadGame({
      isLocalGame: false,
      tickInterval: undefined,
      mapID: mapID,
    });
  } catch (error) {
    errorPopup("Failed to load game from server", (error as Error).message);
    return;
  }
  try {
    // await delay(5000); // For testing
    await gameClient.startGame();
    setPopup(null);
  } catch (error) {
    errorPopup("Failed to start game from server", (error as Error).message);
    return;
  }
}
