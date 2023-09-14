import { ReactNode, useState } from "react";

interface Props {
  icon: ReactNode;
  id: string;
  currentID: string;
  onClick: (id: string) => void;
  children?: ReactNode;
}

export default function NavItem(props: Props) {
  return (
    <li className="nav-item">
      <a
        href="#"
        className="icon-button"
        onClick={() => {
          props.onClick(props.id);
        }}
      >
        {props.icon}
      </a>
      {props.currentID == props.id && props.children}
    </li>
  );
}
