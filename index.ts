import dotenv from "dotenv";
import GameServer from "./app/GameServer";

dotenv.config();

const port: number = Number(process.env.PORT);
const gameServer = new GameServer();
gameServer.start(port);
