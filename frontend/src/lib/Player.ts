import PlayerManager from "./PlayerManager";
import { IPlayerData, IPosition } from "./interface";
import Position from "./Position";

export default class Player implements IPosition {
  public static get MOOD_NORMAL(): string {
    return "normal";
  }
  public static get MOOD_CONFUSE(): string {
    return "confuse";
  }
  public static get MOOD_HAPPY(): string {
    return "happy";
  }
  public static get MOOD_OMG(): string {
    return "omg";
  }
  public static get MOOD_OK(): string {
    return "ok";
  }

  private _position: Position = new Position();
  private _prevPosition: Position = new Position();
  private _id: number = 0;
  private _target: Position | null = null;
  private _manager: PlayerManager;
  private _mood: string = Player.MOOD_NORMAL;
  private _moodTimer: number | undefined;

  public name: string = "";

  public get position(): Position {
    return this._position.clone();
  }
  public set position(position: Position) {
    this._position = position.clone();
    this.onReposition && this.onReposition(this);
  }

  public get prevPosition(): Position {
    return this._prevPosition.clone();
  }
  public set prevPosition(position: Position) {
    this._prevPosition = position.clone();
  }

  public get target(): Position | null {
    return this._target && this._target.clone();
  }
  public set target(position: Position | null) {
    this._target = position && position.clone();
    this.onTargetUpdate &&
      this.onTargetUpdate(this._target && this._target.clone());
  }

  public get manager(): PlayerManager {
    return this._manager;
  }

  public get id(): number {
    return this._id;
  }
  public get movement(): Position {
    return this._position.subtract(this._prevPosition);
  }
  public get isMoving(): boolean {
    return !this._position.equals(this._prevPosition);
  }

  public get col(): number {
    return this._position.col;
  }
  public get row(): number {
    return this._position.row;
  }

  public get mood(): string {
    return this._mood;
  }

  // public set col(value: number) {
  //   this._prevPosition.col = this._position.col;
  //   this._position.col = Math.floor(value);
  //   this.onReposition && this.onReposition(this);
  // }
  // public set row(value: number) {
  //   this._prevPosition.row = this._position.row;
  //   this._position.row = Math.floor(value);
  //   this.onReposition && this.onReposition(this);
  // }

  /**
   * Callback function. Will be called if current or previous position changed.
   */
  public onReposition: ((player: Player) => void) | null = null;
  public onTargetUpdate: ((target: Position | null) => void) | null = null;

  constructor(manager: PlayerManager, data: IPlayerData) {
    if (!manager._new) {
      throw new Error(
        `Creating a Player instance with "new Player()" statement is not supported. Please create it with PlayerManager.`
      );
    }
    this._manager = manager;
    this._position.set(data);
    this._prevPosition.set(data);
    this._id = data.id;
    this.name = `Player_${this._id}`;
  }

  /**
   * Move to desired position.
   * The value of current position will be assigned as previous position.
   * Will no move if desired position is not walkable.
   * @param position
   * @returns The offset of the movement. Note that the movement.col and movement.row could both be 0 if not moved.
   */
  public moveTo(position: IPosition): Position {
    console.log(`Moving to ${position.col} - ${position.row} `);
    this._prevPosition.set(this._position);
    let tileData = this.manager.gameMap.getTileData(position);
    if (tileData && tileData.walkable) {
      this._position.set(position);
    } else {
      console.log("NOT WALKABLE", position.col, position.row, tileData);
    }
    this.onReposition && this.onReposition(this);
    return this.movement;
  }

  public setMood(mood: string, duration: number = 3000) {
    this._mood = mood;
    clearTimeout(this._moodTimer);
    this._moodTimer = setTimeout(() => {
      this._mood = Player.MOOD_NORMAL;
    }, duration);
  }
}
