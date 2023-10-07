import Game from "./Game";
import Character, { ICharacterData } from "./Character";
import Group, { IGroupData } from "./Group";
import DataHolderEvent from "./events/DataHolderEvent";
import Position, { IPosition } from "./Position";
import Bindings from "./data/Bindings";
import GroupEvent from "./events/GroupEvent";
import CharacterEvent from "./events/CharacterEvent";

export default class CharacterGroup extends Group<
  CharacterGroup,
  ICharacterData,
  Character
> {
  private _game: Game;
  private _positionBindings: Bindings;

  /**
   * Get the game instance that created this manager.
   */
  public get game(): Game {
    return this._game;
  }

  constructor(game: Game, data: IGroupData<ICharacterData>) {
    super(data, Character);
    this._game = game;
    this._positionBindings = new Bindings(true);
  }

  public init(): void {
    let onMove = (event: CharacterEvent) => {
      let character = event.target as Character;
      this._updatePosition(character);
    };
    this.on(GroupEvent.DID_ADD_MEMBER, (event: GroupEvent) => {
      console.log("DID_ADD_MEMBER", event.memberID);
      let character = this.get(event.memberID) as Character;
      character.on(CharacterEvent.MOVE, onMove);
      this._updatePosition(character);
    });
    this.on(GroupEvent.DID_REMOVE_MEMBER, (event: GroupEvent) => {
      console.log("DID_REMOVE_MEMBER", event.memberID);
      let character = this.get(event.memberID) as Character;
      character.off(CharacterEvent.MOVE, onMove);
    });
    super.init();
  }
  /**
   * Get character at position
   * @param position
   * @returns
   */
  public listAt(position: IPosition): Array<Character> {
    this.checkInit();
    // return this._positionMap[new Position(position).toString()] || [];
    return (
      (this._positionBindings.collect(
        new Position(position).toString()
      ) as Array<Character>) || []
    );
  }

  private _updatePosition(character: Character) {
    this._positionBindings.set(character, [character.position.toString()]);
    this._positionBindings.bind(character, [character.prevPosition.toString()]);
  }
}
