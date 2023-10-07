import Player from "./Player";
import Room from "./Room";
import RoomEvent from "./RoomEvent";
import PlayerEvent from "./PlayerEvent";
import { Server, Socket } from "socket.io";

interface PlayerDict {
  [key: string]: Player;
}
interface RoomDict {
  [key: string]: Room;
}

export default class PlayerManager {
  private playerDict: PlayerDict = {};
  private roomDict: RoomDict = {};
  private _io: Server;

  public get playerList(): Player[] {
    return Object.values(this.playerDict);
  }
  public get roomList(): Room[] {
    return Object.values(this.roomDict);
  }

  constructor(io: Server) {
    io.on("connection", (socket) => {
      let player: Player = this.newPlayer(socket);
      socket.on("disconnect", () => {
        player.destroy();
      });
    });
    io.engine.on("connection_error", (err) => {
      console.log(err);
    });
    this._io = io;
  }

  private newPlayer(socket: Socket): Player {
    if (this.playerDict[socket.id]) {
      throw new Error("Player already exists");
    }
    const player = new Player(this, socket);
    this.playerDict[socket.id] = player;
    player.addEventListener(PlayerEvent.DESTROY, () => {
      let player = this.playerDict[socket.id];
      if (!player) {
        return;
      }
      delete this.playerDict[player.id];
      console.log(`Player destroyed: ${player.id}`);
    });
    console.log(`Player created: ${player.id}`);
    return player;
  }

  public getPlayer(playerId: string): Player {
    return this.playerDict[playerId] || null;
  }

  public newRoom(roomId: string): Room {
    if (this.roomDict[roomId]) {
      throw new Error("Room already exists");
    }
    const room = new Room(this._io, roomId);
    this.roomDict[roomId] = room;
    room.addEventListener(RoomEvent.PLAYER_LEAVE, () => {
      if (room.playerList.length === 0) {
        room.destroy();
      }
    });
    room.addEventListener(RoomEvent.DESTROY, () => {
      let room = this.roomDict[roomId];
      if (!room) {
        return;
      }
      delete this.roomDict[room.id];
      console.log(`Room destroyed: ${room.id}`);
    });
    console.log(`Room created: ${room.id}`);
    return room;
  }

  public getRoom(roomId: string): Room {
    return this.roomDict[roomId] || null;
  }
}
