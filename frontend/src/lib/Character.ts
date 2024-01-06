import CharacterGroup from "./CharacterGroup";
import Game, { IActionPhase, IResetPhase } from "./Game";
import Position, { IPosition } from "./Position";
import { IIndexable, applyDefault } from "./data/util";
import Member from "./data/Member";
import { IDidApplyEvent, IDidSetUpdateEvent } from "./data/DataHolder";
import { IWillDestroyEvent } from "./Destroyable";
import AnyEvent, { IEventType } from "./events/AnyEvent";
import Tile from "./Tile";
import Item from "./Item";
import FieldDef from "./data/FieldDef";
import { ISpriteFrameDef } from "./data/DefPack";
import { ICharacterDef } from "./data/CharacterDefPack";

export interface IRepositionEvent extends IEventType {
  type: "reposition";
  data: {
    prevTile: Tile | null;
    currentTile: Tile | null;
  };
}

export interface ITargetUpdateEvent extends IEventType {
  type: "targetUpdate";
  data: {
    prevTarget: Position | null;
    target: Position | null;
  };
}

/**
 * Essential data for creating a new character object.
 */
export interface ICharacterData extends IIndexable {
  type: string;
  position: IPosition;
  prevPosition?: IPosition;
  frameName?: string;
  color?: string | null;
  isEnabled?: boolean;
  facingDir?: 1 | -1;
}

const DEFAULT_DATA: Partial<ICharacterData> = {
  prevPosition: undefined,
  frameName: "default",
  color: "#999999",
  isEnabled: true,
  facingDir: 1,
};

function getFieldDef(game: Game, data: ICharacterData) {
  return new FieldDef<ICharacterData>(
    {
      type: "object",
      acceptNull: false,
      children: {
        type: {
          type: "string",
          valueList: game.assetPack.characterDefPack.typeNames,
        },
        position: {
          type: "object",
          children: {
            col: {
              type: "number",
              minNum: 0,
              maxNum: game.tileManager.colCount,
            },
            row: {
              type: "number",
              minNum: 0,
              maxNum: game.tileManager.rowCount,
            },
          },
        },
        prevPosition: {
          type: "object",
          acceptUndefined: true,
          // editable: false,
          children: {
            col: {
              type: "number",
              minNum: 0,
              maxNum: game.tileManager.colCount,
            },
            row: {
              type: "number",
              minNum: 0,
              maxNum: game.tileManager.rowCount,
            },
          },
        },
        frameName: {
          type: "string",
          acceptUndefined: true,
          editable: false,
        },
        color: {
          type: "string",
          inputType: "color",
          acceptUndefined: true,
          acceptNull: true,
          regExp: /#[0-f]{6}/i,
        },
        isEnabled: {
          type: "boolean",
          acceptUndefined: true,
        },
        facingDir: {
          type: "number",
          valueList: [1, -1],
          acceptUndefined: true,
        },
      },
    },
    data,
    "characterData"
  );
}

