import { IMapData } from "../lib/GameMap";
import { ITileData } from "../lib/Tile";
import tiles from "./tiles";
import items from "./items";
import characters from "./characters";

//Get tileNames from tiles
const tileNames: Array<string> = Object.keys(tiles);
const itemNames: Array<string> = Object.keys(items);
const characterNames: Array<string> = Object.keys(characters);

function chance(percent: number) {
  return Math.random() < percent;
}
function randomRange(start: number, end: number) {
  return Math.floor(Math.random() * (end - start)) + start;
}

function getTileDataArray(colCount: number, rowCount: number) {
  let tileDataArray: Array<Array<ITileData>> = [];
  for (let row = 0; row < rowCount; row++) {
    tileDataArray[row] = [];
    for (let col = 0; col < colCount; col++) {
      tileDataArray[row][col] = {
        walkable: null,
        bgColor: null,
        type: tileNames[randomRange(0, tileNames.length)],
        itemData: chance(0.3)
          ? {
              type: itemNames[randomRange(0, itemNames.length)],
              inFront: null,
            }
          : null,
      };
    }
  }
  return tileDataArray;
}
let mapData: IMapData = {
  name: "default",
  CharacterDataList: [
    {
      id: 1,
      type: "pac_man",
      col: 5,
      row: 3,
    },
    {
      id: 2,
      type: characterNames[1],
      col: 2,
      row: 10,
    },
  ],
  colCount: 30,
  rowCount: 20,
  tileDataArray: getTileDataArray(30, 20),
};

export default mapData;
