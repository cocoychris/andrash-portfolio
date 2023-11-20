import { ReactNode, useEffect } from "react";
import "./Popup.css";
import { IIndexable } from "../lib/data/util";

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
const DEFAULT_ALERT_OPTIONS = {
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
  onClose?: () => void | Promise<void>;
  showCloseButton?: boolean;
  buttonLabels?: Array<string>;
  buttonActions?: Array<(() => void | Promise<void>) | null>;
  timeout?: number; // Will call onClose after timeout
}

const Popup = (props: { options: IPopupOptions }) => {
  const {
    type,
    title,
    content,
    onClose,
    showCloseButton,
    buttonLabels,
    buttonActions,
    timeout,
  } = {
    ...DEFAULT_ALERT_OPTIONS,
    ...props.options,
  };

  useEffect(() => {
    if (timeout > 0 && onClose) {
      let timeoutID = setTimeout(onClose, timeout);
      return () => {
        clearTimeout(timeoutID);
      };
    }
  }, []);

  return (
    <div className={`mask`}>
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
                    onClick={buttonActions[index] || onClose}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {showCloseButton && onClose && (
          <button type="button" className="btn-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Popup;
