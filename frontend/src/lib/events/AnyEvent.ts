export interface IEventType {
  type: string;
  data: object | null;
}
/**
 * A custom event that can be used to pass data along with the event.
 */
export default class AnyEvent<E extends IEventType> extends Event {
  /**
   * The data that is passed along with the event.
   */
  public data: E["data"];

  constructor(type: E["type"], data: E["data"], eventInitDict?: EventInit) {
    super(type, eventInitDict);
    this.data = data;
  }
}
