import Character from "./Character";
import Game, { IGameData, IGameDef } from "./Game";
import DataHolderEvent from "./events/DataHolderEvent";
import IOEvent, { ITargetData } from "./events/IOEvent";
import { io, Socket, SocketOptions } from "socket.io-client";
/**
 * Client that connects to the server and keeps local status synchronized with the server.
 */
export default class GameClient {
  private _game: Game | null = null;
  private _socket: Socket;
  constructor(serverURL: string) {
    this._socket = io(serverURL);
    this._socket.on("connect_error", (error) => {
      console.log("Connection error: " + error.message);
    });
    this._socket.on("connect", () => {
      console.log("Connected to server");
      this._socket.emit("Hello", "World");
    });
    console.log("GameClient created");
  }

  public newGame(gameDef: IGameDef, gameData: IGameData): Game {
    this._game = new Game(gameDef, gameData);
    this._game.init();

    let character = this._game.characterGroup.get(0) as Character;

    // character.on(DataHolderEvent.WILL_GET_UPDATE, (event: DataHolderEvent) => {
    //   console.log(
    //     "WILL_GET_UPDATE",
    //     character.target,
    //     character.getStagedValue("frameName")
    //   );
    // });
    // character.on(DataHolderEvent.DID_GET_UPDATE, (event: DataHolderEvent) => {
    //   console.log(
    //     "WILL_GET_UPDATE",
    //     event.changes,
    //     character.getStagedValue("frameName")
    //   );
    // });
    // character.on(DataHolderEvent.DID_SET_UPDATE, (event: DataHolderEvent) => {
    //   console.log("DID_SET_UPDATE", character.target, character.frameName);
    //   // console.log("DID_SET_UPDATE", event.changes, character.frameName);
    // });

    // this._game.addEventListener(DataHolderEvent.DID_GET_UPDATE, ((
    //   event: DataHolderEvent
    // ) => {
    //   console.log("GET", event.changes);
    // }) );

    // this._game.addEventListener(DataHolderEvent.DID_SET_UPDATE, ((
    //   event: DataHolderEvent
    // ) => {
    //   console.log("SET", event.changes);
    // }) );

    const UPDATE_DELAY_MS = 600;
    let count = 100;
    let intervalId = setInterval(() => {
      count--;
      console.log("update", count);
      if (!this._game || count <= 0) {
        clearInterval(intervalId);
        return;
      }
      let gameData = this._game.getUpdate();
      // console.log("getUpdate", gameData);
      this._game.setUpdate(gameData);
      // console.log("setUpdate", this._game.getCurrentData());
    }, UPDATE_DELAY_MS);

    return this._game;
  }
}
