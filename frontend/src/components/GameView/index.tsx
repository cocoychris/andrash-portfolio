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

export interface TileData {
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

const DEFAULT_CELL_SIZE = 120;
const EASE_SPEED = 400;

export default function GameView() {
  const mapData: MapData = map;
  const divRef = useRef<HTMLDivElement>(null);
  const [player1, setPlayer1] = useState<PlayerData>({ ...map.player1 });
  const [player2, setPlayer2] = useState<PlayerData>({ ...map.player2 });
  const [winHeight, setWinHeight] = useState(window.innerHeight);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [renderY, setRenderY] = useState<number>(0);
  const [renderX, setRenderX] = useState<number>(0);
  const renderOptions = useRef({
    cellSize: 0,
    renderRowCount: 0,
    renderColCount: 0,
    minRenderX: 0,
    minRenderY: 0,
    maxRenderY: 0,
    maxRenderX: 0,
    renderCenterY: 0,
    renderCenterX: 0,
  });

  updateRenderOptions();

  player1.iconStyle = { fill: "#ffffff" };

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
    divRef.current.scrollLeft =
      (renderX - Math.floor(renderX)) * renderOptions.current.cellSize;
    divRef.current.scrollTop =
      (renderY - Math.floor(renderY)) * renderOptions.current.cellSize;
  }, [renderX, renderY]);

  useEffect(() => {
    scrollTo(player1.col, player1.row);
  }, [winWidth, winHeight]);

  function updateRenderOptions() {
    let options = renderOptions.current;
    options.cellSize = DEFAULT_CELL_SIZE;
    options.renderRowCount = Math.ceil(winHeight / options.cellSize) + 1;
    options.renderColCount = Math.ceil(winWidth / options.cellSize) + 1;
    options.maxRenderX = map.col - options.renderColCount + 1;
    options.maxRenderY = map.row - options.renderRowCount + 1;
    options.renderCenterX = (winWidth / options.cellSize - 1) * 0.5;
    options.renderCenterY = (winHeight / options.cellSize - 1) * 0.5;
  }

  function gameRuntime() {
    update();
  }

  function scrollTo(col: number, row: number) {
    let start = {
      x: renderX,
      y: renderY,
    };
    let end = {
      x: Math.max(
        Math.min(
          col - renderOptions.current.renderCenterX,
          renderOptions.current.maxRenderX
        ),
        0
      ),
      y: Math.max(
        Math.min(
          row - renderOptions.current.renderCenterY,
          renderOptions.current.maxRenderY
        ),
        0
      ),
    };
    let tween = new Tween(start)
      .to(end, EASE_SPEED)
      .easing(Easing.Quadratic.InOut)
      .onUpdate((updateObj) => {
        setRenderY(updateObj.y);
        setRenderX(updateObj.x);
      });
    tween.start();
  }

  function onCellClick(col: number, row: number) {
    let playerData: PlayerData = {
      ...player1,
      col: Math.min(Math.max(col, 1), map.col - 2),
      row: Math.min(Math.max(row, 1), map.row - 2),
    };
    setPlayer1(playerData);
    scrollTo(playerData.col, playerData.row);
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
    for (let col = 0; col < renderOptions.current.renderColCount; col++) {
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
                player1.row == renderData.row &&
                player1.col == renderData.col
              ) {
                playerNode = (
                  <PersonIcon
                    className="playerIcon"
                    style={player1.iconStyle}
                  />
                );
              }
              if (
                player2.row == renderData.row &&
                player2.col == renderData.col
              ) {
                playerNode = (
                  <PersonIcon
                    className="playerIcon"
                    style={player2.iconStyle}
                  />
                );
              }
              return (
                <td
                  key={key}
                  style={style}
                  onClick={() => {
                    onCellClick(renderData.col, renderData.row);
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
