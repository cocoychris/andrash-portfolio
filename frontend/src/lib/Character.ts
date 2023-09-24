import { ICharacterDef, ICharacterFrameDef } from "../lib/IDefinition";
import Game from "./Game";
import Position, { IPosition } from "./Position";
import CharacterEvent from "./events/CharacterEvent";

/**
 * Essential data for creating a new character object.
 */
export interface ICharacterData extends IPosition {
  id: number;
  type: string;
}

const DEFAULT_FRAME_NAME = "default";
const NAVIGATING_STATE = {
  IDLE: "idle",
  STUCK: "stuck",
  FOUND_PATH: "foundPath",
  TRYING: "trying",
  TARGET_REACHED: "targetReached",
};
Object.seal(NAVIGATING_STATE);
const VALID_NAVIGATING_STATE = Object.values(NAVIGATING_STATE);

export default class Character extends EventTarget implements IPosition {
  public static readonly NAVIGATING_STATE = NAVIGATING_STATE;

  private _data: ICharacterData;
  private _position: Position;
  private _prevPosition: Position;
  private _id: number = 0;
  private _target: Position | null = null;
  private _game: Game;
  private _frameName: string;
  private _def: ICharacterDef;
  private _frameDef: ICharacterFrameDef;
  private _navigatingState: string = NAVIGATING_STATE.IDLE;

  /**
   * Get the type of the character.
   */
  public get type(): string {
    return this._data.type;
  }
  /**
   * Get a copy of the data of the character.
   * You can create a same new character with this data.
   */
  public get data(): ICharacterData {
    return { ...this._data };
  }
  /**
   * Get a copy of the definition of the character.
   */
  public get def(): ICharacterDef {
    return { ...this._def };
  }
  /**
   * Get position of the character.
   */
  public get position(): Position {
    return this._position.clone();
  }
  /**
   * Set position of the character. A shorthand for move().
   * @event CharacterEvent.POSITION_CHANGE - Will be dispatched when the position is changed.
   */
  public set position(position: Position) {
    this.move(position);
  }
  /**
   * Get previous position of the character.
   */
  public get prevPosition(): Position {
    return this._prevPosition.clone();
  }
  /**
   * Set previous position of the character.
   */
  public set prevPosition(position: Position) {
    this._prevPosition = position.clone();
  }
  /**
   * Get the target position of the character.
   */
  public get target(): Position | null {
    return this._target && this._target.clone();
  }
  /**
   * Set the target position of the character.
   * @event CharacterEvent.TARGET_CHANGE - Will be dispatched when the target is changed.
   */
  public set target(position: Position | null) {
    this._target = position && position.clone();
    this.dispatchEvent(new CharacterEvent(CharacterEvent.TARGET_CHANGE));
  }
  /**
   * Game instance that created this character.
   */
  public get game(): Game {
    return this._game;
  }
  /**
   * Get the unique id of the character.
   */
  public get id(): number {
    return this._id;
  }
  /**
   * Get the offset of the movement.
   */
  public get movement(): Position {
    return this._position.subtract(this._prevPosition);
  }
  /**
   * Indicate if the character is moving.
   */
  public get isMoving(): boolean {
    return !this._position.equals(this._prevPosition);
  }
  /**
   * Shortcut for position.col
   */
  public get col(): number {
    return this._position.col;
  }
  /**
   * Shortcut for position.row
   */
  public get row(): number {
    return this._position.row;
  }
  /**
   * Get a copy of the definition of the current frame of the character.
   */
  public get frameDef(): ICharacterFrameDef {
    return { ...this._frameDef };
  }
  /**
   * Get the name of the current frame of the character.
   */
  public get frameName(): string {
    return this._frameName;
  }
  /**
   * Set the name of the current frame of the character.
   * This is a shorthand for goto().
   * @event CharacterEvent.FRAME_CHANGE - Will be dispatched when the frame is changed.
   */
  public set frameName(value: string) {
    this.goto(value);
  }
  /**
   * Indicate the current state of the character when navigating.
   * Use Character.NAVIGATING_STATE to compare.
   */
  public get navigatingState(): string {
    return this._navigatingState;
  }
  /**
   * Use Character.NAVIGATING_STATE to assign.
   * Assigning an unknown state will throw an error.
   * @event CharacterEvent.NAVIGATING_STATE_CHANGE - Will be dispatched when the navigating state is changed.
   * @example
   * character.navigatingState = Character.NAVIGATING_STATE.IDLE;
   */
  public set navigatingState(value: string) {
    if (this._navigatingState === value) {
      return;
    }
    if (!VALID_NAVIGATING_STATE.includes(value)) {
      throw new Error(`Unknown navigating state: ${value}`);
    }
    this._navigatingState = value;
    this.dispatchEvent(
      new CharacterEvent(CharacterEvent.NAVIGATING_STATE_CHANGE)
    );
  }

  /**
   * Do not create a new Character instance with "new Character()" statement.
   * Use Game.newCharacter() instead.
   */
  constructor(game: Game, data: ICharacterData) {
    super();
    if (!game._new) {
      throw new Error(
        `Creating a Character instance with "new Character()" statement is not supported. Please create it with Game.`
      );
    }
    this._game = game;
    this._data = data;
    this._position = new Position(data);
    this._prevPosition = new Position(data);
    this._id = data.id;
    this._def = game.characterDefLoader.getDef(data.type);
    this._frameName = DEFAULT_FRAME_NAME;
    this._frameDef = this._getFrameDef(this._frameName);
  }

  /**
   * Move to desired position.
   * The value of current position will be assigned as previous position.
   * Will not move if desired position is not walkable.
   * @param position
   * @event CharacterEvent.POSITION_CHANGE - Will be dispatched when the position is changed.
   * @returns The offset of the movement. Note that the movement.col and movement.row could both be 0 if not moved.
   */
  public move(position: IPosition): Position {
    console.log(`Moving to ${position.col} - ${position.row} `);
    this._prevPosition.set(this._position);
    let tile = this.game.gameMap.getTile(position);
    if (tile && tile.walkable) {
      this._position.set(position);
    } else {
      console.log("NOT WALKABLE", position.col, position.row, tile);
    }
    this.dispatchEvent(new CharacterEvent(CharacterEvent.POSITION_CHANGE));
    return this.movement;
  }
  /**
   * Go to specified frame.
   * @param frameName
   * @event CharacterEvent.FRAME_CHANGE - Will be dispatched when the frame is changed.
   * @returns
   */
  public goto(frameName: string) {
    if (frameName === this._frameName) {
      return;
    }
    this._frameName = frameName;
    this._frameDef = this._getFrameDef(frameName);
    this.dispatchEvent(new CharacterEvent(CharacterEvent.FRAME_CHANGE));
  }

  private _getFrameDef(frameName: string): ICharacterFrameDef {
    let frameDef = this._def.frames[frameName];
    if (!frameDef) {
      throw new Error(`Unknown frame name: ${frameName}`);
    }
    return frameDef;
  }
}
