import { Component, ReactNode } from "react";
import GameClient, { IDidNewGameEvent } from "../lib/GameClient";
import Navbar, { INavItemData } from "../components/Navbar";
import { IDropItemData } from "../components/DropdownMenu";
import screenfull from "screenfull";
import { ReactComponent as RightIcon } from "../icons/chevron-right-svgrepo-com.svg";
import { ReactComponent as LeftIcon } from "../icons/chevron-left-svgrepo-com.svg";
import { ReactComponent as PersonIcon } from "../icons/person-svgrepo-com.svg";
import { ReactComponent as HomeIcon } from "../icons/home-svgrepo-com.svg";
import { ReactComponent as LinkIcon } from "../icons/link-svgrepo-com.svg";
import { ReactComponent as FullscreenIcon } from "../icons/andrash-full-screen.svg";
import { ReactComponent as ExitFullscreenIcon } from "../icons/andrash-exit-full-screen.svg";
import { ReactComponent as GameControlIcon } from "../icons/andrash-game-control.svg";
import { ReactComponent as HeartIcon } from "../icons/andrash-heart.svg";
import { ReactComponent as PlayersIcon } from "../icons/andrash-players.svg";
import { ReactComponent as LocalModeIcon } from "../icons/andrash-local-mode.svg";
import { ReactComponent as OnlineModeIcon } from "../icons/andrash-online-mode.svg";
import { ReactComponent as EditModeIcon } from "../icons/andrash-edit-mode.svg";
import GITHUB_MARK_SRC from "../icons/github-mark.png";
import AnyEvent from "../lib/events/AnyEvent";
import { IDidSetUpdateEvent } from "../lib/data/DataHolder";
import Game from "../lib/Game";
import PopupLayout from "./PopupLayout";
import SVGDisplay from "../components/game/SVGDisplay";
import Character from "../lib/Character";
import photo from "../icons/andrash_photo_300.png";
// import { ReactSVG } from "react-svg";
import "./NavbarLayout.css";

interface IProps {
  gameClient: GameClient;
  popupRef: React.RefObject<PopupLayout>;
}
interface IState {
  game: Game | null;
}

const MODE_ICON_MAP = {
  // [GameClient.MODE_LOCAL]: "🏝️",
  // [GameClient.MODE_ONLINE]: "🌐",
  // [GameClient.MODE_EDITOR]: "📝",
  [GameClient.MODE_LOCAL]: <LocalModeIcon />,
  [GameClient.MODE_ONLINE]: <OnlineModeIcon />,
  [GameClient.MODE_EDITOR]: <EditModeIcon />,
};

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
    this.forceUpdate();
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
        icon: screenfull.isFullscreen ? (
          <ExitFullscreenIcon />
        ) : (
          <FullscreenIcon />
        ),
        onClick: () => {
          let isFullscreen = screenfull.isFullscreen;
          setTimeout(() => {
            if (screenfull.isFullscreen == isFullscreen) {
              this.props.popupRef.current?.show({
                type: "warning",
                title: "Fullscreen not supported",
                content: (
                  <p>
                    Your browser or device does not support fullscreen mode.
                    Please try another browser or device (Google Chrome and
                    Microsoft Edge are recommended).
                  </p>
                ),
              });
            } else {
              this.forceUpdate();
            }
          }, 100);
          screenfull.toggle();
          return false;
        },
      },
      {
        id: "mode",
        icon: MODE_ICON_MAP[gameClient.mode],
        menuData: getModeMenu(this.props),
      },
      {
        id: "players",
        // icon: "👥",
        icon: <PlayersIcon />,
        menuData: getPlayersMenu(this.props),
        isEnabled: gameClient.game != null,
      },
      {
        id: "GameMenu",
        icon: <GameControlIcon />,
        menuData: getGameMenu(this.props),
      },
      {
        id: "about",
        // icon: "💗",
        icon: <HeartIcon />,
        menuData: getAboutMenu(this.props),
      },
    ];
    return <Navbar data={nevbarData} />;
  }
}

function getAboutMenu(props: IProps): Array<IDropItemData> | null {
  return [
    {
      id: "aboutAndrash",
      leftIcon: (
        <div style={{ scale: "1.3" }}>
          <img
            // src="/images/andrash_photo_300.png"
            src={photo}
            alt="andrash"
            style={{ borderRadius: "50%" }}
          />
        </div>
      ),
      label: "About Andrash",
      onClick: () => {
        simulateClick("/page/about_andrash");
        return true;
      },
    },
    {
      id: "download",
      leftIcon: "📥",
      label: "Download Resume",
      onClick: () => {
        window.open("/files/Andrash_Yang_Resume.pdf", "_blank");
        return true;
      },
    },
    {
      id: "github",
      leftIcon: <img src={GITHUB_MARK_SRC} alt="Git" width={30} height={30} />,
      label: "Source Code on GitHub",
      onClick: () => {
        window.open(
          "https://github.com/cocoychris/andrash-portfolio",
          "_blank"
        );
        return true;
      },
    },
  ];
}

