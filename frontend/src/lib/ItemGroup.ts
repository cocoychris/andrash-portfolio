import Game from "./Game";
import Item, { IItemData } from "./Item";
import Group, { IGroupData } from "./Group";
import DataHolderEvent from "./events/DataHolderEvent";
import Position, { IPosition } from "./Position";

interface IPositionMap {
  [key: string]: Array<Item>;
}

export default class ItemGroup extends Group<ItemGroup, IItemData, Item> {
  private _game: Game;
  private _positionMap: IPositionMap = {};

  /**
   * Get the game instance that created this manager.
   */
  public get game(): Game {
    return this._game;
  }

  constructor(game: Game, data: IGroupData<IItemData>) {
    super(data, Item);
    this._game = game;
  }

  public init(): void {
    super.init();
    this._updatePositionMap();
    //Set up event listeners
    this.addEventListener(DataHolderEvent.DID_SET_UPDATE, () => {
      this._updatePositionMap();
    });
  }
  /**
   * Get item at position
   * @param position
   * @returns
   */
  public listAt(position: IPosition): Array<Item> {
    this.checkInit();
    return this._positionMap[new Position(position).toString()] || [];
  }

  private _updatePositionMap(): void {
    this._positionMap = {};
    this.list().forEach((item) => {
      let key = item.position.toString();
      let list = this._positionMap[key];
      if (!list) {
        list = [];
        this._positionMap[key] = list;
      }
      list.push(item);
    });
  }
}
