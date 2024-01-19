import SVGDisplay from "./SVGDisplay";
import React, { CSSProperties, ReactNode } from "react";
import Game from "../../lib/Game";
import Player from "../../lib/Player";
import CharacterDisplay from "./CharacterDisplay";
import Tile from "../../lib/Tile";
import TileManager from "../../lib/TileManager";
import { SYS_OBJ_KEY } from "../../lib/data/SysObjDefPack";
import Item from "../../lib/Item";
import { IGridCellProps } from "./TileGrid";

export interface IChildProps extends IGridCellProps {
  style: React.CSSProperties;
  columnIndex: number;
  rowIndex: number;
  game: Game;
  cellSize: number;
}

interface IStandaloneProps {
  tile: Tile;
  style: React.CSSProperties;
}

export type ITileDisplayProps = IChildProps | IStandaloneProps;

const DEFAULT_CLASS_NAME = "tile";
const Z_INDEX_SYS_OBJ_BACK = 0;
const Z_INDEX_ITEM_BACK = 1;
const Z_INDEX_CHARACTER = 2;
const Z_INDEX_ITEM_FRONT = 3;
const Z_INDEX_FOREGROUND = 4;
const Z_INDEX_SYS_OBJ_FRONT = 5;
const Z_INDEX_DEBUG_UI = 6;

export default class TileDisplay extends React.Component<ITileDisplayProps> {
  public static readonly Z_INDEX_CHARACTER = Z_INDEX_CHARACTER;
  constructor(props: ITileDisplayProps) {
    super(props);
  }

  public render() {
    const gridChildProps = this.props as IChildProps;
    const standaloneProps = this.props as IStandaloneProps;
    const isStandalone = !gridChildProps.game;
    const col =
      gridChildProps.columnIndex == undefined ? -1 : gridChildProps.columnIndex;
    const row =
      gridChildProps.rowIndex == undefined ? -1 : gridChildProps.rowIndex;
    const tileStyle = { ...this.props.style };
    const game: Game = isStandalone
      ? standaloneProps.tile.manager.game
      : gridChildProps.game;
    const tileManager: TileManager = isStandalone
      ? standaloneProps.tile.manager
      : game.tileManager;
    const tile = isStandalone
      ? standaloneProps.tile
      : tileManager.getTile({ col, row });
    // console.log("TileDisplay.render()", col, row);

    let classNameList = [DEFAULT_CLASS_NAME];
    // Render Debug UI
    let debugDiv = (
      <div
        key="debug"
        className="debug"
        style={{ zIndex: row * 10 + Z_INDEX_DEBUG_UI }}
      >{`${col},${row}`}</div>
    );
    // Render Empty Cell
    if (!tile) {
      classNameList.push("empty");
      return (
        <div className={classNameList.join(" ")} style={tileStyle}>
          {debugDiv}
        </div>
      );
    }
    // Set Tile Class Names
    if (tileManager) {
      if (col == 0) {
        classNameList.push("left");
      } else if (col == tileManager.colCount - 1) {
        classNameList.push("right");
      }
      if (row == 0) {
        classNameList.push("top");
      } else if (row == tileManager.rowCount - 1) {
        classNameList.push("bottom");
      }
    }
    let { items, characters, prevCharacters } = tile;
    // Render Tile Background
    if (tile.bgColor) {
      tileStyle.backgroundColor = tile.bgColor;
    }
    if (tile.bgImageName) {
      tileStyle.backgroundImage = `url("${game.assetPack.getImageURL(
        tile.bgImageName
      )}")`;
    }
    if (tile.isSelected) {
      classNameList.push("selected");
    }
    let content: Array<ReactNode> = [];
    // Render Display text
    if (!isStandalone) {
      content.push(
        <TextDisplay key="text" tile={tile} gridChildProps={gridChildProps} />
      );
    }

    // Render Items
    items.forEach((item) => {
      content.push(
        <ItemDisplay key={item.id} item={item} game={game} row={row} />
      );
    });
    // Render Characters
    [...characters, ...prevCharacters].forEach((character) => {
      content.push(
        <CharacterDisplay
          character={character}
          position={{ col, row }}
          onEaseOut={() => {
            this.forceUpdate();
          }}
          key={`character-${character.id}${
            character.position.equals({ col, row }) ? "" : "-prev"
          }`}
        />
      );
    });
    // Render Tile Foreground
    if (tile.fgSVGName) {
      content.push(
        <SVGDisplay
          key="fgSVGName"
          divClassName="foreground"
          assetPack={game.assetPack}
          svgName={tile.fgSVGName}
          divStyle={{
            zIndex: row * 10 + Z_INDEX_FOREGROUND,
          }}
        />
      );
    }
    // Render Target Beacon
    let mainPlayer = game.playerGroup.mainPlayer as Player;
    if (mainPlayer) {
      let mainCharacter = mainPlayer.character;
      if (mainPlayer.stagedTarget?.equals({ col, row })) {
        let className = SYS_OBJ_KEY.TARGET_BEACON;
        if (mainPlayer.stagedTarget.equals(mainCharacter.position)) {
          className += " fade-out";
        }
        content.push(
          <SVGDisplay
            key={SYS_OBJ_KEY.TARGET_BEACON}
            divClassName={className}
            assetPack={game.assetPack}
            svgName={
              game.assetPack.sysObjDefPack.get(SYS_OBJ_KEY.TARGET_BEACON)
                .svgName
            }
            divStyle={{
              zIndex: row * 10 + Z_INDEX_SYS_OBJ_FRONT,
            }}
          />
        );
      }
    }
    content.push(debugDiv);
    return (
      <div className={classNameList.join(" ")} style={tileStyle}>
        {content}
      </div>
    );
  }
}

