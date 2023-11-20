import { ITransEventType } from "./TransEvent";
import { IGameData } from "../Game";
import { IPlayerData } from "../Player";

/**
 * For more information on the events, see `custome-socket-io-events.md`
 */
// Client events

export interface IAuthenticateEvent extends ITransEventType {
  type: "authenticate";
  data: {
    sessionID: string;
    publicID: string;
  };
  response: {
    error: null;
    joinRoomWarning: string;
    sessionID: string;
    publicID: string;
    isHost: boolean;
  };
}

export interface ILoadGameEvent extends ITransEventType {
  type: "loadGame";
  data: {
    mapID?: string;
    isOpen?: boolean;
    isLocalGame?: boolean;
    tickInterval?: number;
  };
  response: {
    error: null;
    playerID: number;
    gameData: IGameData;
    isOpen: boolean;
    isLocalGame: boolean;
    tickInterval: number;
    tickNum: number;
  };
}

export interface IStartGameEvent extends ITransEventType {
  type: "startGame";
  data: {
    force: boolean;
  };
  response: {
    error: null;
    isStarted: boolean;
    waitingPlayerNames: Array<string>;
  };
}

export interface IUpdatePlayerEvent extends ITransEventType {
  type: "updatePlayer";
  data: {
    playerID: number;
    playerData: IPlayerData;
  };
  response: {
    error: null;
  };
}

export interface IStopGameEvent extends ITransEventType {
  type: "stopGame";
  data: {
    type: "pause" | "end";
  };
  response: {
    error: null;
    isStopped: boolean;
  };
}

// Server events

export interface IGameTickEvent extends ITransEventType {
  type: "gameTick";
  data: {
    tickNum: number;
    gameData: IGameData | null;
    waitingPlayerNames: Array<string>;
  };
  response: {
    error: null;
  };
}

export interface IGameStopEvent extends ITransEventType {
  type: "gameStop";
  data: {
    type: "pause" | "waiting" | "end";
    reason: string;
    waitingPlayerNames: Array<string>;
  };
  response: {
    error: null;
  };
}
