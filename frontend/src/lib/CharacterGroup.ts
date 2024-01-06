import Game from "./Game";
import Character, { ICharacterData } from "./Character";
import Group, { IGroupData } from "./data/Group";
import CharacterDefPack from "./data/CharacterDefPack";

export default class CharacterGroup extends Group<
  CharacterGroup,
  ICharacterData,
  Character
> {
  private _game: Game;
  /**
   * Get the character definition pack
   * This is a shortcut for `game.assetPack.characterDefPack`
   */
  public get characterDefPack(): CharacterDefPack {
    return this._game.assetPack.characterDefPack;
  }
  /**
   * Get the game instance that created this group.
   */
  public get game(): Game {
    return this._game;
  }

  constructor(game: Game, data: IGroupData<ICharacterData>) {
    super(Character, data);
    this._game = game;
  }

  public init() {
    super.initGroup();
  }
}