function ItemDisplay(props: { item: Item; game: Game; row: number }) {
  const { item, game, row } = props;
  const classNameList = ["item"];
  if (item.inFront) {
    classNameList.push("inFront");
  }
  if (item.facingDir == -1) {
    classNameList.push("flip");
  }
  const zIndex =
    row * 10 + (item.inFront ? Z_INDEX_ITEM_FRONT : Z_INDEX_ITEM_BACK);
  if (item.frameDef.imageName) {
    return (
      <div
        className={classNameList.join(" ")}
        style={{
          zIndex,
        }}
      >
        <img
          src={game.assetPack.getImageURL(item.frameDef.imageName)}
          alt={item.frameDef.imageName}
          draggable={false}
        />
      </div>
    );
  }
  if (item.frameDef.svgName) {
    return (
      <SVGDisplay
        divClassName={classNameList.join(" ")}
        assetPack={game.assetPack}
        svgName={item.frameDef.svgName}
        divStyle={{
          zIndex,
        }}
      />
    );
  }
  return null;
}

function TextDisplay(props: { tile: Tile; gridChildProps: IChildProps }) {
  const { tile, gridChildProps } = props;
  if (!tile.displayText.text) {
    return null;
  }
  const baseSize = gridChildProps.cellSize / 100;
  let divStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
  };
  if (tile.displayText.verticalAlign) {
    divStyle.justifyContent = tile.displayText.verticalAlign;
  }
  let spanStyle: CSSProperties = {
    color: tile.displayText.color,
    fontWeight: tile.displayText.fontWeight,
    fontFamily: tile.displayText.fontFamily,
    textAlign: tile.displayText.textAlign,
  };
  if (tile.displayText.fontSize) {
    spanStyle.fontSize = `${tile.displayText.fontSize * baseSize}px`;
  }
  if (tile.displayText.lineHeight) {
    spanStyle.lineHeight = `${tile.displayText.lineHeight * baseSize}px`;
  }
  if (tile.displayText.letterSpacing) {
    spanStyle.letterSpacing = `${tile.displayText.letterSpacing * baseSize}px`;
  }
  if (tile.displayText.shadowColor) {
    let blur = (tile.displayText.shadowBlur || 5) * baseSize;
    spanStyle.textShadow = `${tile.displayText.shadowColor} 0 0 ${blur}px`;
  }
  if (tile.displayText.marginTop) {
    spanStyle.marginTop = `${tile.displayText.marginTop * baseSize}px`;
  }
  if (tile.displayText.marginBottom) {
    spanStyle.marginBottom = `${tile.displayText.marginBottom * baseSize}px`;
  }
  if (tile.displayText.marginLeft) {
    spanStyle.marginLeft = `${tile.displayText.marginLeft * baseSize}px`;
  }
  if (tile.displayText.marginRight) {
    spanStyle.marginRight = `${tile.displayText.marginRight * baseSize}px`;
  }
  let lines = tile.displayText.text.split("<br/>");
  let elements: Array<ReactNode> = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (i > 0) {
      elements.push(<br key={`br-${i}`} />);
    }
    elements.push(line);
  }
  return (
    <div className="displayText" style={divStyle}>
      <span style={spanStyle}>{elements}</span>
    </div>
  );
}
