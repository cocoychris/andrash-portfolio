import { ReactComponent as CalendarIcon } from "../assets/icons/calendar-svgrepo-com.svg";
import { ReactComponent as ReactSVG } from "../assets/react.svg";
import TestSVG from "../assets/test.svg";
import { IMapData, ITileData } from "../lib/interface";
const COLOR_LIST: Array<string> = [
  "#ff9999",
  "#dd9999",
  "#aa8888",
  "#99ff99",
  "#99dd88",
  "#88aa88",
  "#9999ff",
  "#9999dd",
  "#8888aa",
  "#ffff99",
  "#dddd99",
  "#88aaaa",
  "#99ffff",
  "#99dddd",
  "#aa88aa",
  "#ff99ff",
  "#dd99dd",
];

function getTileDataArray(colCount: number, rowCount: number) {
  let tileDataArray: Array<Array<ITileData>> = [];
  for (let row = 0; row < rowCount; row++) {
    tileDataArray[row] = [];
    for (let col = 0; col < colCount; col++) {
      let walkable = Math.random() > 0.2;
      tileDataArray[row][col] = {
        walkable,
        bgColor: walkable
          ? COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)]
          : "#ff0000",
        bgImage: Math.random() > 0.5 ? TestSVG : null,
        fgSVG: Math.random() > 0.5 ? CalendarIcon : null,
        objSVG: Math.random() > 0.5 ? ReactSVG : null,
      };
    }
  }
  return tileDataArray;
}
let mapData: IMapData = {
  playerDataList: [
    {
      id: 1,
      col: 5,
      row: 3,
    },
    {
      id: 2,
      col: 2,
      row: 10,
    },
  ],
  colCount: 30,
  rowCount: 20,
  tileDataArray: getTileDataArray(30, 20),
};

export default mapData;
