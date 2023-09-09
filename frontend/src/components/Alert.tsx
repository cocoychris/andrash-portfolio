import { ReactNode } from "react";
import "./Alert.css";

interface Props {
  children: ReactNode;
  onClose: () => void;
}

const Alert = ({ children, onClose }: Props) => {
  return (
    <div className="alert">
      {children}
      <button type="button" className="btn-close" onClick={onClose}>
        ×
      </button>
      <div className="clearFloat"></div>
    </div>
  );
};

export default Alert;
