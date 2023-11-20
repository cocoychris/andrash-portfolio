import Game from "./Game";
import Item, { IItemData } from "./Item";
import Group, { IGroupData } from "./Group";

export default class ItemGroup extends Group<ItemGroup, IItemData, Item> {
  private _game: Game;
  // private _positionMap: IPositionMap = {};

  /**
   * Get the game instance that created this group.
   */
  public get game(): Game {
    return this._game;
  }

  constructor(game: Game, data: IGroupData<IItemData>) {
    super(data, Item);
    this._game = game;
  }

  public init(): this {
    super.init();
    return this;
  }
}
