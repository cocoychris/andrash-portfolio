export default class RoomEvent extends Event {
  public static readonly PLAYER_JOIN = "playerJoin";
  public static readonly PLAYER_LEAVE = "playerLeave";
  public static readonly DESTROY = "destroy";

  constructor(type: string) {
    super(type);
  }
}
