import PlayerGroup from "./PlayerGroup";
import { IIndexable, applyDefault, filterObjectByKey } from "./data/util";
import Member from "./Member";
import Character from "./Character";
import Position, { IPosition } from "./Position";

/**
 * Essential data for creating a new character object.
 */
export interface IPlayerData extends IIndexable {
  name?: string;
  color: string;
  characterID: number;
  target?: IPosition | null;
  isOccupied?: boolean;
}

const DEFAULT_PLAYER_DATA: IPlayerData = {
  name: undefined,
  color: "#ffffff",
  characterID: 0,
  target: null,
  isOccupied: false,
};

export default class Player extends Member<PlayerGroup, IPlayerData> {
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
    return this.data.color;
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
   */
  public get target(): Position | null {
    return this.data.target ? new Position(this.data.target) : null;
  }
  public set target(target: IPosition | null) {
    if (target && !this.group.game.map.isInRange(target)) {
      throw new Error(`Position out of range: ${target.col} - ${target.row}`);
    }
    this.data.target = target ? { col: target.col, row: target.row } : null;
  }
  /**
   * The staged target position of the player.
   */
  public get stagedTarget(): Position | null {
    return this.getStagedValue("target")
      ? new Position(this.getStagedValue("target"))
      : null;
  }
  /**
   * The character object that the player is using.
   */
  public get character(): Character {
    return this.group.game.characterGroup.get(this.characterID) as Character;
  }
  /**
   * Whether the player is taken by a user session.
   */
  public get isOccupied(): boolean {
    return this.data.isOccupied || false;
  }
  public set isOccupied(isOccupied: boolean) {
    this.data.isOccupied = isOccupied;
  }

  /**
   * Do not create a new Player instance with "new Player()" statement.
   * Use PlayerGroup.new() instead.
   */
  constructor(group: PlayerGroup, data: IPlayerData, id: number) {
    data = applyDefault(data, DEFAULT_PLAYER_DATA) as IPlayerData;
    if (!data.name) {
      data.name = "Player " + id;
    }
    super(group, data, id);
  }
  /**
   * Sync player data with its character.
   */
  public updateCharacter() {
    if (!this.getStagedValue("isOccupied")) {
      this._disableCharacter();
      return;
    }
    if (!this.character) {
      return;
    }
    let target = this.getStagedValue("target");
    this.character.target = target ? new Position(target) : null;
    this.character.color = this.getStagedValue("color");
    this.character.isEnabled = true;
  }

  private _disableCharacter() {
    if (!this.character) {
      return;
    }
    this.character.target = null;
    this.character.color = "#ffffff";
    this.character.isEnabled = false;
  }
}
