import { ICharacterDef, ICharacterFrameDef } from "../lib/IDefinition";
import CharacterGroup from "./CharacterGroup";
import Game from "./Game";
import Position, { IPosition } from "./Position";
import { IIndexable, applyDefault } from "./data/util";
import Member from "./Member";
import {
  IChangeSummary,
  IDidSetUpdateEvent,
  IWillGetUpdateEvent,
} from "./DataHolder";
import { IDestroyEvent } from "./Destroyable";
import AnyEvent, { IEventType } from "./events/AnyEvent";
import Tile from "./Tile";
import Item from "./Item";

export interface IMoveEvent extends IEventType {
  type: "move";
}
export interface IStopEvent extends IEventType {
  type: "stop";
}

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
  color?: string | null;
  isEnabled?: boolean;
}

const NAV_STATE = {
  IDLE: "idle",
  STUCK: "stuck",
  FOUND_PATH: "foundPath",
  TRYING: "trying",
  TARGET_REACHED: "targetReached",
};
Object.freeze(NAV_STATE);
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
  private _isStopping: boolean = false;
  private _currentTile: Tile | null = null;
  private _prevTile: Tile | null = null;

  /**
   * Get the type of the character.
   */
  public get type(): string {
    return this.data.type;
  }
  public set type(type: string) {
    if (!this._game.characterDefLoader.getDef(type)) {
      throw new Error(`Character type ${type} not found`);
    }
    this.data.type = type;
  }

  /**
   * Get position of the character.
   */
  public get position(): Position {
    return new Position(this.data.position);
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
    this.data.position = position.toObject();
  }

  /**
   * Get previous position of the character.
   */
  public get prevPosition(): Position {
    return new Position(this.data.prevPosition || this.data.position);
  }
  /**
   * Get the current tile of the character.
   */
  public get currentTile(): Tile {
    return this._currentTile as Tile;
  }
  /**
   * Get the previous tile of the character.
   */
  public get prevTile(): Tile {
    return this._prevTile || (this._currentTile as Tile);
  }

  /**
   * Get the target position of the character.
   */
  public get target(): Position | null {
    return this._target ? this._target.clone() : null;
  }

  public set target(target: Position | null) {
    if (target && !this._game.map.isInRange(target)) {
      throw new Error(`Position out of range: ${target.col} - ${target.row}`);
    }
    this._target = target ? target.clone() : null;
  }

  /**
   * Get the offset of the movement.
   */
  public get movement(): Position {
    return new Position(this.data.position).subtract(
      this.prevPosition as IPosition
    );
  }
  /**
   * Indicate if the character is moving.
   */
  public get isMoving(): boolean {
    return !this.prevPosition.equals(this.data.position);
  }
  /**
   * Shortcut for position.col
   */
  public get col(): number {
    return this.data.position.col;
  }
  /**
   * Shortcut for position.row
   */
  public get row(): number {
    return this.data.position.row;
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
    return this.data.frameName as string;
  }

  public set frameName(frameName: string) {
    this._getFrameDef(frameName); //Check if frameName is valid
    this.data.frameName = frameName;
  }

  /**
   * Indicate the current state of the character when navigating.
   * Use Character.NAV_STATE to compare.
   */
  public get navState(): string {
    return this.data.navState || NAV_STATE.IDLE;
  }
  public set navState(navState: string) {
    if (!VALID_NAV_STATE.includes(navState)) {
      throw new Error(`Invalid navState: ${navState}`);
    }
    this.data.navState = navState;
  }
  /**
   * Get the color of the character.
   */
  public get color(): string | null {
    return this.data.color || null;
  }
  public set color(color: string | null) {
    this.data.color = color;
  }
  /**
   * Indicate if the character is enabled.
   * Disabled character will be rendered differently.
   */
  public get isEnabled(): boolean {
    return this.data.isEnabled || false;
  }
  public set isEnabled(isEnabled: boolean) {
    this.data.isEnabled = isEnabled;
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
  public init(): this {
    super.init();
    //Set up event listeners
    let onWillGetUpdate = (event: AnyEvent<IWillGetUpdateEvent>) => {
      this.data.prevPosition = this.data.position;
      this._navigate();
    };
    let onDidSetUpdate = (event: AnyEvent<IDidSetUpdateEvent>) => {
      this._def = this._game.characterDefLoader.getDef(this.type);
      this._frameDef = this._getFrameDef(this.frameName);
      // let changes = event.data.changes as IChangeSummary;
      // if (this.isMoving || changes.updateProps.includes("prevPosition")) {
      if (this.isMoving) {
        this._isStopping = false;
        this._updateTile();
        this.emit<IMoveEvent>(new AnyEvent("move", null));
      } else if (!this._isStopping) {
        this._isStopping = true;
        this._updateTile();
        this.emit<IStopEvent>(new AnyEvent("stop", null));
      }
    };
    this.on<IWillGetUpdateEvent>("willGetUpdate", onWillGetUpdate);
    this.on<IDidSetUpdateEvent>("didSetUpdate", onDidSetUpdate);
    this.once<IDestroyEvent>("destroy", () => {
      this.off<IWillGetUpdateEvent>("willGetUpdate", onWillGetUpdate);
      this.off<IDidSetUpdateEvent>("didSetUpdate", onDidSetUpdate);
      this._currentTile?.internal.characters.delete(this);
      this._prevTile?.internal.prevCharacters.delete(this);
    });
    // Register to tile
    this._updateTile();
    return this;
  }
  /**
   * Get characters that this character is colliding with.
   * @param character A specific character to check collision with. If not specified, check collision with all characters in the current tile.
   * @returns return null if no collision. Otherwise, return an array of characters that this character is colliding with.
   */
  public hitCharacter(
    target: Character | null = null
  ): Array<Character> | null {
    // No target
    if (!target) {
      // On the same tile
      let list = this.currentTile.characters.filter(
        (character) => character != this
      );
      // Moved through each other
      list = list.concat(
        this.currentTile.prevCharacters.filter((character) => {
          return (
            character != this && character.position.equals(this.prevPosition)
          );
        })
      );
      return list.length > 0 ? list : null;
    }
    // Self
    if (this === target) {
      return null;
    }
    // Target on the same tile
    if (target.position.equals(this.position)) {
      return [target];
    }
    // Moved through each other
    if (
      this.prevPosition.equals(target.position) &&
      target.prevPosition.equals(this.position)
    ) {
      return [target];
    }
    return null;
  }
  /**
   * Get characters that this character is adjacent to.
   * @param target A specific character to check adjacency with. If not specified, check adjacency with all characters in the adjacent tiles.
   * @returns Return null if no adjacent character. Otherwise, return an array of characters that this character is adjacent to.
   */
  public adjacentCharacter(
    target: Character | null = null
  ): Array<Character> | null {
    if (!target) {
      let list: Array<Character> = [];
      this.currentTile.adjacentTiles.forEach((tile) => {
        list = list.concat(tile.characters);
      });
      // list = list.filter((character) => character != this); // Maybe not necessary
      return list.length > 0 ? list : null;
    }
    for (let tile of this.currentTile.adjacentTiles) {
      if (tile.internal.characters.has(target)) {
        return [target];
      }
    }
    return null;
  }

  /**
   * Get items that this character is colliding with.
   * @param target A specific item to check collision with. If not specified, check collision with all items in the current tile.
   * @returns Return null if no collision. Otherwise, return an array of items that this character is colliding with.
   */
  public hitItem(target: Item | null = null): Array<Item> | null {
    // No target
    if (!target) {
      let list = this.currentTile.items;
      return list.length > 0 ? list : null;
    }
    // Target on the same tile
    if (this.currentTile.internal.items.has(target)) {
      return [target];
    }
    return null;
  }

  /**
   * Get items that this character is adjacent to.
   * @param target A specific item to check adjacency with. If not specified, check adjacency with all items in the adjacent tiles.
   * @returns Return null if no adjacent item. Otherwise, return an array of items that this character is adjacent to.
   */
  public adjacentItem(target: Item | null = null): Array<Item> | null {
    if (!target) {
      let list: Array<Item> = [];
      this.currentTile.adjacentTiles.forEach((tile) => {
        list = list.concat(tile.items);
      });
      return list.length > 0 ? list : null;
    }
    for (let tile of this.currentTile.adjacentTiles) {
      if (tile.internal.items.has(target)) {
        return [target];
      }
    }
    return null;
  }

  private _updateTile(): void {
    // Current tile
    if (this.isMoving || !this._currentTile) {
      if (this._currentTile) {
        this._currentTile.internal.characters.delete(this);
      }
      this._currentTile = this._game.map.getTile(this.position);
      if (!this._currentTile) {
        throw new Error(
          `Tile not found at ${this.position.col} - ${this.position.row}`
        );
      }
      this._currentTile.internal.characters.add(this);
    }
    // Previous tile
    if (this._prevTile) {
      this._prevTile.internal.prevCharacters.delete(this);
    }
    this._prevTile = this._game.map.getTile(this.prevPosition);
    if (!this._prevTile) {
      throw new Error(
        `Tile not found at ${this.prevPosition.col} - ${this.prevPosition.row}`
      );
    }
    if (this._prevTile != this._currentTile) {
      this._prevTile.internal.prevCharacters.add(this);
    }
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
