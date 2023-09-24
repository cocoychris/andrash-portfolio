import { ReactNode, useRef, useEffect, useState } from "react";
import { Easing, Tween, update } from "@tweenjs/tween.js";
import CharacterDisplay from "./CharacterDisplay";
import { IPosition } from "../../lib/Position";
import Game from "../../lib/Game";
import "./index.css";
import Position from "../../lib/Position";
import { ReactComponent as LocationIcon } from "../../assets/icons/location-svgrepo-com.svg";
import Tile from "../../lib/Tile";
import GameMap from "../../lib/GameMap";
import GameEvent from "../../lib/events/GameEvent";
import Character from "../../lib/Character";
import CharacterEvent from "../../lib/events/CharacterEvent";

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

export interface IRenderData extends IPosition {
  col: number;
  row: number;
  tile: Tile | null;
}

interface Props {
  game: Game;
}

export default function GameView({ game }: Props) {
  const gameMap: GameMap = game.gameMap;
  const divRef = useRef<HTMLDivElement>(null);
  const [winHeight, setWinHeight] = useState(window.innerHeight);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [renderRow, setRenderRow] = useState<number>(0);
  const [renderCol, setRenderCol] = useState<number>(0);
  const [timeStamp, setTimeStamp] = useState<number>(0);

  updateRenderProps();

  useEffect(() => {
    console.log("GameView mount");
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
    let character: Character = game.getCharacter(0) as Character;
    if (!character) {
      console.warn(`character (index = 0) not found.`);
      return;
    }

    function onGameUpdate() {
      forceRerender();
      if (character) {
        scrollTo(character);
      }
    }
    game.addEventListener(GameEvent.DID_UPDATE, onGameUpdate);

    character.addEventListener(CharacterEvent.TARGET_CHANGE, forceRerender);

    return () => {
      console.log("GameView unmount");
      game.removeEventListener(GameEvent.DID_UPDATE, onGameUpdate);
      character.removeEventListener(
        CharacterEvent.TARGET_CHANGE,
        forceRerender
      );
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      updateDivScroll();
    });
  });

  useEffect(() => {
    let character = game.getCharacter(0);
    if (character) {
      scrollTo(character);
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
    renderProps.maxRenderX = gameMap.colCount - renderProps.renderColCount + 1;
    renderProps.maxRenderY = gameMap.rowCount - renderProps.renderRowCount + 1;
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
    let character = game.getCharacter(0);
    if (!character) {
      return;
    }
    let max1 = { col: 1, row: 1 };
    let min1 = { col: gameMap.colCount - 2, row: gameMap.rowCount - 2 };
    character.target = new Position({ col, row }).max(max1).min(min1);
  }

  let tdStyle = {
    width: `${renderProps.cellSize}px`,
    height: `${renderProps.cellSize}px`,
    backgroundColor: "none",
    backgroundImage: "none",
  };

  function getRenderDataArray(): Array<Array<IRenderData>> {
    let renderTileArray: Array<Array<IRenderData>> = [];
    for (let row = 0; row < renderProps.renderRowCount; row++) {
      renderTileArray[row] = new Array<IRenderData>();
      for (let col = 0; col < renderProps.renderColCount; col++) {
        let mapCol = col + renderCol;
        let mapRow = row + renderRow;
        let position = {
          col: mapCol,
          row: mapRow,
        };
        renderTileArray[row][col] = {
          ...position,
          tile: gameMap.getTile(position),
        };
      }
    }
    return renderTileArray;
  }

  function renderTd(renderData: IRenderData) {
    let tile = renderData.tile as Tile;
    if (!tile) {
      return <td key="null"></td>;
    }
    let key = `${renderData.col}-${renderData.row}`;
    let style = { ...tdStyle };
    let tdContent: Array<ReactNode> = [];
    tile.bgColor && (style.backgroundColor = tile.bgColor);
    tile.bgImage && (style.backgroundImage = `url("${tile.bgImage}")`);

    if (tile.item) {
      const style = {
        zIndex: tile.item.inFront ? 3 : 1,
      };
      const SVG = tile.item.frameDef.svg;
      tdContent.push(<SVG key="itemSVG" className="itemSVG" style={style} />);
    }

    for (let i = 0; i < game.characterCount; i++) {
      const character = game.getCharacter(i);
      if (character) {
        let isPrev = character.prevPosition.equals(renderData);
        if (character.position.equals(renderData) || isPrev) {
          tdContent.push(
            <CharacterDisplay
              character={character}
              col={renderData.col}
              row={renderData.row}
              key={`character-${character.id}-${key}`}
            />
          );
        }
        if (character.target && character.target.equals(renderData)) {
          let className = "targetSVG";
          if (character.target.equals(character.position)) {
            className += " fade-out";
          }
          tdContent.push(
            <LocationIcon key="targetSVG" className={className} />
          );
        }
      }
    }
    if (tile.fgImage) {
      tdContent.push(
        <img key="fgImage" className="fgImage" src={tile.fgImage} />
      );
    }
    tdContent.push(key); //DEBUG
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
  function renderTr(rowDataArray: Array<IRenderData>) {
    let rowKey = 0;
    let rowContent = rowDataArray.map((renderData, index) => {
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
