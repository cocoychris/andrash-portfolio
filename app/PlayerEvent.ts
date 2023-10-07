export default class PlayerEvent extends Event {
  public static readonly LEAVE_ROOM = "leaveRoom";
  public static readonly JOIN_ROOM = "joinRoom";
  public static readonly DESTROY = "destroy";

  constructor(type: string) {
    super(type);
  }
}
