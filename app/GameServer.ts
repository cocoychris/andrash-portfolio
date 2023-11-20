import { IAuthenticateEvent } from "../frontend/src/lib/events/transEventTypes";
import express, { Express, Request, Response } from "express";
import { createServer, Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import Session from "./Session";
import { withTimeout } from "../frontend/src/lib/data/util";
import Transmitter from "../frontend/src/lib/events/Transmitter";
import TransEvent from "../frontend/src/lib/events/TransEvent";
import Room from "./Room";

const SEC = 1000;
const MIN = 60 * SEC;
const SESSION_GC_INTERVAL = 1 * MIN;
const AUTHENTICATE_TIMEOUT = 10 * SEC;
const SESSION_LIFETIME = 10 * MIN;

export default class GameServer {
  private _io: Server;
  private _app: Express;
  private _httpServer: HTTPServer;

  constructor() {
    this._app = express();
    this._httpServer = createServer(this._app);
    this._io = new Server(this._httpServer);
    this._setUpMiddlewares(this._app);
    this._setUpTransEvents(this._io);
  }

  public start(port: number): void {
    this._httpServer.listen(port, () =>
      console.log(`[Server] Listening on port ${port}`)
    );
    Session.startGC(SESSION_GC_INTERVAL);
  }

  private _setUpTransEvents(io: Server): void {
    io.on("connection", (socket: Socket) => {
      console.log(`[Server] New connection: ${socket.id}`);
      let authenticate = (event: TransEvent<IAuthenticateEvent>) => {
        console.log(`[Server] Authenticating: ${socket.id}`);
        socket.off("connect_error", onConnectError);
        let { data, callback } = event;
        try {
          // Session ID provided, reconnect the session.
          let session = Session.get(data.sessionID);
          if (session) {
            // Session found, reconnect the session.
            console.log(`[Server] Session found: ${data.sessionID}`);
            session.transmitter.setSocket(socket); // Update the socket.
          } else {
            console.log(`[Server] Session not found: ${data.sessionID}`);
            // Session not found. Create a new session.
            session = new Session(socket, SESSION_LIFETIME);
            console.log(`[Server] New session created: ${session.id}`);
          }
          // Join target room
          let joinRoomWarning: string = "";
          if (data.publicID && data.publicID != session.ownRoom.publicID) {
            try {
              let targetRoom = Room.get(data.publicID);
              if (!targetRoom) {
                throw `Room ${data.publicID} not found`;
              }
              if (targetRoom.isFull) {
                throw `Room ${data.publicID} is full`;
              }
              if (!targetRoom.isOpen) {
                throw `Room ${data.publicID} is not open`;
              }
              // if (targetRoom === session.currentRoom) {
              //   throw `Session is already in room ${data.publicID}`;
              // }
              session.currentRoom = targetRoom;
            } catch (error) {
              joinRoomWarning = String(error);
              console.log(
                `[Server] Session ${session.id} failed to join room: ${error}`
              );
            }
          }
          if (!session.currentRoom) {
            console.log(`[Server] Returning session ${session.id} to own room`);
            session.currentRoom = session.ownRoom;
          }
          // Respond
          callback({
            error: null,
            joinRoomWarning,
            sessionID: session.id,
            publicID: session.currentRoom ? session.currentRoom.publicID : "",
            isHost:
              session.currentRoom != null &&
              session.currentRoom === session.ownRoom,
          });
          console.log(`[Server] Authentication success: ${socket.id}`);
        } catch (error) {
          console.log(`[Server] Authentication error: ${socket.id} ${error}`);
          callback({
            error: (error as Error).message || String(error),
          });
          socket.disconnect();
        }
      };

      let onAuthenticate = withTimeout(
        authenticate,
        () => {
          console.log(`[Server] Authentication timeout: ${socket.id}`);
          transmitter.off<IAuthenticateEvent>("authenticate", onAuthenticate);
          socket.off("connect_error", onConnectError);
          socket.disconnect();
        },
        AUTHENTICATE_TIMEOUT
      );
      let onConnectError = (error: Error) => {
        console.log(`[Server] Connection error: ${socket.id} ${error}`);
        socket.disconnect();
      };

      let transmitter: Transmitter<Socket> = new Transmitter(socket);
      transmitter.once<IAuthenticateEvent>("authenticate", onAuthenticate);
      socket.on("connect_error", onConnectError);
    });
  }

  private _setUpMiddlewares(app: Express) {
    app.get("/api", (req: Request, res: Response): void => {
      res.send("You have reached the API! 123");
    });
    app.delete("/api/delete", (req: Request, res: Response): void => {
      res.send("DELETED!");
    });
  }
}
