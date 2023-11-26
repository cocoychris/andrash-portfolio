import React, { MouseEventHandler, ReactNode, useEffect } from "react";
import "./Popup.css";
import { IIndexable } from "../lib/data/util";
import { CSSTransition } from "react-transition-group";

const EMOJI_DICT: IIndexable = {
  info: "📢", //💡
  warning: "⚠️",
  error: "❌",
  success: "✔️", //✅
};
const TITLE_DICT: IIndexable = {
  info: "Notice",
  warning: "Warning",
  error: "Error",
  success: "Success",
};
const DEFAULT_OPTIONS = {
  type: "info",
  title: "Notice",
  content: undefined,
  onClose: undefined,
  showCloseButton: true,
  buttonLabels: [],
  buttonActions: [],
  timeout: 0,
};

export interface IPopupOptions {
  type?: "info" | "warning" | "error" | "success";
  title?: ReactNode;
  content?: ReactNode;
  /**
   * A callback that will be called when the popup is closed by clicking the close button or calling close().
   * The return value of this callback will be the return value of the promise returned by open().
   * @returns
   */
  onClose?: () => void | Promise<void>;
  /**
   * Whether to show the default close button
   */
  showCloseButton?: boolean;
  /**
   * The labels of the buttons
   */
  buttonLabels?: Array<string>;
  /**
   * The callbacks of the buttons (in the same order as buttonLabels)
   * If buttonActions[i] is null, the onClose callback will be called when the button is clicked.
   * The return value of buttonActions[i] will be the return value of the promise returned by open().
   */
  buttonActions?: Array<(() => void | Promise<void>) | null>;
  /**
   * The time (in milliseconds) before the popup is closed automatically.
   */
  timeout?: number; // Will call onClose after timeout
}

interface IState {
  options: IPopupOptions | null;
}

export default class Popup extends React.Component<{}, IState> {
  private _timeoutID: NodeJS.Timeout | null = null;
  private _resolve: ((value: any) => void) | null = null;
  private _popupRef = React.createRef<HTMLDivElement>();
  private _optionsCache: IPopupOptions | null = null;

  public state: IState = {
    options: null,
  };
  /**
   * Close the popup
   * This will also resolve the promise returned by open()
   */
  public close(callOnClose: boolean = true) {
    this._close(callOnClose ? this.state.options?.onClose : null);
  }
  /**
   * Open a popup
   * @param options Options for the popup
   * @returns A promise that resolves when the popup is closed.
   * The value of the promise is the return value of the onClose callback or buttonActions[i].
   * If return value is undefined, the promise will resolve to a number indicating which button is clicked.
   */
  public open(options: IPopupOptions): Promise<any> {
    // Clear previous timeout
    if (this._timeoutID) {
      clearTimeout(this._timeoutID);
      this._timeoutID = null;
    }
    // Close previous popup
    this._resolve && this._resolve(null);
    this._resolve = null;
    // Set new timeout
    const timeout = options.timeout;
    if (timeout && timeout > 0) {
      this._timeoutID = setTimeout(() => {
        this._timeoutID = null;
        this._close(this.state.options?.onClose);
      }, timeout);
    }
    // Set new popup
    this.setState({ options });
    // Set callback
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
    });
  }

  private _getPopup() {
    if (this.state.options) {
      this._optionsCache = this.state.options;
    }
    let {
      type,
      title,
      content,
      onClose,
      showCloseButton,
      buttonLabels,
      buttonActions,
    } = { ...DEFAULT_OPTIONS, ...this._optionsCache };

    let useMask = showCloseButton || (buttonLabels && buttonLabels.length > 0);
    return (
      <div
        className={`popup ${useMask ? "mask" : "noMask"}`}
        ref={this._popupRef}
      >
        <div className={`messageBox ${type}`}>
          <div className="left">
            <div className="title">
              {EMOJI_DICT[type]} {title || TITLE_DICT[type]}
            </div>
            {content && (
              <div className="content">{content || "(Content missing!)"}</div>
            )}
            {buttonLabels.length > 0 && (
              <div className="footer">
                {buttonLabels.map((label, index) => {
                  return (
                    <button
                      type="button"
                      className="btn"
                      key={index}
                      onClick={() => {
                        this._close(buttonActions[index] || onClose, index);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              className="btn-close"
              onClick={() => {
                this._close(onClose);
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  public render() {
    return (
      <CSSTransition
        in={this.state.options != null}
        nodeRef={this._popupRef}
        timeout={300}
        classNames="popup"
        unmountOnExit
      >
        {this._getPopup()}
      </CSSTransition>
    );
  }

  private _close(actionFunc?: Function | null, resolveValue: any = null) {
    if (this._timeoutID) {
      clearTimeout(this._timeoutID);
      this._timeoutID = null;
    }
    let value = actionFunc && actionFunc();
    value === undefined && (value = resolveValue);
    this._resolve && this._resolve(value);
    this._resolve = null;
    this.setState({ options: null });
  }
}
