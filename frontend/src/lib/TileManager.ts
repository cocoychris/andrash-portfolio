import Character from "./Character";
import Game from "./Game";
import Position, { IPosition } from "./Position";
import Tile, { ITileData } from "./Tile";
import { DataObject, IDidRemoveChildEvent } from "./data/DataHolder";
import DataUpdater from "./data/DataUpdater";
import DefPack, { ITileDef } from "./data/DefPack";
import { IDidDestroyEvent } from "./Destroyable";

export interface ITileDataDict extends DataObject {
  [key: string]: ITileData | null;
}

/**
 * Manages all the tiles in the game map.
 */
export default class TileManager extends DataUpdater<ITileDataDict> {
  /**
   * Get the tile key from the position
   */
  public static readonly getTileKey = getTileKey;

  private _game: Game;
  private _colCount: number;
  private _rowCount: number;

  /**
   * The tile definition pack for the game map.
   * This is a shorthand for `this.game.assetPack.tileDefPack`
   */
  public get tileDefPack(): DefPack<ITileDef> {
    return this.game.assetPack.tileDefPack;
  }
  /**
   * Get number of columns
   */
  public get colCount(): number {
    return this._colCount;
  }
  /**
   * Get number of rows
   */
  public get rowCount(): number {
    return this._rowCount;
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
  constructor(game: Game, data: ITileDataDict) {
    // Check data
    for (let row = 0; row < game.mapInfo.height; row++) {
      for (let col = 0; col < game.mapInfo.width; col++) {
        let key = getTileKey({ col, row });
        let tileData = data[key];
        if (!tileData) {
          throw new Error(`Tile data not found at (${col}, ${row})`);
        }
      }
    }
    super(data);
    // Set up properties
    this._game = game;
    this._colCount = game.mapInfo.width;
    this._rowCount = game.mapInfo.height;

    // Set up event listeners
    // Using "didRemoveChild" event instead of "didDestroy" event deliberately as the children are already removed and cannot be accessed by the time "didDestroy" event is triggered.
    this.on<IDidRemoveChildEvent>("didRemoveChild", (event) => {
      event.data.child.destroy();
    });
  }
  /**
   * Initialize the tile manager.
   * This will create all the tile instances according to the data.
   */
  public init() {
    // Create tiles
    const tileCreator = (property: string, data: DataObject) => {
      let key = property;
      let position = key.split(",");
      let col = Number(position[0]);
      let row = Number(position[1]);
      if (isNaN(col) || isNaN(row)) {
        throw new Error(`Invalid tile key ${key}`);
      }
      if (!this.isInRange({ col, row })) {
        throw new Error(`Tile position out of range: ${key}`);
      }
      return new Tile(this, data as ITileData, { col, row });
    };
    this.setChildCreator(tileCreator);
  }

  /**
   * Get the tile at the position
   * @param position The position of the tile
   */
  public getTile(position: IPosition): Tile | null {
    if (!this.isInRange(position)) {
      return null;
    }
    return this.getChild(getTileKey(position)) as Tile;
  }

  /**
   * Indicate if the position is walkable
   * @param position The position of the tile
   * @returns Will return false if the position is out of bound.
   */
  public isWalkable(position: IPosition): boolean {
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
   * Indicate if the position is in range
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
}
function getTileKey(position: IPosition): string {
  return `${position.col},${position.row}`;
}
