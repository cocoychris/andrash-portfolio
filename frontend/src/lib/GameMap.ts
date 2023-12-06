import Character from "./Character";
import Game from "./Game";
import Position, { IPosition } from "./Position";
import Tile, { ITileData } from "./Tile";
import { IDidSetUpdateEvent, IWillGetUpdateEvent } from "./DataHolder";
import Item from "./Item";
import { IDidAddMemberEvent } from "./Group";
import AnyEvent from "./events/AnyEvent";
import DataUpdater from "./DataUpdater";

export interface IMapData {
  id: string;
  // The name of the game map.
  name: string;
  // The number of columns in the game map.
  colCount: number;
  // The number of rows in the game map.
  rowCount: number;
  // A 2D array of tile data objects.
  tileData2DArray: Array<Array<ITileData | null>>;
}
/**
 * Represents a game map. A game map contains all the tiles and map information.
 */
export default class GameMap extends DataUpdater<IMapData> {
  private _game: Game;
  private _tile2DArray: Array<Array<Tile>>;
  /**
   * Get the ID of the map
   */
  public get id(): string {
    return this.data.id;
  }
  /**
   * Get name of the map
   */
  public get name(): string {
    return this.data.name;
  }
  public set name(value: string) {
    this.data.name = value;
  }
  /**
   * Get number of columns
   */
  public get colCount(): number {
    return this.data.colCount;
  }
  /**
   * Get number of rows
   */
  public get rowCount(): number {
    return this.data.rowCount;
  }
  /**
   * Get the game object.
   */
  public get game(): Game {
    return this._game;
  }
  /**
   * Create a new map
   * @param defLoader The loader for tile definition
   * @param data The data for creating the map
   */
  constructor(game: Game, data: IMapData) {
    super(data);
    this._game = game;
    this._tile2DArray = [];
  }
  /**
   * Initialize the map.
   * Will create tile instances for all the data in the GameMap.
   * Also set up event listeners for data holder events.
   * Please call this method after creating a new GameMap instance and before using it.
   */
  public init(): this {
    super.init();
    // Generate tiles
    for (let row = 0; row < this.rowCount; row++) {
      let rowTiles = [];
      for (let col = 0; col < this.colCount; col++) {
        let tileData = this.data.tileData2DArray[row][col];
        if (!tileData) {
          throw new Error(`Tile data not found at (${col}, ${row})`);
        }
        let tile = new Tile(this, tileData, { col, row });
        rowTiles.push(tile);
      }
      this._tile2DArray.push(rowTiles);
    }
    // Initialize tiles
    this._tile2DArray.forEach((rowTiles) => {
      rowTiles.forEach((tile) => tile.init());
    });

    // Set up event listeners
    this.on<IWillGetUpdateEvent>("willGetUpdate", () => {
      this._getTileUpdates();
    });
    this.on<IDidSetUpdateEvent>("didSetUpdate", () => {
      this._setTileUpdates();
    });
    return this;
  }

  public getData(): IMapData {
    let data = super.getData();
    data.tileData2DArray = this._tile2DArray.map((rowTiles) => {
      return rowTiles.map((tile) => tile.getData());
    });
    return data;
  }

  /**
   * Get the tile at the position
   * @param position The position of the tile
   */
  public getTile(position: IPosition): Tile | null {
    this.checkInit();
    if (!this.isInRange(position)) {
      return null;
    }
    let rowTiles = this._tile2DArray[position.row];
    if (!rowTiles) {
      return null;
    }
    let tile = rowTiles[position.col];
    if (!tile) {
      return null;
    }
    return tile;
  }

  /**
   * Indicate if the position is walkable
   * @param position The position of the tile
   * @returns Will return false if the position is out of bound.
   */
  public isWalkable(position: IPosition): boolean {
    this.checkInit();
    if (!this.isInRange(position)) {
      return false;
    }
    let tile = this.getTile(position);
    if (!tile) {
      return false;
    }
    return tile.walkable;
  }

  /**
   * Indicate if the position is in the map
   * @param position The position of the tile
   * @returns Will return false if the position is out of bound.
   */
  public isInRange(position: IPosition): boolean {
    return (
      position.col >= 0 &&
      position.col < this.colCount &&
      position.row >= 0 &&
      position.row < this.rowCount
    );
  }

