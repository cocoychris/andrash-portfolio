import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import {Server} from "./app/Server";

dotenv.config();

const app: Express = express();
const port:number = Number(process.env.PORT);

const server = new Server(app);
server.start(port);