import { Component, ReactNode, useEffect, useRef, useState } from "react";
import GameClient, { IDidNewGameEvent } from "../lib/GameClient";
import Navbar, { INavItemData } from "../components/Navbar";
import { IDropItemData } from "../components/DropdownMenu";
import screenfull from "screenfull";
import { ReactComponent as MenuIcon } from "../icons/menu-svgrepo-com.svg";
import { ReactComponent as BellIcon } from "../icons/bell-svgrepo-com.svg";
import { ReactComponent as RightIcon } from "../icons/chevron-right-svgrepo-com.svg";
import { ReactComponent as CommentIcon } from "../icons/comment-svgrepo-com.svg";
import { ReactComponent as LockIcon } from "../icons/lock-svgrepo-com.svg";
import { ReactComponent as LeftIcon } from "../icons/chevron-left-svgrepo-com.svg";
import { ReactComponent as PersonIcon } from "../icons/person-svgrepo-com.svg";
import { ReactComponent as PeopleIcon } from "../icons/people-svgrepo-com.svg";
import { ReactComponent as HomeIcon } from "../icons/home-svgrepo-com.svg";
import { ReactComponent as LinkIcon } from "../icons/link-svgrepo-com.svg";
import { ReactComponent as GiftIcon } from "../icons/gift-svgrepo-com.svg";
import AnyEvent from "../lib/events/AnyEvent";
import { IDidSetUpdateEvent } from "../lib/data/DataHolder";
import Game from "../lib/Game";
import PopupLayout from "./PopupLayout";
import SVGDisplay from "../components/game/SVGDisplay";

interface IProps {
  gameClient: GameClient;
  popupRef: React.RefObject<PopupLayout>;
}
interface IState {
  game: Game | null;
}

export default class NavbarLayout extends Component<IProps, IState> {
  private _gameClient: GameClient;

  constructor(props: IProps) {
    super(props);
    this._gameClient = props.gameClient;
    this.state = {
      game: props.gameClient.game || null,
    };
    this._onDidNewGame = this._onDidNewGame.bind(this);
    this._onPlayerGroupUpdate = this._onPlayerGroupUpdate.bind(this);
  }

  public componentDidMount(): void {
    this._gameClient.on<IDidNewGameEvent>("didNewGame", this._onDidNewGame);
  }

  public componentWillUnmount(): void {
    this._gameClient.off<IDidNewGameEvent>("didNewGame", this._onDidNewGame);
    this._gameClient.game?.playerGroup.off<IDidSetUpdateEvent>(
      "didSetUpdate",
      this._onPlayerGroupUpdate
    );
  }

  private _onDidNewGame(event: AnyEvent<IDidNewGameEvent>) {
    if (this.state.game) {
      this.state.game.playerGroup.off<IDidSetUpdateEvent>(
        "didSetUpdate",
        this._onPlayerGroupUpdate
      );
      this.state.game?.playerGroup.off<IDidSetUpdateEvent>(
        "didSetUpdate",
        this._onPlayerGroupUpdate
      );
    }
    this.setState({ game: this._gameClient.game || null });
    this._gameClient.game?.playerGroup.on<IDidSetUpdateEvent>(
      "didSetUpdate",
      this._onPlayerGroupUpdate
    );
  }

  private _onPlayerGroupUpdate(event: AnyEvent<IDidSetUpdateEvent>) {
    if (event.data.changes.isChanged) {
      this.forceUpdate();
    }
  }
  render(): ReactNode {
    const { gameClient } = this.props;
    let nevbarData: Array<INavItemData> = [
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
        menuData: getPlayersMenu(this.props),
        isEnabled: gameClient.game != null,
      },
      {
        id: "GameMenu",
        icon: "🕹️",
        menuData: getGameMenu(this.props),
      },
    ];
    return <Navbar data={nevbarData} />;
  }
}

function getGameMenu(props: IProps): Array<IDropItemData> {
  const { gameClient, popupRef } = props;
  let playerGroup = gameClient.game?.playerGroup;
  let hostPlayer = playerGroup?.hostPlayer;
  let mainPlayer = playerGroup?.mainPlayer;
  let isHost = gameClient.isHost;
  let menuData = [
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
      label: `You're at ${isHost ? `your own` : `${hostPlayer?.name}'s`} room.`,
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
        gameClient.newGame(Game.DEFAULT_MAP_ID);
        return true;
      },
      isEnabled: isHost && gameClient.mode != GameClient.MODE_EDITOR,
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
      isEnabled: isHost && gameClient.mode != GameClient.MODE_EDITOR,
    },
  ];

  if (gameClient.mode == GameClient.MODE_EDITOR) {
    menuData.unshift({
      id: "editor",
      label: "Edit Map",
      leftIcon: "📝",
      onClick: () => {
        gameClient.editor?.stopTesting();
        return true;
      },
      isEnabled: isHost,
    });
  }
  return menuData;
}

function getPlayersMenu(props: IProps): Array<IDropItemData> | null {
  const { gameClient, popupRef } = props;
  let game = gameClient.game as Game;
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
  if (hostPlayer) {
    playerDataList.push({
      id: "host",
      label: `${hostPlayer?.name} [Host]${
        hostPlayer?.isOccupied ? "" : " [Offline]"
      }${hostPlayer == mainPlayer ? " [You]" : ""}`,
      //prince icon
      leftIcon: (
        <SVGDisplay
          assetPack={game.assetPack}
          svgName={hostPlayer.character.frameDef.svgName}
          svgStyle={{
            fill: hostPlayer.character.color,
            transform: "scale(1.3)",
          }}
        />
      ),
      isEnabled: hostPlayer?.isOccupied,
    });
  }
  // Local Game
  if (gameClient.isLocalGame || !hostPlayer) {
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
          leftIcon: (
            <SVGDisplay
              assetPack={game.assetPack}
              svgName={player.character.frameDef.svgName}
              svgStyle={{
                fill: player.character.color,
                transform: "scale(1.3)",
              }}
            />
          ),
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
          onClick: () => {
            // Copy current URL to clipboard
            if (!navigator.clipboard) {
              popupRef.current?.show({
                type: "info",
                title: "Please copy the link manually",
                content: (
                  <>
                    <p>
                      Your browser does not support automatic copy to clipboard.
                    </p>
                    <p>
                      Please copy the link (current URL of this page) from the
                      address bar and share it with your friend.
                    </p>
                  </>
                ),
              });
              return true;
            }
            navigator.clipboard.writeText(window.location.href);
            return true;
          },
          menuData: [
            {
              id: "0",
              leftIcon: navigator.clipboard ? "✔️" : "👆",
              label: navigator.clipboard
                ? "Link copied!"
                : "Copy it from address bar.",
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
    });
  }
  return playerDataList;
}