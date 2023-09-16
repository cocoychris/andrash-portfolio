import { TileData } from "./index";
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
  let tileDataArray: Array<Array<TileData>> = [];
  for (let row = 0; row < rowCount; row++) {
    tileDataArray[row] = [];
    for (let col = 0; col < colCount; col++) {
      tileDataArray[row][col] = {
        bgColor: COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)],
      };
    }
  }
  return tileDataArray;
}

export default {
  player1: {
    name: "Player 1",
    col: 5,
    row: 3,
  },
  player2: {
    name: "Player 2",
    col: 2,
    row: 10,
  },
  col: 30,
  row: 20,
  tileDataArray: getTileDataArray(30, 20),
};
