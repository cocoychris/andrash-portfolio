import { ReactNode, useEffect, useRef, useState } from "react";
import GameClient, { IDidNewGameEvent } from "../lib/GameClient";
import Navbar, { INavItemData } from "../components/Navbar";
import { IDropItemData } from "../components/DropdownMenu";
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
import { ReactComponent as LinkIcon } from "../assets/icons/link-svgrepo-com.svg";
import { ReactComponent as GiftIcon } from "../assets/icons/gift-svgrepo-com.svg";
import AnyEvent from "../lib/events/AnyEvent";
import { IDidSetUpdateEvent } from "../lib/DataHolder";
import Game from "../lib/Game";

interface props {
  gameClient: GameClient;
  onRunServerGame: (mapID: string) => void;
  onRunLocalGame: (mapID: string) => void;
}

export default function NavbarLayout({
  gameClient,
  onRunServerGame,
  onRunLocalGame,
}: props) {
  const [game, setGame] = useState<Game | null>(gameClient.game);
  const [_, forceUpdate] = useState<number>(0);

  useEffect(() => {
    let onPlayerGroupUpdate = (event: AnyEvent<IDidSetUpdateEvent>) => {
      if (event.data.changes.isChanged) {
        // console.log("NavbarLayout onPlayerGroupUpdate");
        forceUpdate(Date.now());
      }
    };
    let onDidNewGame = (event: AnyEvent<IDidNewGameEvent>) => {
      setGame(gameClient.game);
      gameClient.game?.playerGroup.on<IDidSetUpdateEvent>(
        "didSetUpdate",
        onPlayerGroupUpdate
      );
    };

    gameClient.on<IDidNewGameEvent>("didNewGame", onDidNewGame);
    return () => {
      gameClient.off<IDidNewGameEvent>("didNewGame", onDidNewGame);
    };
  }, []);

  return (
    <Navbar data={getNavbarData(gameClient, onRunLocalGame, onRunServerGame)} />
  );
}

function getNavbarData(
  gameClient: GameClient,
  onRunLocalGame: Function,
  onRunServerGame: Function
): Array<INavItemData> {
  // Update navbar
  let playerGroup = gameClient.game?.playerGroup;
  let hostPlayer = playerGroup?.hostPlayer;
  let mainPlayer = playerGroup?.mainPlayer;
  let isHost = gameClient.isHost;
  let navbarData: Array<INavItemData> = [
    {
      id: "fullscreen",
      icon: "🖥️",
      onClick: () => {
        screenfull.toggle();
        return false;
      },
      isEnabled: true,
    },
    {
      id: "players",
      icon: <PeopleIcon />,
      menuData: getPlayersMenuData(gameClient),
      isEnabled: gameClient.game != null,
    },
    {
      id: "GameMenu",
      icon: "🕹️",
      menuData: [
        {
          id: "hello",
          label: (
            <>
              Hello <b>{mainPlayer?.name}</b>!
            </>
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
            if (gameClient.isLocalGame) {
              onRunLocalGame(GameClient.DEFAULT_MAP_ID); //Specify mapID to start a new game
            } else {
              onRunServerGame(GameClient.DEFAULT_MAP_ID); //Specify mapID to start a new game
            }
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
  return navbarData;
}
function getPlayersMenuData(
  gameClient: GameClient
): Array<IDropItemData> | null {
  let game = gameClient.game;
  if (!game) {
    return null;
  }
  let playerGroup = game.playerGroup;
  let hostPlayer = playerGroup.hostPlayer;
  let mainPlayer = playerGroup.mainPlayer;
  let playerList = playerGroup.list() || [];
  let playerDataList: Array<IDropItemData> = [];
  playerDataList.push({
    id: "players",
    label: <h3>Game Players</h3>,
  });
  playerDataList.push({
    id: "host",
    label: `${hostPlayer?.name} [Host]${
      hostPlayer?.isOccupied ? "" : " [Offline]"
    }${hostPlayer == mainPlayer ? " [You]" : ""}`,
    leftIcon: "🤴",
    isEnabled: hostPlayer?.isOccupied,
  });
  // Local Game
  if (gameClient.isLocalGame) {
    playerDataList.push({
      id: "local",
      label: "Multiplayer is not available in local game.",
      leftIcon: "🚫",
      isEnabled: false,
    });
    return playerDataList;
  }
  // Online Game
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
      label: "Invite your friend to join this room!",
      leftIcon: "⚽",
      rightIcon: <RightIcon />,
      menuData: [
        {
          id: "0",
          label: <h2>Step 1</h2>,
        },
        {
          id: "1",
          label: "Copy the invitation link",
          leftIcon: <LinkIcon />,
          menuData: [
            {
              id: "0",
              leftIcon: "✔️",
              label: "Link copied!",
            },
            {
              id: "1",
              label: <h2>Step 2</h2>,
            },
            {
              id: "2",
              label: "Share it with your friend!",
              leftIcon: "🧑‍🤝‍🧑",
            },
            {
              id: "3",
              label: "OK",
              leftIcon: "😊",
              onClick: () => {
                return true;
              },
            },
          ],
        },
        {
          id: "2",
          label: "Back",
          leftIcon: <LeftIcon />,
          goBack: true,
        },
      ],
      onClick: () => {
        // Copy current URL to clipboard
        navigator.clipboard.writeText(window.location.href);
        return true;
      },
    });
  }
  return playerDataList;
}
