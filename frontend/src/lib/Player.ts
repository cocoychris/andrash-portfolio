import PlayerGroup from "./PlayerGroup";
import { IIndexable, applyDefault, filterObjectByKey } from "./data/util";
import Member from "./data/Member";
import Character from "./Character";
import Position, { IPosition } from "./Position";
import FieldDef from "./data/FieldDef";
import Game, { IResetPhase } from "./Game";
import {
  IDidApplyEvent,
  IDidSetUpdateEvent,
  IWillGetUpdateEvent,
} from "./data/DataHolder";

/**
 * Essential data for creating a new character object.
 */
export interface IPlayerData extends IIndexable {
  name?: string;
  color?: string;
  characterID: number;
  target?: IPosition | null;
  isOccupied?: boolean;
}

function getFieldDef(game: Game, data: IPlayerData) {
  return new FieldDef<IPlayerData>(
    {
      type: "object",
      acceptNull: false,
      children: {
        name: {
          type: "string",
        },
        color: {
          type: "string",
          regExp: /#[0-f]{6}/i,
          inputType: "color",
          acceptUndefined: true,
        },
        characterID: {
          type: "number",
          editable: false,
        },
        target: {
          type: "object",
          acceptNull: true,
          acceptUndefined: true,
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
        isOccupied: {
          type: "boolean",
          acceptUndefined: true,
        },
      },
    },
    data,
    "playerData"
  );
}

export default class Player extends Member<PlayerGroup, IPlayerData> {
  public static readonly ID_RANDOM = -999;
  public static readonly ID_UNSET = -1;

  private _isSelected: boolean = false;
  /**
   * The name of the player.
   */
  public get name(): string {
    return this.data.name || "Player " + this.id;
  }
  public set name(name: string) {
    this.data.name = name;
  }
  /**
   * The color of the player.
   */
  public get color(): string {
    return this.data.color as string;
  }
  public set color(color: string) {
    this.data.color = color;
  }
  /**
   * Indicates whether the player is the host of the game.
   */
  public get isHost(): boolean {
    return this.id === this.group.hostPlayerID;
  }
  /**
   * Indicates whether the player is the main player.
   */
  public get isMainPlayer(): boolean {
    return this.id === this.group.mainPlayerID;
  }
  /**
   * The ID of the character that the player is using.
   */
  public get characterID(): number {
    return this.data.characterID;
  }
  public set characterID(characterID: number) {
    if (characterID != this.data.characterID) {
      this._disableCharacter();
      this.data.characterID = characterID;
      this.updateCharacter();
    }
  }
  /**
   * The target position of the player.
   * When reading, the value is from current data.
   * When writing, the value is written to staged data.
   */
  public get target(): Position | null {
    return this.data.target ? new Position(this.data.target) : null;
  }
  public set target(target: IPosition | null) {
    if (target && !this.group.game.tileManager.isInRange(target)) {
      throw new Error(`Position out of range: ${target.col} - ${target.row}`);
    }
    this.data.target = target ? { col: target.col, row: target.row } : null;
  }
  /**
   * The staged target position of the player.
   * The value is from staged data.
   */
  public get stagedTarget(): Position | null {
    return this.stagedData.target ? new Position(this.stagedData.target) : null;
  }
  /**
   * The character object that the player is using.
   */
  public get character(): Character {
    return this.group.game.characterGroup.get(this.characterID) as Character;
  }
  /**
   * Whether the player is taken by a user session.
   * When reading, the value is from current data.
   * When writing, the value is written to staged data.
   */
  public get isOccupied(): boolean {
    return this.data.isOccupied || false;
  }
  public set isOccupied(isOccupied: boolean) {
    this.data.isOccupied = isOccupied;
  }
  /**
   * Whether the player is taken by a user session.
   * The value is from staged data.
   */
  public get stagedIsOccupied(): boolean {
    return this.stagedData.isOccupied || false;
  }
  /**
   * Whether the player is selected.
   */
  public get isSelected(): boolean {
    return this._isSelected;
  }
  public set isSelected(isSelected: boolean) {
    this.character.isSelected = isSelected;
    this._isSelected = isSelected;
  }

  /**
   * Do not create a new Player instance with "new Player()" statement.
   * Use PlayerGroup.new() instead.
   */
  constructor(group: PlayerGroup, id: number, data: IPlayerData) {
    data = applyDefault(data, {
      name: (data.name = "Player " + id),
      color: "#999999",
      target: null,
      isOccupied: false,
    });
    super(group, id, data);

    this.onUpdate<IResetPhase>("reset", () => {
      this.setData({
        name: (data.name = "Player " + id),
        target: null,
        isOccupied: false,
      });
    });

    this.on<IWillGetUpdateEvent>("willGetUpdate", (event) => {
      this.updateCharacter();
    });
  }

  // Making the method public
  public setData(data: Partial<IPlayerData>) {
    super.setData(data);
    this.updateCharacter();
  }
  /**
   * Sync player data with its character.
   */
  public updateCharacter() {
    if (!this.stagedData.isOccupied) {
      this._disableCharacter();
      return;
    }
    if (!this.character) {
      return;
    }
    let target = this.stagedData.target;
    this.character.target = target ? new Position(target) : null;
    this.character.color = this.stagedData.color as string;
    this.character.isEnabled = true;
  }

  public getFieldDef(): FieldDef<IPlayerData> {
    return getFieldDef(this.group.game, this.data);
  }

  private _disableCharacter() {
    if (!this.character) {
      return;
    }
    this.character.target = null;
    this.character.isEnabled = false;
  }
}
