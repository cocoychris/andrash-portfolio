import Game, { IResetPhase } from "./Game";
import Player, { IPlayerData } from "./Player";
import Group, { IGroupData } from "./data/Group";
import { IWillDestroyEvent } from "./Destroyable";
import { randomElement } from "./data/util";

export default class PlayerGroup extends Group<
  PlayerGroup,
  IPlayerData,
  Player
> {
  private _game: Game;
  private _mainPlayerID: number = Player.ID_UNSET;

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
    super(Player, data);
    // Set up properties.
    this._game = game;
    this._onMainPlayerWillDestroy = this._onMainPlayerWillDestroy.bind(this);

    // Set up event listeners.
    this.onUpdate<IResetPhase>("reset", (props) => {
      if (this.mainPlayer) {
        this.mainPlayer.isOccupied = false;
        this.mainPlayer.off<IWillDestroyEvent>(
          "willDestroy",
          this._onMainPlayerWillDestroy
        );
        this._mainPlayerID = Player.ID_UNSET;
      }
    });
  }

  public init(mainPlayerID: number): void {
    this.initGroup();
    // Check if there is at least one player.
    if (this.length === 0) {
      throw new Error(
        "Player group is empty. At least one player is required."
      );
    }
    // Set main player.
    if (mainPlayerID != Player.ID_UNSET) {
      if (mainPlayerID == Player.ID_RANDOM) {
        mainPlayerID = randomElement(this.list()).id;
      }
      let player = this.get(mainPlayerID);
      if (!player) {
        throw new Error(`Player ${mainPlayerID} does not exist`);
      }
      this._mainPlayerID = mainPlayerID;
      player.isOccupied = true;
      player.once<IWillDestroyEvent>(
        "willDestroy",
        this._onMainPlayerWillDestroy
      );
    }
  }

  /**
   * Set the main player.
   * The main player cannot be changed once it is set.
   */
  public setMainPlayerID(mainPlayerID: number) {
    if (this._mainPlayerID !== Player.ID_UNSET) {
      throw new Error("mainPlayerID has already been set");
    }
  }

  private _onMainPlayerWillDestroy() {
    this._mainPlayerID = Player.ID_UNSET;
  }

  public getUnoccupiedPlayers(useStagedValue: boolean = false): Array<Player> {
    return this.list().filter((player) => {
      return useStagedValue ? !player.stagedIsOccupied : !player.isOccupied;
    });
  }
}
