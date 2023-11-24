import { ReactNode, useEffect, useState } from "react";
import GameClient, {
  IDidNewGameEvent,
  IWillNewGameEvent,
} from "../lib/GameClient";
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
import AnyEvent from "../lib/events/AnyEvent";
import { IDidSetUpdateEvent } from "../lib/DataHolder";
import Game from "../lib/Game";

interface props {
  gameClient: GameClient;
  onRunServerGame: (mapID: string) => void;
}

export default function NavbarLayout({ gameClient, onRunServerGame }: props) {
  const [game, setGame] = useState<Game | null>(gameClient.game);
  const [playersMenuData, setPlayersMenuData] =
    useState<Array<IDropItemData> | null>(getPlayersMenuData(gameClient));

  useEffect(() => {
    let onPlayerGroupUpdate = (event: AnyEvent<IDidSetUpdateEvent>) => {
      if (event.data.changes.isChanged) {
        setPlayersMenuData(getPlayersMenuData(gameClient));
      }
    };
    let onWillNewGame = (event: AnyEvent<IWillNewGameEvent>) => {
      setGame(null);
      setPlayersMenuData(null);
      gameClient.game?.playerGroup.off<IDidSetUpdateEvent>(
        "didSetUpdate",
        onPlayerGroupUpdate
      );
    };
    let onDidNewGame = (event: AnyEvent<IDidNewGameEvent>) => {
      setGame(gameClient.game);
      setPlayersMenuData(getPlayersMenuData(gameClient));
      gameClient.game?.playerGroup.on<IDidSetUpdateEvent>(
        "didSetUpdate",
        onPlayerGroupUpdate
      );
    };

    gameClient.on<IWillNewGameEvent>("willNewGame", onWillNewGame);
    gameClient.on<IDidNewGameEvent>("didNewGame", onDidNewGame);
    return () => {
      gameClient.off<IWillNewGameEvent>("willNewGame", onWillNewGame);
      gameClient.off<IDidNewGameEvent>("didNewGame", onDidNewGame);
    };
  }, []);

  // No Game
  if (!game || !playersMenuData) {
    return null;
  }

  // Update navbar
  let playerGroup = gameClient.game?.playerGroup;
  let hostPlayer = playerGroup?.hostPlayer;
  let mainPlayer = playerGroup?.mainPlayer;
  let isHost = gameClient.isHost;
  let navbarData: Array<INavItemData> = [
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
      menuData: playersMenuData,
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
            onRunServerGame("default"); //Specify mapID to start a new game
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
  return <Navbar data={navbarData} />;
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
  return playerDataList;
}
