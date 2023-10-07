import express, { Express, Request, Response } from "express";
import { createServer, Server as HTTPServer } from "http";
import { Server } from "socket.io";
import Player from "./Player";
import Room from "./Room";
import PlayerManager from "./PlayerManager";

export default class GameServer {
  private io: Server;
  private app: Express;
  private httpServer: HTTPServer;
  private playerManager: PlayerManager;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer);
    this.setupMiddlewares(this.app);
    this.playerManager = new PlayerManager(this.io);
  }

  public start(port: number): void {
    this.httpServer.listen(port, () =>
      console.log(`GameServer running on http://localhost:${port}`)
    );
  }

  private setupMiddlewares(app: Express) {
    app.get("/api", (req: Request, res: Response): void => {
      res.send("You have reached the API! 123");
    });
    app.delete("/api/delete", (req: Request, res: Response): void => {
      res.send("DELETED!");
    });
  }
}
