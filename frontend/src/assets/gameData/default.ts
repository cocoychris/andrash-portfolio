import { ITileData } from "../../lib/Tile";
import tileDefPack from "../gameDef/tile";
import itemDefPack from "../gameDef/item";
import characterDefPack from "../gameDef/character";
import { IGameData } from "../../lib/Game";

//Get tileNames from tiles
const tileNames: Array<string> = Object.keys(tileDefPack);
const itemNames: Array<string> = Object.keys(itemDefPack);
const characterNames: Array<string> = Object.keys(characterDefPack);

let gameData: IGameData = {
  playerDataDict: {
    0: {
      characterID: 0,
      color: "#ffff00",
    },
    1: {
      characterID: 1,
      color: "#00ffff",
    },
  },
  characterDataDict: {
    0: {
      type: "pac_man",
      position: { col: 5, row: 3 },
    },
    1: {
      type: "ghost",
      position: {
        col: 2,
        row: 10,
      },
    },
  },
  itemDataDict: {
    0: {
      type: "star",
      position: {
        col: 10,
        row: 10,
      },
    },
    1: {
      type: "reactIcon",
      position: {
        col: 5,
        row: 5,
      },
    },
    2: {
      type: "star",
      position: {
        col: 6,
        row: 8,
      },
    },
    3: {
      type: "reactIcon",
      position: {
        col: 12,
        row: 15,
      },
    },
  },
  mapData: {
    id: "default",
    name: "Default Map",
    colCount: 30,
    rowCount: 20,
    tileData2DArray: getTileDataArray(30, 20),
  },
};

export default gameData;

function chance(percent: number) {
  return Math.random() < percent;
}
function randomRange(start: number, end: number) {
  return Math.floor(Math.random() * (end - start)) + start;
}

function getTileDataArray(colCount: number, rowCount: number) {
  let tileData2DArray: Array<Array<ITileData>> = [];
  for (let row = 0; row < rowCount; row++) {
    tileData2DArray[row] = [];
    for (let col = 0; col < colCount; col++) {
      tileData2DArray[row][col] = {
        walkable: null,
        bgColor: null,
        type: tileNames[randomRange(0, tileNames.length)],
      };
    }
  }
  return tileData2DArray;
}
