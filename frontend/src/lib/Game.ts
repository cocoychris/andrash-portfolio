import GameMap, { IMapData } from "./GameMap";
import Character, { ICharacterData } from "./Character";
import Position, { IPosition } from "./Position";
import GameEvent from "./events/GameEvent";
import DefLoader from "./DefLoader";
import { ICharacterDef, IDefGroup, IItemDef, ITileDef } from "./IDefinition";
import CharacterEvent from "./events/CharacterEvent";

export interface IGameData {
  mapData: IMapData;
  charaterDefGroup: IDefGroup<ICharacterDef>;
  tileDefGroup: IDefGroup<ITileDef>;
  itemDefGroup: IDefGroup<IItemDef>;
}

/**
 * Represents a game session. A game session contains all the game data and objects.
 * To restart a game, create a new Game instance.
 */
export default class Game extends EventTarget {
  private _characterList: Array<Character> = [];
  private __new: boolean = false;
  private _gameMap: GameMap;
  private _tileDefLoader: DefLoader<ITileDef>;
  private _characterDefLoader: DefLoader<ICharacterDef>;
  private _itemDefLoader: DefLoader<IItemDef>;

  public get characterCount(): number {
    return this._characterList.length;
  }
  public get _new(): boolean {
    return this.__new;
  }
  /**
   * Get the game map object that contains all the tiles and map information.
   */
  public get gameMap(): GameMap {
    return this._gameMap;
  }

  /**
   * A tile definition loader that contains all tile definitions.
   */
  public get tileDefLoader(): DefLoader<ITileDef> {
    return this._tileDefLoader;
  }
  /**
   * A character definition loader that contains all character definitions.
   */
  public get characterDefLoader(): DefLoader<ICharacterDef> {
    return this._characterDefLoader;
  }
  /**
   * A item definition loader that contains all item definitions.
   */
  public get itemDefLoader(): DefLoader<IItemDef> {
    return this._itemDefLoader;
  }

  constructor(gameData: IGameData) {
    super();
    this._tileDefLoader = new DefLoader(gameData.tileDefGroup);
    this._characterDefLoader = new DefLoader(gameData.charaterDefGroup);
    this._itemDefLoader = new DefLoader(gameData.itemDefGroup);
    this._gameMap = new GameMap(this, gameData.mapData);
    //Add Characters form gameMap
    for (let i = 0; i < this._gameMap.characterCount; i++) {
      const CharacterData = this._gameMap.getCharacterData(i);
      if (CharacterData) {
        let character = this.newCharacter(CharacterData);
        character.addEventListener(
          CharacterEvent.NAVIGATING_STATE_CHANGE,
          (event) => {
            console.log("navigatingState", character.navigatingState);
            if (
              character.navigatingState == Character.NAVIGATING_STATE.TRYING
            ) {
              character.frameName = "search";
            } else if (
              character.navigatingState == Character.NAVIGATING_STATE.FOUND_PATH
            ) {
              character.frameName = "cart";
            } else if (
              character.navigatingState ==
              Character.NAVIGATING_STATE.TARGET_REACHED
            ) {
              character.frameName = "gift";
            } else {
              character.frameName = "default";
            }
          }
        );
      }
    }
  }
  /**
   * Create a character instance and have it managed by this Game.
   * @param data Essential data for creating a new character object.
   * @returns Created character instance.
   */
  newCharacter(data: ICharacterData): Character {
    this.__new = true;
    let character = new Character(this, data);
    this.__new = false;
    this._characterList.push(character);
    return character;
  }

  getCharacter(index: number): Character | null {
    return this._characterList[index] || null;
  }
  /**
   * Update all the characters.
   */
  public update() {
    this.dispatchEvent(new GameEvent(GameEvent.WILL_UPDATE));
    //Moving character to the target
    for (let i = 0; i < this._characterList.length; i++) {
      const character = this._characterList[i];
      this._moveCharacter(character, this.gameMap);
    }
    this.dispatchEvent(new GameEvent(GameEvent.DID_UPDATE));
  }

  private _moveCharacter(character: Character, gameMap: GameMap) {
    //No target
    if (!character.target) {
      character.navigatingState = Character.NAVIGATING_STATE.IDLE;
      return;
    }
    //Target reached
    if (character.position.equals(character.target)) {
      character.target = null;
      character.prevPosition = character.position;
      character.navigatingState = Character.NAVIGATING_STATE.TARGET_REACHED;
      return;
    }
    let diff = character.target.subtract(character.position);
    //Navigate - First attempt
    let horizontalFirst = Math.abs(diff.col) > Math.abs(diff.row);
    let path = gameMap.navigate(
      character.position,
      character.target,
      horizontalFirst
    );
    if (path && path.length > 0) {
      character.move(path[0]);
      character.navigatingState = Character.NAVIGATING_STATE.FOUND_PATH;
      return;
    }
    //Navigate - Second attempt
    path = gameMap.navigate(
      character.position,
      character.target,
      !horizontalFirst //Different direction (vertical/horizontal)
    );
    if (path && path.length > 0) {
      character.move(path[0]);
      character.navigatingState = Character.NAVIGATING_STATE.FOUND_PATH;
      return;
    }
    //Just move somewhere - No guarantee of reaching the target. But it's good to keep moving.
    let position = gameMap.getNextPosition(character);
    if (position) {
      character.move(position);
      character.navigatingState = Character.NAVIGATING_STATE.TRYING;
      return;
    }
    //You are stucked! - No where to move, probably caged.
    character.target = null;
    character.navigatingState = Character.NAVIGATING_STATE.STUCK;
    return;
  }
}
