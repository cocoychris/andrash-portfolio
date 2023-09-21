import Player from "./Player";
import Position from "./Position";
import { IMapData, IPlayerData, IPosition, ITileData } from "./interface";

export default class GameMap {
  private _data: IMapData;

  public get colCount(): number {
    return this._data.colCount;
  }
  public get rowCount(): number {
    return this._data.rowCount;
  }

  public get playerCount(): number {
    return this._data.playerDataList.length;
  }

  constructor(data: IMapData) {
    this._data = data;
  }

  /**
   * Get a copy of the requested playerData
   * @param index The player index
   * @returns playerData or null if not exist.
   */
  public getPlayerData(index: number): IPlayerData | null {
    let playerData = this._data.playerDataList[index];
    return playerData ? { ...playerData } : null;
  }

  /**
   * Get a copy of the requested tileData
   * @param position The position of the tileData
   * @returns tileData or null if not exist.
   */
  public getTileData(position: IPosition): ITileData | null {
    let rowData = this._data.tileDataArray[position.row];
    if (!rowData) {
      return null;
    }
    let tileData = rowData[position.col];
    if (!tileData) {
      return null;
    }
    return tileData ? { ...tileData } : null;
  }

  public isWalkable(position: IPosition): boolean {
    let rowData = this._data.tileDataArray[position.row];
    if (!rowData) {
      return false;
    }
    let tileData = rowData[position.col];
    if (!tileData) {
      return false;
    }
    return tileData.walkable;
  }
  /**
   * Useing simpler logic to try get close to the target.
   * This is NOT a path finding algorithm. But a way to keep a character moving.
   * Note that there is no guarantee of reaching the target if there is no direct path (without obsticles) to it.
   * Will avoid going back to the previous position to prevent walking back and forth indefinitely.
   * @param player
   * @returns
   */
  public getNextPosition(player: Player) {
    if (!player.target) {
      return null;
    }
    let diff = player.target.subtract(player.position);
    let horizontalFirst = Math.abs(diff.col) > Math.abs(diff.row);
    let nearest = {
      col:
        Math.max(-1, Math.min(1, diff.col)) || (Math.random() < 0.5 ? 1 : -1),
      row:
        Math.max(-1, Math.min(1, diff.row)) || (Math.random() < 0.5 ? 1 : -1),
    };
    let offsetList: Array<IPosition> = [];
    if (horizontalFirst) {
      offsetList = [
        { col: nearest.col, row: 0 },
        { col: 0, row: nearest.row },
        { col: 0, row: nearest.row * -1 },
        { col: nearest.col * -1, row: 0 },
      ];
    } else {
      offsetList = [
        { col: 0, row: nearest.row },
        { col: nearest.col, row: 0 },
        { col: nearest.col * -1, row: 0 },
        { col: 0, row: nearest.row * -1 },
      ];
    }
    for (let i = 0; i < offsetList.length; i++) {
      const offset = offsetList[i];
      const position = player.position.add(offset);
      if (this.isWalkable(position) && !player.prevPosition.equals(position)) {
        return position;
      }
    }
    //Try previous position
    const position = player.prevPosition;
    if (!player.position.equals(position) && this.isWalkable(position)) {
      return position;
    }
    return null;
  }

  /**
   * Navigating from current position to target position.
   * A good enough path finding algorithm.
   * Able to generate an L-shaped path with a singal turn.
   * Will fail to find the path if too far or too complicated (requires more than one turn to reach the target).
   * @param current
   * @param target
   * @param horizontalFirst
   * @returns An array of positions. indicating the path to the target. Will return an empty array if path not found.
   */
  public navigate(
    current: Position,
    target: Position,
    horizontalFirst: boolean,
    range: number = 10
  ): Array<Position> {
    let diff = target.subtract(current);
    let dirH: IPosition = { col: Math.max(-1, Math.min(1, diff.col)), row: 0 };
    let dirV: IPosition = { col: 0, row: Math.max(-1, Math.min(1, diff.row)) };
    let dir1 = horizontalFirst ? dirH : dirV;
    let dir2 = horizontalFirst ? dirV : dirH;
    return this.findInDir(
      current,
      target,
      dir1,
      range,
      (position: Position) => {
        return this.findInDir(position, target, dir2, range);
      }
    );
  }

  /**
   * Find target along specific direction and returns the path if it finds one.
   * @param current Current position.
   * @param target Target position.
   * @param dir Heading direction for searching. dir.col & dir.row are the step size (Suggested value: 0 or 1 or -1).
   * @param maxStep Will stop searching when maxStep reached.
   * @param finderFunc Additional finder which will perform extra searching in each step.
   * @returns An array of positions. indicating the path to the target. Will return an empty array if path not found.
   */
  public findInDir(
    current: Position,
    target: Position,
    dir: IPosition,
    maxStep: number = 10,
    finderFunc?: (current: Position) => Array<Position>
  ): Array<Position> {
    if (dir.col == 0 && dir.row == 0) {
      return [];
    }
    let position = current;
    let path: Array<Position> = [];
    for (let step = 1; step <= maxStep; step++) {
      position = position.add(dir);
      path.push(position);
      if (!this.isWalkable(position)) {
        break;
      }
      if (position.equals(target)) {
        return path;
      }
      if (finderFunc) {
        let path2 = finderFunc(position);
        if (path2.length > 0) {
          return path.concat(path2);
        }
      }
    }
    return [];
  }
}
