import { ReactNode } from "react";
import "./Navbar.css";

interface Props {
  children: ReactNode;
}
export default function Navbar(props: Props) {
  return (
    <nav className="navbar">
      <ul className="navbar-nav">{props.children}</ul>
    </nav>
  );
}
