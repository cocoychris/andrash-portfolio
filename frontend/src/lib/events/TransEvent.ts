import AnyEvent, { IEventType } from "./AnyEvent";

export interface IEventResponse {
  error: null;
}
export interface IErrorResponse {
  error: string;
}
export interface ICancelResponse {
  error: null;
  isCancelled: true;
}

export interface ITransEventType extends IEventType {
  error: null;
  type: string;
  data: object | null;
  response: IEventResponse;
}

/**
 * A custom event that can be used to pass data along with the event.
 */
export default class TransEvent<E extends ITransEventType> extends AnyEvent<E> {
  /**
   * The data that is passed along with the event.
   */
  public readonly callback: (response: E["response"] | IErrorResponse) => void;

  constructor(
    type: E["type"],
    data: E["data"],
    callback?: (response: E["response"] | IErrorResponse) => void
  ) {
    super(type, data);
    this.data = data;
    this.callback = callback || (() => {});
  }
}