export default class Character
  extends Member<CharacterGroup, ICharacterData>
  implements IPosition
{
  public static readonly DEFAULT_FRAME_NAME: string =
    DEFAULT_DATA.frameName as string;
  public static readonly DEFAULT_COLOR: string = DEFAULT_DATA.color as string;

  private _game: Game;
  private _def: ICharacterDef;
  private _frameDef: ISpriteFrameDef;
  private _target: Position | null = null;
  private _isStopping: boolean = false;
  private _currentTile: Tile | null = null;
  private _prevTile: Tile | null = null;

  /**
   * Indicates whether the character is selected.
   */
  public isSelected: boolean = false;

  /**
   * Get the type of the character.
   */
  public get type(): string {
    return this.data.type;
  }
  public set type(type: string) {
    if (!this.group.characterDefPack.get(type)) {
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

  public set position(position: IPosition) {
    if (!this._game.tileManager.isInRange(position)) {
      throw new Error(
        `Position out of range: ${position.col} - ${position.row}`
      );
    }
    this.data.position = { col: position.col, row: position.row };
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

  public set target(target: IPosition | null) {
    if (target && !this._game.tileManager.isInRange(target)) {
      throw new Error(`Position out of range: ${target.col} - ${target.row}`);
    }
    let prevTarget = this._target;
    this._target = target ? new Position(target) : null;
    this.emit<ITargetUpdateEvent>(
      new AnyEvent("targetUpdate", {
        prevTarget: prevTarget,
        target: this._target,
      })
    );
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
  public get frameDef(): ISpriteFrameDef {
    return { ...this._frameDef };
  }
  /**
   * Get the name of the current frame of the character.
   */
  public get frameName(): string {
    return (this.data.frameName as string) || Character.DEFAULT_FRAME_NAME;
  }

  public set frameName(frameName: string) {
    this._getFrameDef(frameName); //Check if frameName is valid
    this.data.frameName = frameName;
  }

  /**
   * Get the color of the character.
   */
  public get color(): string {
    return this.data.color || Character.DEFAULT_COLOR;
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
   * Indicate the facing direction of the character.
   * 1: Right
   * -1: Left
   */
  public get facingDir(): 1 | -1 {
    return this.data.facingDir || 1;
  }

  /**
   * Do not create a new Character instance with "new Character()" statement.
   * Use CharacterGroup.new() instead.
   */
  constructor(group: CharacterGroup, id: number, data: ICharacterData) {
    data = applyDefault(data, DEFAULT_DATA) as ICharacterData;
    super(group, id, data);
    this._game = group.game;
    this._def = this.group.characterDefPack.get(this.type);
    this._frameDef = this._getFrameDef(this.frameName);

    this.onUpdate<IActionPhase>("action", (event) => {
      let prevPosition = this.data.position;
      this.data.prevPosition = this.data.position;
      this._navigate();
      let newPosition = this.stagedData.position;
      if (prevPosition.col < newPosition.col) {
        this.data.facingDir = 1;
      } else if (prevPosition.col > newPosition.col) {
        this.data.facingDir = -1;
      }
    });
    this.onUpdate<IResetPhase>("reset", () => {
      this.setData({
        // prevPosition: undefined,
      });
    });
    let onDidSetUpdate = (event: AnyEvent<IDidSetUpdateEvent>) => {
      this._def = this.group.characterDefPack.get(this.type);
      this._frameDef = this._getFrameDef(this.frameName);
      if (this.isMoving) {
        this._isStopping = false;
        this._updateTile();
      } else if (!this._isStopping) {
        this._isStopping = true;
        this._updateTile();
      }
    };
    let onDidApply = (event: AnyEvent<IDidApplyEvent>) => {
      this._def = this.group.characterDefPack.get(this.type);
      this._frameDef = this._getFrameDef(this.frameName);
      this._updateTile();
    };
    // this.on<IWillGetUpdateEvent>("willGetUpdate", onWillGetUpdate);
    this.on<IDidSetUpdateEvent>("didSetUpdate", onDidSetUpdate);
    this.on<IDidApplyEvent>("didApply", onDidApply);
    this.once<IWillDestroyEvent>("willDestroy", () => {
      // this.off<IWillGetUpdateEvent>("willGetUpdate", onWillGetUpdate);
      this.off<IDidSetUpdateEvent>("didSetUpdate", onDidSetUpdate);
      this.off<IDidApplyEvent>("didApply", onDidApply);
      this._currentTile && this._currentTile["internal"].removeCharacter(this);
      this._prevTile && this._prevTile["internal"].removePrevCharacter(this);
    });
    // Register to tile
    this._updateTile();
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
      if (tile.hasCharacter(target)) {
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
    if (this.currentTile.hasItem(target)) {
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
      if (tile.hasItem(target)) {
        return [target];
      }
    }
    return null;
  }

  public getFieldDef(): FieldDef<ICharacterData> {
    return getFieldDef(this._game, this.data);
  }

  public setData(data: Partial<ICharacterData>): void {
    super.setData(data);
  }
  private _updateTile(): void {
    // Current tile
    if (this.isMoving || !this._currentTile) {
      if (this._currentTile) {
        this._currentTile["internal"].removeCharacter(this);
      }
      this._currentTile = this._game.tileManager.getTile(this.position);
      if (!this._currentTile) {
        throw new Error(
          `Tile not found at ${this.position.col} - ${this.position.row}`
        );
      }
      this._currentTile["internal"].addCharacter(this);
    }
    // Previous tile
    if (this._prevTile) {
      this._prevTile["internal"].removePrevCharacter(this);
    }
    this._prevTile = this._game.tileManager.getTile(this.prevPosition);
    if (!this._prevTile) {
      throw new Error(
        `Tile not found at ${this.prevPosition.col} - ${this.prevPosition.row}`
      );
    }
    if (this._prevTile != this._currentTile) {
      this._prevTile["internal"].addPrevCharacter(this);
      this.emit<IRepositionEvent>(
        new AnyEvent("reposition", {
          prevTile: this._prevTile,
          currentTile: this._currentTile,
        })
      );
    }
  }

  private _getFrameDef(frameName: string): ISpriteFrameDef {
    let frameDef = this._def.frames[frameName];
    if (!frameDef) {
      throw new Error(`Unknown frame name: ${frameName}`);
    }
    return frameDef;
  }

  private _navigate(): void {
    let tileManager = this._game.tileManager;
    //No target
    if (!this.target) {
      this.frameName = "default";
      return;
    }
    //Target reached
    if (this.position.equals(this.target)) {
      this.target = null;
      this.frameName = "arrived";
      return;
    }
    let diff = this.target.subtract(this.position);
    //Navigate - First attempt
    let horizontalFirst = Math.abs(diff.col) > Math.abs(diff.row);
    let path = tileManager.findPath(
      this.position,
      this.target,
      horizontalFirst
    );
    if (path && path.length > 0) {
      this.frameName = "chasing";
      this.position = path[0];
      return;
    }
    //Navigate - Second attempt
    path = tileManager.findPath(
      this.position,
      this.target,
      !horizontalFirst //Different direction (vertical/horizontal)
    );
    if (path && path.length > 0) {
      this.frameName = "chasing";
      this.position = path[0];
      return;
    }
    //Just move somewhere - No guarantee of reaching the this.target. But it's good to keep moving.
    let position = tileManager.findNext(this);
    if (position) {
      this.frameName = "searching";
      this.position = position;
      return;
    }
    //You are stucked! - No where to move, probably caged.
    this.target = null;
    this.frameName = "default";
    return;
  }
}