  /**
   * This function uses a simpler logic to try to get the character close to the target.
   * It is not a pathfinding algorithm, but rather a way to keep the character moving.
   * Note that there is no guarantee of reaching the target if there are obstacles in the way.
   * The function will avoid going back to the previous position to prevent the character from walking back and forth indefinitely.
   *
   * @param character
   * @returns
   */
  public findNext(character: Character): Position | null {
    if (!character.target) {
      return null;
    }
    let diff = character.target.subtract(character.position);
    let hDiff = Math.abs(diff.col);
    let vDiff = Math.abs(diff.row);
    let horizontalFirst =
      hDiff > vDiff ? true : hDiff < vDiff ? false : Math.random() < 0.5;
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
      const position = character.position.add(offset);
      if (
        this.isWalkable(position) &&
        !character.prevPosition.equals(position)
      ) {
        return position;
      }
    }
    //Try previous position
    const position = character.prevPosition;
    if (!character.position.equals(position) && this.isWalkable(position)) {
      return position;
    }
    return null;
  }

  /**
   * Navigates from the current position to the target position using a simple pathfinding algorithm.
   * The algorithm generates an L-shaped path with a single turn, which is good enough for most cases.
   * However, it may fail to find a path if the target is too far away or the map is too complicated (i.e., requires more than one turn to reach the target).
   *
   * @param current The current position of the character.
   * @param target The target position to navigate to.
   * @param horizontalFirst If true, the algorithm will try to move horizontally first before moving vertically.
   * @param range The maximum number of steps to take in any direction. Default value is 10.
   * @returns An array of positions indicating the path to the target. Returns null if path not found.
   */
  public findPath(
    current: Position,
    target: Position,
    horizontalFirst: boolean,
    range: number = 10
  ): Array<Position> | null {
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
   * Finds a path to the target position along a specific direction.
   * The function searches for a path by moving in the specified direction and checking if each position is walkable.
   * If the target is reached or an obstacle is encountered, the function returns the path or null respectively.
   * An optional finder function can be provided to perform extra searching in each step.
   *
   * @param current The current position of the character.
   * @param target The target position to navigate to.
   * @param dir The heading direction for searching. dir.col & dir.row are the step size (suggested value: 0, 1, or -1).
   * @param maxStep The maximum number of steps to take in the specified direction. Default value is 10.
   * @param finderFunc An additional finder function which will perform extra searching in each step. Default value is undefined.
   * @returns An array of positions indicating the path to the target. Returns null if path not found or an obstacle is encountered.
   */
  public findInDir(
    current: Position,
    target: Position,
    dir: IPosition,
    maxStep: number = 10,
    finderFunc?: (current: Position) => Array<Position> | null
  ): Array<Position> | null {
    if (dir.col == 0 && dir.row == 0) {
      return null;
    }
    let position = current;
    let path: Array<Position> = [];
    for (let step = 1; step <= maxStep; step++) {
      position = position.add(dir);
      path.push(position);
      //Obstacle Encountered
      if (!this.isWalkable(position)) {
        return null;
      }
      //Path found
      if (position.equals(target)) {
        return path;
      }
      if (finderFunc) {
        let path2 = finderFunc(position);
        if (path2) {
          return path.concat(path2);
        }
      }
    }
    //Path not found
    return null;
  }

  private _getTileUpdates() {
    let changed = false;
    let tileData2DArray: Array<Array<ITileData | null>> = [];
    this._tile2DArray.forEach((row, rowIndex) => {
      let tileDataArray: Array<ITileData | null> = [];
      tileData2DArray.push(tileDataArray);
      row.forEach((tile, colIndex) => {
        let tileData = tile.getUpdate();
        tileDataArray[colIndex] = tileData;
        if (tileData) {
          changed = true;
        }
      });
    });
    if (changed) {
      this.data.tileData2DArray = tileData2DArray;
    }
  }

  private _setTileUpdates() {
    this.data.tileData2DArray.forEach((row, rowIndex) => {
      row.forEach((tileData, colIndex) => {
        let tile = this.getTile({ col: colIndex, row: rowIndex });
        if (!tile) {
          return;
        }
        tile.setUpdate(tileData);
      });
    });
  }
}
