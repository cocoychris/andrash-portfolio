import { FunctionComponent, SVGProps } from "react";

export interface IMapData {
  playerDataList: Array<IPlayerData>;
  colCount: number;
  rowCount: number;
  tileDataArray: Array<Array<ITileData>>;
}

export interface ITileData {
  walkable: boolean;
  bgColor: string;
  bgImage?: string | null;
  fgSVG?: FunctionComponent<SVGProps<SVGSVGElement>> | null;
  objSVG?: FunctionComponent<SVGProps<SVGSVGElement>> | null;
}

export interface IRenderData extends IPosition {
  tileData: ITileData | null;
}

export interface IPlayerData extends IPosition {
  id: number;
}

export interface IPosition {
  col: number;
  row: number;
}
