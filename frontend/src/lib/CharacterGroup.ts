import Game from "./Game";
import Character, { ICharacterData } from "./Character";
import Group, { IGroupData } from "./Group";

export default class CharacterGroup extends Group<
  CharacterGroup,
  ICharacterData,
  Character
> {
  private _game: Game;

  /**
   * Get the game instance that created this group.
   */
  public get game(): Game {
    return this._game;
  }

  constructor(game: Game, data: IGroupData<ICharacterData>) {
    super(data, Character);
    this._game = game;
  }

  public init(): this {
    super.init();
    return this;
  }
}
