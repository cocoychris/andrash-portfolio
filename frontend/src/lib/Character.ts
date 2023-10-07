import { ICharacterDef, ICharacterFrameDef } from "../lib/IDefinition";
import CharacterGroup from "./CharacterGroup";
import Game from "./Game";
import Position, { IPosition } from "./Position";
import { IIndexable, applyDefault } from "./data/util";
import DataHolderEvent from "./events/DataHolderEvent";
import Member from "./Member";
import MemberEvent from "./events/MemberEvent";
import CharacterEvent from "./events/CharacterEvent";
import { IChangeSummary } from "./DataHolder";
/**
 * Essential data for creating a new character object.
 */
export interface ICharacterData extends IIndexable {
  type: string;
  position: IPosition;
  prevPosition?: IPosition;
  frameName?: string;
  // target?: IPosition | null;
  navState?: string;
}

const NAV_STATE = {
  IDLE: "idle",
  STUCK: "stuck",
  FOUND_PATH: "foundPath",
  TRYING: "trying",
  TARGET_REACHED: "targetReached",
};
Object.seal(NAV_STATE);
const VALID_NAV_STATE = Object.values(NAV_STATE);

export default class Character
  extends Member<CharacterGroup, ICharacterData>
  implements IPosition
{
  public static readonly NAV_STATE = NAV_STATE;
  public static readonly DEFAULT_FRAME_NAME = "default";

  private _game: Game;
  private _def: ICharacterDef;
  private _frameDef: ICharacterFrameDef;
  private _target: Position | null = null;

  /**
   * Get the type of the character.
   */
  public get type(): string {
    return this._data.type;
  }
  public set type(type: string) {
    if (!this._game.characterDefLoader.getDef(type)) {
      throw new Error(`Character type ${type} not found`);
    }
    this._data.type = type;
  }

  /**
   * Get position of the character.
   */
  public get position(): Position {
    return new Position(this._data.position);
  }

  public set position(position: Position) {
    if (!this._game.map.isInRange(position)) {
      throw new Error(
        `Position out of range: ${position.col} - ${position.row}`
      );
    }
    if (!this._game.map.isWalkable(position)) {
      throw new Error(
        `Position is not walkable: ${position.col} - ${position.row}`
      );
    }
    this._data.position = position.toObject();
  }

  /**
   * Get previous position of the character.
   */
  public get prevPosition(): Position {
    return new Position(this._data.prevPosition || this._data.position);
  }

  public set prevPosition(position: Position) {
    if (!this._game.map.isInRange(position)) {
      throw new Error(
        `Position out of range: ${position.col} - ${position.row}`
      );
    }
    if (!this._game.map.isWalkable(position)) {
      throw new Error(
        `Position is not walkable: ${position.col} - ${position.row}`
      );
    }
    this._data.prevPosition = position.toObject();
  }

  /**
   * Get the target position of the character.
   */
  public get target(): Position | null {
    // let value = this.getStagedValue("target");
    // return value ? new Position(value) : null;
    return this._target ? this._target.clone() : null;
  }

  public set target(target: Position | null) {
    if (target && !this._game.map.isInRange(target)) {
      throw new Error(`Position out of range: ${target.col} - ${target.row}`);
    }
    //  this._data.target = target && target.toObject();
    this._target = target ? target.clone() : null;
  }

  /**
   * Get the offset of the movement.
   */
  public get movement(): Position {
    return new Position(this._data.position).subtract(
      this.prevPosition as IPosition
    );
  }
  /**
   * Indicate if the character is moving.
   */
  public get isMoving(): boolean {
    return !this.prevPosition.equals(this._data.position);
  }
  /**
   * Shortcut for position.col
   */
  public get col(): number {
    return this._data.position.col;
  }
  /**
   * Shortcut for position.row
   */
  public get row(): number {
    return this._data.position.row;
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
    return this._data.frameName as string;
  }

  public set frameName(frameName: string) {
    this._getFrameDef(frameName); //Check if frameName is valid
    this._data.frameName = frameName;
  }

  /**
   * Indicate the current state of the character when navigating.
   * Use Character.NAV_STATE to compare.
   */
  public get navState(): string {
    return this._data.navState || NAV_STATE.IDLE;
  }
  public set navState(navState: string) {
    if (!VALID_NAV_STATE.includes(navState)) {
      throw new Error(`Invalid navState: ${navState}`);
    }
    this._data.navState = navState;
  }

  /**
   * Do not create a new Character instance with "new Character()" statement.
   * Use CharacterGroup.new() instead.
   */
  constructor(group: CharacterGroup, data: ICharacterData, id: number) {
    data = applyDefault(data, {
      frameName: Character.DEFAULT_FRAME_NAME,
      navState: NAV_STATE.IDLE,
    }) as ICharacterData;
    super(group, data, id);
    this._game = group.game;
    this._def = this._game.characterDefLoader.getDef(this.type);
    this._frameDef = this._getFrameDef(this.frameName);
  }
  /**
   * Initialize the character.
   */
  public init(): void {
    super.init();
    //Set up event listeners
    let onWillGetUpdate = (event: DataHolderEvent) => {
      this._data.prevPosition = this._data.position;
      this._navigate();
    };
    let onDidSetUpdate = (event: DataHolderEvent) => {
      this._def = this._game.characterDefLoader.getDef(this.type);
      this._frameDef = this._getFrameDef(this.frameName);
      let changes = event.changes as IChangeSummary;
      if (this.isMoving || changes.updateProps.includes("prevPosition")) {
        this.dispatchEvent(new CharacterEvent(CharacterEvent.MOVE));
      }
    };
    let onDestroy = (event: MemberEvent) => {
      this.removeEventListener(
        DataHolderEvent.WILL_GET_UPDATE,
        onWillGetUpdate
      );
      this.removeEventListener(DataHolderEvent.DID_SET_UPDATE, onDidSetUpdate);
      this.removeEventListener(MemberEvent.DESTROY, onDestroy);
    };
    this.addEventListener(DataHolderEvent.WILL_GET_UPDATE, onWillGetUpdate);
    this.addEventListener(DataHolderEvent.DID_SET_UPDATE, onDidSetUpdate);
    this.addEventListener(MemberEvent.DESTROY, onDestroy);
  }

  private _getFrameDef(frameName: string): ICharacterFrameDef {
    let frameDef = this._def.frames[frameName];
    if (!frameDef) {
      throw new Error(`Unknown frame name: ${frameName}`);
    }
    return frameDef;
  }

  private _navigate(): void {
    let map = this._game.map;
    //No target
    if (!this.target) {
      this.navState = Character.NAV_STATE.IDLE;
      this.frameName = "default";
      return;
    }
    //Target reached
    if (this.position.equals(this.target)) {
      this.target = null;
      this.navState = Character.NAV_STATE.TARGET_REACHED;
      this.frameName = "gift";
      return;
    }
    let diff = this.target.subtract(this.position);
    //Navigate - First attempt
    let horizontalFirst = Math.abs(diff.col) > Math.abs(diff.row);
    let path = map.findPath(this.position, this.target, horizontalFirst);
    if (path && path.length > 0) {
      this.navState = Character.NAV_STATE.FOUND_PATH;
      this.frameName = "cart";
      this.position = path[0];
      return;
    }
    //Navigate - Second attempt
    path = map.findPath(
      this.position,
      this.target,
      !horizontalFirst //Different direction (vertical/horizontal)
    );
    if (path && path.length > 0) {
      this.navState = Character.NAV_STATE.FOUND_PATH;
      this.frameName = "cart";
      this.position = path[0];
      return;
    }
    //Just move somewhere - No guarantee of reaching the this.target. But it's good to keep moving.
    let position = map.findNext(this);
    if (position) {
      this.navState = Character.NAV_STATE.TRYING;
      this.frameName = "search";
      this.position = position;
      return;
    }
    //You are stucked! - No where to move, probably caged.
    this.target = null;
    this.navState = Character.NAV_STATE.STUCK;
    this.frameName = "default";
    return;
  }
}
