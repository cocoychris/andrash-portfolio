import Game from "./Game";
import Player, { IPlayerData } from "./Player";
import Group, { IGroupData } from "./Group";
import { IWillDestroyEvent } from "./Destroyable";

export default class PlayerGroup extends Group<
  PlayerGroup,
  IPlayerData,
  Player
> {
  private _game: Game;
  private _mainPlayerID: number = -1;

  /**
   * Get the game instance that created this group.
   */
  public get game(): Game {
    return this._game;
  }
  /**
   * The ID of the main player. Initially -1 if not set.
   */
  public get mainPlayerID(): number {
    return this._mainPlayerID;
  }

  /**
   * Get the main player. Will return null if the main player does not exist or mainPlayerID has not been set.
   */
  public get mainPlayer(): Player | null {
    return this.get(this._mainPlayerID);
  }
  /**
   * The ID of the host player.
   * To set the host player, use game.hostPlayerID.
   */
  public get hostPlayerID(): number {
    return this.game.hostPlayerID;
  }
  /**
   * Get the host player. Will return null if the host player does not exist.
   */
  public get hostPlayer(): Player | null {
    return this.get(this.hostPlayerID);
  }

  constructor(game: Game, data: IGroupData<IPlayerData>) {
    super(data, Player);
    this._game = game;
  }

  public init(mainPlayerID?: number): this {
    // this.on(GroupEvent.DID_ADD_MEMBER, (event: GroupEvent) => {
    //   let player = this.get(event.memberID) as Player;
    // });
    // this.on(GroupEvent.DID_REMOVE_MEMBER, (event: GroupEvent) => {
    //   let player = this.get(event.memberID) as Player;
    // });
    super.init();
    if (mainPlayerID !== undefined) {
      let player = this.get(mainPlayerID);
      if (!player) {
        throw new Error(`Player ${mainPlayerID} does not exist`);
      }
      this._mainPlayerID = mainPlayerID;
      player.isOccupied = true;
      player.once<IWillDestroyEvent>("willDestroy", () => {
        this._mainPlayerID = -1;
      });
    }
    // Check if there is at least one player.
    if (this.list().length === 0) {
      throw new Error(
        "Player group is empty. At least one player is required."
      );
    }
    return this;
  }

  public getUnoccupiedPlayers(useStagedValue: boolean = false): Array<Player> {
    return this.list().filter((player) => {
      return useStagedValue ? !player.stagedIsOccupied : !player.isOccupied;
    });
  }
}
