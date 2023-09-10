import { FunctionComponent } from "react";
export interface ItemData {
  label?: string;
  leftIcon?: JSX.Element | null;
  rightIcon?: JSX.Element | null;
  goBack?: boolean;
  onClick?: (() => void) | null;
  items?: Array<ItemData> | null;
}