function getModeMenu(props: IProps): Array<IDropItemData> | null {
  const { gameClient, popupRef } = props;

  const MSG_ENTER_EDITOR = (
    <>
      <p>
        You're about to switch to editor mode. This will clear your current
        game.
      </p>
      <p>Still want to switch?</p>
      <details>
        <summary>Lear more about the Map Editor (click to expand)</summary>
        <p>
          The Map Editor is a tool I built for myself to create maps, so I don't
          have to manually write JSON files.
        </p>
        <p>
          Disclaimer: Think of this tool as a developer tool or an experimental
          feature. It might not be the most user-friendly, and that's okay.
        </p>
        <p>
          Note: In editor mode, you won't be able to swipe to move the map on
          mobile devices. To move the map, drag your finger towards the edge of
          the screen.
        </p>
      </details>
    </>
  );
  const MSG_EXIT_EDITOR = (
    <>
      <p>
        You're about to exit the Map Editor. Make sure you've saved all your
        changes before you go.
      </p>
      <p>
        Note: Playing custom maps outside the editor isn't supported just yet.
      </p>
      <p>Still want to leave?</p>
    </>
  );

  const MSG_ONLINE_TO_LOCAL = (
    <>
      <p>
        You're about to switch to local mode. This means you'll leave your
        current room and kick off a new game.
      </p>
      <p>Still want to switch?</p>
      <details>
        <summary>Lear more about the Local Mode (click to expand)</summary>
        <p>
          In local mode, you run the game locally on your device without
          connecting to the game server.
        </p>
        <p>
          If your network connection's been a bit shaky, this should help your
          game run smoother. But just remember, you won't be able to play with
          your friends in this mode.
        </p>
      </details>
    </>
  );

  const MSG_LOCAL_TO_ONLINE = (
    <>
      <p>
        You're about to switch to online mode. This will clear your current
        game.
      </p>
      <p>Still want to switch?</p>
      <details>
        <summary>Learn more about Online Mode (click to expand)</summary>
        <p>
          Online mode is perfect for playing with friends. Just share the link
          to invite them to your room. They'll pop in as soon as they click the
          link.
        </p>
        <p>
          Keep in mind, online mode does have a few downsides. If your network
          connection isn't stable, you might experience some lag or even get
          disconnected. If that happens, switching to local mode could help.
        </p>
      </details>
    </>
  );

  return [
    {
      id: "modeTitle",
      label: <h3>Mode</h3>,
    },
    {
      id: "localMode",
      label: "Local Mode",
      leftIcon: MODE_ICON_MAP[GameClient.MODE_LOCAL],
      onClick:
        gameClient.mode == GameClient.MODE_LOCAL
          ? undefined
          : () => {
              popupRef.current?.show({
                type: "info",
                title: "Switch to local mode",
                content:
                  gameClient.mode == GameClient.MODE_EDITOR
                    ? MSG_EXIT_EDITOR
                    : MSG_ONLINE_TO_LOCAL,
                buttonLabels: ["Yes", "No"],
                buttonActions: [
                  () => {
                    gameClient.mode = GameClient.MODE_LOCAL;
                  },
                  null,
                ],
              });
              return true;
            },
      // isEnabled: gameClient.mode != GameClient.MODE_LOCAL,
    },
    {
      id: "onlineMode",
      label: "Online Mode",
      leftIcon: MODE_ICON_MAP[GameClient.MODE_ONLINE],
      onClick:
        gameClient.mode == GameClient.MODE_ONLINE
          ? undefined
          : () => {
              popupRef.current?.show({
                type: "info",
                title: "Switch to online mode",
                content:
                  gameClient.mode == GameClient.MODE_EDITOR
                    ? MSG_EXIT_EDITOR
                    : MSG_LOCAL_TO_ONLINE,
                buttonLabels: ["Yes", "No"],
                buttonActions: [
                  () => {
                    gameClient.mode = GameClient.MODE_ONLINE;
                  },
                  null,
                ],
              });
              return true;
            },
      // isEnabled: gameClient.mode != GameClient.MODE_ONLINE,
    },
    {
      id: "editorMode",
      label: "Editor Mode",
      leftIcon: MODE_ICON_MAP[GameClient.MODE_EDITOR],
      onClick:
        gameClient.mode == GameClient.MODE_EDITOR
          ? undefined
          : () => {
              popupRef.current?.show({
                type: "info",
                title: "Switch to editor mode",
                content: MSG_ENTER_EDITOR,
                buttonLabels: ["Yes", "No"],
                buttonActions: [
                  () => {
                    gameClient.mode = GameClient.MODE_EDITOR;
                  },
                  null,
                ],
              });
              return true;
            },
      // isEnabled: gameClient.mode != GameClient.MODE_EDITOR,
    },
  ];
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
      label: `You're in ${isHost ? `your own` : `${hostPlayer?.name}'s`} room.`,
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
      isEnabled: isHost && gameClient.mode == GameClient.MODE_ONLINE,
    },
  ];

  if (gameClient.mode == GameClient.MODE_EDITOR) {
    menuData.unshift({
      id: "editor",
      label: "Edit Map",
      leftIcon: "✏️",
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
      leftIcon: <CharacterIcon character={hostPlayer.character} />,
      isEnabled: hostPlayer?.isOccupied,
    });
  }
  // Local Game
  if (gameClient.isLocalGame) {
    playerDataList.push({
      id: "multiplayerNotAvailable",
      label: `Multiplayer is not available in ${gameClient.mode} mode.`,
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
          leftIcon: <CharacterIcon character={player.character} />,
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

function CharacterIcon(props: { character: Character }) {
  const { character } = props;
  const assetPack = character.group.game.assetPack;
  if (character.frameDef.svgName) {
    return (
      <SVGDisplay
        assetPack={assetPack}
        svgName={character.frameDef.svgName}
        svgStyle={{
          fill: character.color,
          transform: "scale(1.3)",
        }}
      />
    );
  }
  if (character.frameDef.imageName) {
    return <img src={character.frameDef.imageName} alt="player" />;
  }
  return <PersonIcon />;
}
/**
 * The click event will be captured by the page component and load the page directly without reloading.
 */
function simulateClick(pathName: string) {
  let anchor = document.createElement("a");
  document.body.appendChild(anchor);
  anchor.style.display = "none";
  anchor.href = pathName;
  anchor.click();
  document.body.removeChild(anchor);
}
