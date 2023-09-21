import GameMap from "./GameMap";
import Player from "./Player";
import Position from "./Position";
import { IPosition, IPlayerData } from "./interface";

/**
 * A manager that manages all the players.
 */
export default class PlayerManager {
  private _playerList: Array<Player> = [];
  private __new: boolean = false;
  private _gameMap: GameMap;
  private escapeDir: number = 1;

  public get playerCount(): number {
    return this._playerList.length;
  }
  public get _new(): boolean {
    return this.__new;
  }

  public get gameMap(): GameMap {
    return this._gameMap;
  }

  public onUpdate: (() => void) | null = null;

  constructor(gameMap: GameMap) {
    this._gameMap = gameMap;
    //Add players form gameMap
    for (let i = 0; i < gameMap.playerCount; i++) {
      const playerData = gameMap.getPlayerData(i);
      if (playerData) {
        this.newPlayer(playerData);
      }
    }
  }
  /**
   * Create a Player instance and have it managed by this playerManager.
   * @param data Essential data for creating a new Player object.
   * @returns Created Player instance.
   */
  newPlayer(data: IPlayerData): Player {
    this.__new = true;
    let player = new Player(this, data);
    this.__new = false;
    this._playerList.push(player);
    return player;
  }

  getPlayer(index: number): Player | null {
    return this._playerList[index] || null;
  }

  public update() {
    //Moving player to the target
    for (let i = 0; i < this._playerList.length; i++) {
      const player = this._playerList[i];
      // if (!player.target) {
      //   player.target = new Position({
      //     col: Math.floor(Math.random() * this.gameMap.colCount),
      //     row: Math.floor(Math.random() * this.gameMap.rowCount),
      //   });
      // }
      this._movePlayer(player, this.gameMap);
    }

    this.onUpdate && this.onUpdate();
  }

  private _movePlayer(player: Player, gameMap: GameMap) {
    //No target
    if (!player.target) {
      return;
    }
    //Target reached or unwalkable
    if (player.position.equals(player.target)) {
      player.target = null;
      player.prevPosition = player.position;
      player.setMood(Player.MOOD_HAPPY);
      return;
    }
    let diff = player.target.subtract(player.position);
    //Navigate - First attempt
    let horizontalFirst = Math.abs(diff.col) > Math.abs(diff.row);
    let path = gameMap.navigate(
      player.position,
      player.target,
      horizontalFirst
    );
    if (path.length > 0) {
      player.moveTo(path[0]);
      player.setMood(Player.MOOD_OK);
      return;
    }
    //Navigate - Second attempt
    path = gameMap.navigate(
      player.position,
      player.target,
      !horizontalFirst //Different direction (vertical/horizontal)
    );
    if (path.length > 0) {
      player.moveTo(path[0]);
      player.setMood(Player.MOOD_OK);
      return;
    }
    //Just move somewhere - No guarantee of reaching the target. But it's good to keep moving.
    let position = gameMap.getNextPosition(player);
    if (position) {
      player.moveTo(position);
      player.setMood(Player.MOOD_CONFUSE);
      return;
    }
    //No where to move - You are caged!
    player.target = null;
    player.setMood(Player.MOOD_OMG);
  }
}
