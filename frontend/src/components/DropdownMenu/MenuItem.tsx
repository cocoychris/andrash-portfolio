import { ReactNode, ReactElement } from "react";
import { ItemData } from "./ItemData";

interface Props {
  item: ItemData;
  onSelect: () => void;
}

export default function MenuItem(props: Props) {
  const item = props.item;
  return (
    <a
      href="#"
      className="menu-item"
      onClick={() => {
        item.onClick && item.onClick();
        props.onSelect && props.onSelect();
      }}
    >
      <span className="icon-left">{item.leftIcon}</span>
      {item.label}
      <span className="icon-right">{item.rightIcon}</span>
    </a>
  );
}
