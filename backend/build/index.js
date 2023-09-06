"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const Server_1 = require("./app/Server");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT);
const server = new Server_1.Server(app);
server.start(port);
