import React, { ReactNode, useRef, useEffect, useState } from "react";
import "./index.css";
import map from "./map";
import { Easing, Tween, update } from "@tweenjs/tween.js";

import { ReactComponent as PersonIcon } from "../../assets/icons/person-svgrepo-com.svg";

interface MapData {
  player1: PlayerData;
  player2: PlayerData;
  col: number;
  row: number;
  tileDataArray: Array<Array<TileData>>;
}

interface TileData {
  bgColor: string;
}

interface RenderData {
  col: number;
  row: number;
  tileData: TileData | null;
}

interface PlayerData {
  name: string;
  row: number;
  col: number;
  iconStyle?: object;
}

const MAX_VIEW_WIDTH = 700;
const DEFAULT_COL_COUNT = 7;
const NAV_BAR_HEIGHT = 60;
const EASE_SPEED = 250;

export default function GameView() {
  const mapData: MapData = map;
  const divRef = useRef<HTMLDivElement>(null);
  const player1 = useRef<PlayerData>({ ...map.player1 });
  const player2 = useRef<PlayerData>({ ...map.player2 });
  const [winHeight, setWinHeight] = useState(window.innerHeight);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [renderY, setRenderY] = useState<number>(0);
  const [renderX, setRenderX] = useState<number>(0);
  const renderOptions = useRef({
    cellSize: 0,
    renderRowCount: 0,
    maxRenderY: 0,
    centerRowOffset: 0,
  });

  updateRenderOptions();

  player1.current.iconStyle = { fill: "#ffffff" };

  useEffect(() => {
    //Handle Resize
    window.addEventListener("resize", () => {
      setWinWidth(window.innerWidth);
      setWinHeight(window.innerHeight);
    });
    //Trigger game runtime
    let id = setInterval(() => {
      gameRuntime();
    }, 25);
    return () => {
      clearInterval(id);
    };
  }, []);

  //Update Y scrolling
  useEffect(() => {
    if (!divRef.current) {
      return;
    }
    divRef.current.scrollTop =
      (renderY - Math.floor(renderY)) * renderOptions.current.cellSize;
  }, [renderY]);

  function updateRenderOptions() {
    let options = renderOptions.current;
    options.cellSize = Math.floor(
      Math.min(winWidth, MAX_VIEW_WIDTH) / DEFAULT_COL_COUNT
    );
    options.renderRowCount =
      Math.ceil((winHeight - NAV_BAR_HEIGHT) / options.cellSize) + 1;
    options.maxRenderY = map.row - options.renderRowCount + 3;
    options.centerRowOffset =
      Math.floor((options.renderRowCount - 1) * 0.5) - 1;
  }

  function gameRuntime() {
    update();
  }

  function scrollTo(row: number) {
    let start = {
      y: renderY,
    };
    let end = {
      y: Math.max(
        Math.min(
          row - renderOptions.current.centerRowOffset,
          renderOptions.current.maxRenderY
        ),
        0
      ),
    };
    let tween = new Tween(start)
      .to(end, Math.abs(end.y - start.y) * EASE_SPEED)
      .easing(Easing.Quadratic.InOut)
      .onUpdate((updateObj) => {
        setRenderY(updateObj.y);
      })
      .onComplete(() => {
        player1.current.row = end.y + renderOptions.current.centerRowOffset;
      });
    tween.start();
  }

  function onCellClick(row: number, col: number) {
    scrollTo(row);
  }

  let tdStyle = {
    width: `${renderOptions.current.cellSize}px`,
    height: `${renderOptions.current.cellSize}px`,
    background: "none",
  };

  let renderDataArray: Array<Array<RenderData>> = [];
  let offsetCol = Math.floor(renderX);
  let offsetRow = Math.floor(renderY);
  for (let row = 0; row < renderOptions.current.renderRowCount; row++) {
    renderDataArray[row] = new Array<RenderData>();
    for (let col = 0; col < DEFAULT_COL_COUNT; col++) {
      let mapCol = col + offsetCol;
      let mapRow = row + offsetRow;
      let tileData = mapData.tileDataArray[mapRow]
        ? mapData.tileDataArray[mapRow][mapCol]
        : null;
      renderDataArray[row][col] = {
        tileData,
        col: mapCol,
        row: mapRow,
      };
    }
  }

  return (
    <div className="game-container" ref={divRef}>
      <table className="game-table">
        <tbody>
          {renderDataArray.map((rowRenderData: Array<RenderData>) => {
            let rowKey = 0;
            let rowContent = rowRenderData.map((renderData, index) => {
              index == 0 && (rowKey = renderData.row);
              let key = `${renderData.col}-${renderData.row}`;
              let style = { ...tdStyle };
              if (renderData.tileData) {
                style.background = renderData.tileData.bgColor;
              }
              let playerNode = null;
              if (
                player1.current.row == renderData.row &&
                player1.current.col == renderData.col
              ) {
                playerNode = (
                  <PersonIcon
                    className="playerIcon"
                    style={player1.current.iconStyle}
                  />
                );
              }
              if (
                player2.current.row == renderData.row &&
                player2.current.col == renderData.col
              ) {
                playerNode = (
                  <PersonIcon
                    className="playerIcon"
                    style={player2.current.iconStyle}
                  />
                );
              }
              return (
                <td
                  key={key}
                  style={style}
                  onClick={() => {
                    onCellClick(renderData.row, renderData.col);
                  }}
                >
                  {playerNode || key}
                </td>
              );
            });
            return <tr key={rowKey}>{rowContent}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
