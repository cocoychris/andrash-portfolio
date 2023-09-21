import { ReactNode, useRef, useEffect, useState } from "react";
import { Easing, Tween, update } from "@tweenjs/tween.js";
import PlayerDisplay from "./PlayerDisplay";
import Player from "../../lib/Player";
import { IMapData, IPosition, IRenderData } from "../../lib/interface";
import PlayerManager from "../../lib/PlayerManager";
import "./index.css";
import Position from "../../lib/Position";
import { ReactComponent as LocationIcon } from "../../assets/icons/location-svgrepo-com.svg";

const DEFAULT_CELL_SIZE = 100;
const EASE_SPEED = 500;
const renderProps = {
  renderX: 0,
  renderY: 0,
  cellSize: 0,
  renderRowCount: 0,
  renderColCount: 0,
  minRenderX: 0,
  minRenderY: 0,
  maxRenderY: 0,
  maxRenderX: 0,
  renderCenterY: 0,
  renderCenterX: 0,
};

interface Props {
  mapData: IMapData;
  playerManager: PlayerManager;
}

export default function GameView({ mapData, playerManager }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const [winHeight, setWinHeight] = useState(window.innerHeight);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [renderRow, setRenderRow] = useState<number>(0);
  const [renderCol, setRenderCol] = useState<number>(0);
  const [timeStamp, setTimeStamp] = useState<number>(0);

  updateRenderProps();

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

    //update
    let player = playerManager.getPlayer(0);
    if (!player) {
      console.warn(`Player (index = 0) not found.`);
      return;
    }

    playerManager.onUpdate = () => {
      forceRerender();
      if (player) {
        scrollTo(player);
      }
    };

    player.onTargetUpdate = () => {
      forceRerender();
    };

    return () => {
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      updateDivScroll();
    });
  });

  useEffect(() => {
    let player = playerManager.getPlayer(0);
    if (player) {
      scrollTo(player);
    }
  }, [winWidth, winHeight]);

  function forceRerender() {
    setTimeStamp(Date.now());
  }

  function updateRenderProps() {
    renderProps.cellSize = DEFAULT_CELL_SIZE;
    renderProps.renderRowCount =
      Math.ceil(winHeight / renderProps.cellSize) + 1;
    renderProps.renderColCount = Math.ceil(winWidth / renderProps.cellSize) + 1;
    renderProps.maxRenderX = mapData.colCount - renderProps.renderColCount + 1;
    renderProps.maxRenderY = mapData.rowCount - renderProps.renderRowCount + 1;
    renderProps.renderCenterX = (winWidth / renderProps.cellSize - 1) * 0.5;
    renderProps.renderCenterY = (winHeight / renderProps.cellSize - 1) * 0.5;
  }

  function gameRuntime() {
    update();
  }

  function scrollTo(position: IPosition) {
    const { col, row } = position;

    let start = {
      x: renderProps.renderX,
      y: renderProps.renderY,
    };
    let end = {
      x: Math.max(
        Math.min(col - renderProps.renderCenterX, renderProps.maxRenderX),
        0
      ),
      y: Math.max(
        Math.min(row - renderProps.renderCenterY, renderProps.maxRenderY),
        0
      ),
    };
    let tween = new Tween(start)
      .to(end, EASE_SPEED)
      .easing(Easing.Cubic.InOut)
      .onUpdate((updateObj) => {
        renderProps.renderX = updateObj.x;
        renderProps.renderY = updateObj.y;
        let newCol = Math.floor(updateObj.x);
        let newRow = Math.floor(updateObj.y);
        setRenderCol(newCol);
        setRenderRow(newRow);
        updateDivScroll();
        // window.requestAnimationFrame(() => {
        // });
      });
    tween.start();
  }

  function updateDivScroll() {
    if (!divRef.current) {
      return;
    }
    divRef.current.scrollLeft = Math.round(
      (renderProps.renderX - Math.floor(renderProps.renderX)) *
        renderProps.cellSize
    );
    divRef.current.scrollTop = Math.round(
      (renderProps.renderY - Math.floor(renderProps.renderY)) *
        renderProps.cellSize
    );
  }

  function onCellClick(col: number, row: number) {
    let player = playerManager.getPlayer(0);
    if (!player) {
      return;
    }
    let max1 = { col: 1, row: 1 };
    let min1 = { col: mapData.colCount - 2, row: mapData.rowCount - 2 };
    player.target = new Position({ col, row }).max(max1).min(min1);
  }

  let tdStyle = {
    width: `${renderProps.cellSize}px`,
    height: `${renderProps.cellSize}px`,
    backgroundColor: "none",
    backgroundImage: "none",
  };

  function getRenderDataArray(): Array<Array<IRenderData>> {
    let renderDataArray: Array<Array<IRenderData>> = [];
    for (let row = 0; row < renderProps.renderRowCount; row++) {
      renderDataArray[row] = new Array<IRenderData>();
      for (let col = 0; col < renderProps.renderColCount; col++) {
        let mapCol = col + renderCol;
        let mapRow = row + renderRow;
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
    return renderDataArray;
  }

  function renderTd(renderData: IRenderData) {
    let key = `${renderData.col}-${renderData.row}`;
    let style = { ...tdStyle };
    let tdContent: Array<ReactNode> = [];
    if (renderData.tileData) {
      style.backgroundColor = renderData.tileData.bgColor;
      if (renderData.tileData.bgImage) {
        style.backgroundImage = `url("${renderData.tileData.bgImage}")`;
      }
      if (renderData.tileData.objSVG) {
        const SVG = renderData.tileData.objSVG;
        tdContent.push(<SVG key="objSVG" className="objSVG" />);
      }
      for (let i = 0; i < playerManager.playerCount; i++) {
        const player = playerManager.getPlayer(i);
        if (player) {
          let isPrev = player.prevPosition.equals(renderData);
          if (player.position.equals(renderData) || isPrev) {
            tdContent.push(
              <PlayerDisplay
                player={player}
                col={renderData.col}
                row={renderData.row}
                key={`player-${player.id}-${key}`}
              />
            );
          }
          if (player.target && player.target.equals(renderData)) {
            let className = "targetSVG";
            if (player.target.equals(player.position)) {
              className += " fade-out";
            }
            tdContent.push(
              <LocationIcon key="targetSVG" className={className} />
            );
          }
        }
      }
      if (renderData.tileData.fgSVG) {
        const SVG = renderData.tileData.fgSVG;
        tdContent.push(<SVG key="fgSVG" className="fgSVG" />);
      }
      tdContent.push(key); //DEBUG
    }
    return (
      <td
        key={key}
        style={style}
        onClick={() => {
          onCellClick(renderData.col, renderData.row);
        }}
      >
        {tdContent}
      </td>
    );
  }
  function renderTr(rowRenderData: Array<IRenderData>) {
    let rowKey = 0;
    let rowContent = rowRenderData.map((renderData, index) => {
      index == 0 && (rowKey = renderData.row);
      return renderTd(renderData);
    });
    return <tr key={rowKey}>{rowContent}</tr>;
  }

  return (
    <div className="game-container" ref={divRef}>
      <table className="game-table">
        <tbody>{getRenderDataArray().map(renderTr)}</tbody>
      </table>
    </div>
  );
}
