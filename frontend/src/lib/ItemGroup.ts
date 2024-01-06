import Game from "./Game";
import Item, { IItemData } from "./Item";
import Group, { IGroupData } from "./data/Group";
import ItemDefPack from "./data/ItemDefPack";

export default class ItemGroup extends Group<ItemGroup, IItemData, Item> {
  private _game: Game;
  /**
   * Get the item definition pack
   * This is a shortcut for `game.assetPack.itemDefPack`
   */
  public get itemDefPack(): ItemDefPack {
    return this._game.assetPack.itemDefPack;
  }

  /**
   * Get the game instance that created this group.
   */
  public get game(): Game {
    return this._game;
  }

  constructor(game: Game, data: IGroupData<IItemData>) {
    super(Item, data);
    this._game = game;
  }
  public init() {
    super.initGroup();
  }
}
