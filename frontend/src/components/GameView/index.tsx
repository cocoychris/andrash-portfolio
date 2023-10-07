import { ReactNode, useRef, useEffect, useState } from "react";
import { Easing, Tween, update } from "@tweenjs/tween.js";
import CharacterDisplay from "./CharacterDisplay";
import { IPosition } from "../../lib/Position";
import Game from "../../lib/Game";
import "./index.css";
import Position from "../../lib/Position";
import { ReactComponent as LocationIcon } from "../../assets/icons/location-svgrepo-com.svg";
import Tile from "../../lib/Tile";
import Character from "../../lib/Character";
import DataHolderEvent from "../../lib/events/DataHolderEvent";
import Item from "../../lib/Item";

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

export interface IRenderData {
  position: IPosition;
  tile: Tile | null;
  characterList: Array<Character>;
  itemList: Array<Item>;
}

interface Props {
  game: Game;
}

export default function GameView({ game }: Props) {
  const { map, characterGroup, itemGroup } = game;
  const divRef = useRef<HTMLDivElement>(null);
  const [winHeight, setWinHeight] = useState(window.innerHeight);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [renderRow, setRenderRow] = useState<number>(0);
  const [renderCol, setRenderCol] = useState<number>(0);
  const [timeStamp, setTimeStamp] = useState<number>(0);
  const [playerTarget, setPlayerTarget] = useState<Position | null>(null);

  let playerCharacter: Character = characterGroup.get(0) as Character;
  if (!playerCharacter) {
    console.warn(`character (index = 0) not found.`);
    return;
  }

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
    function onGameUpdate() {
      forceRerender();
      scrollTo(playerCharacter);
    }
    game.addEventListener(DataHolderEvent.DID_SET_UPDATE, onGameUpdate);

    return () => {
      console.log("GameView unmount");
      game.removeEventListener(DataHolderEvent.DID_SET_UPDATE, onGameUpdate);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      updateDivScroll();
    });
  });

  useEffect(() => {
    let character = characterGroup.get(0);
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
    renderProps.maxRenderX = map.colCount - renderProps.renderColCount + 1;
    renderProps.maxRenderY = map.rowCount - renderProps.renderRowCount + 1;
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

  function onCellClick(position: IPosition) {
    console.log("onCellClick", position);
    let max1 = { col: 1, row: 1 };
    let min1 = { col: map.colCount - 2, row: map.rowCount - 2 };
    playerCharacter.target = new Position(position).max(max1).min(min1);
    setPlayerTarget(playerCharacter.target);
  }

  let tdStyle = {
    width: `${renderProps.cellSize}px`,
    height: `${renderProps.cellSize}px`,
    backgroundColor: "none",
    backgroundImage: "none",
  };

  function getRenderDataArray(): Array<Array<IRenderData>> {
    let renderData2DArray: Array<Array<IRenderData>> = [];
    for (let row = 0; row < renderProps.renderRowCount; row++) {
      renderData2DArray[row] = new Array<IRenderData>();
      for (let col = 0; col < renderProps.renderColCount; col++) {
        let mapCol = col + renderCol;
        let mapRow = row + renderRow;
        let position = {
          col: mapCol,
          row: mapRow,
        };
        renderData2DArray[row][col] = {
          position,
          tile: map.getTile(position),
          characterList: characterGroup.listAt(position),
          itemList: itemGroup.listAt(position),
        };
      }
    }
    return renderData2DArray;
  }

  function renderTd(renderData: IRenderData) {
    let { position, tile, itemList, characterList } = renderData;
    // Render Empty Cell
    if (!tile) {
      return <td key="null"></td>;
    }
    // Render Tile Background
    let key = `${new Position(position).toString()}`;
    let style = { ...tdStyle };
    let tdContent: Array<ReactNode> = [];
    tile.bgColor && (style.backgroundColor = tile.bgColor);
    tile.bgImage && (style.backgroundImage = `url("${tile.bgImage}")`);
    // Render Items
    itemList.forEach((item) => {
      const style = {
        zIndex: item.inFront ? 3 : 1,
      };
      const SVG = item.frameDef.svg;
      tdContent.push(<SVG key="itemSVG" className="itemSVG" style={style} />);
    });
    // Render Characters
    characterList.forEach((character) => {
      tdContent.push(
        <CharacterDisplay
          character={character}
          col={position.col}
          row={position.row}
          key={`character-${character.id}-${key}`}
        />
      );
    });
    if (playerTarget?.equals(position)) {
      let className = "targetSVG";
      if (playerTarget?.equals(playerCharacter.position)) {
        className += " fade-out";
      }
      tdContent.push(<LocationIcon key="targetSVG" className={className} />);
    }
    // Render Tile Foreground
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
          onCellClick(position);
        }}
      >
        {tdContent}
      </td>
    );
  }
  function renderTr(rowDataArray: Array<IRenderData>) {
    let rowKey = 0;
    let rowContent = rowDataArray.map((renderData, index) => {
      index == 0 && (rowKey = renderData.position.row);
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
