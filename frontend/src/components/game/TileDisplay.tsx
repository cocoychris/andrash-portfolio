import SVGDisplay from "./SVGDisplay";
import { GridChildComponentProps } from "react-window";
import React, { ReactNode } from "react";
import Game from "../../lib/Game";
import Player from "../../lib/Player";
import CharacterDisplay from "./CharacterDisplay";
import Tile from "../../lib/Tile";
import TileManager from "../../lib/TileManager";
import { SYS_OBJ_KEY } from "../../lib/data/DefPack";

interface IGridChildProps extends GridChildComponentProps {
  game: Game;
}

interface IStandaloneProps {
  tile: Tile;
  style: React.CSSProperties;
}

export type ITileDisplayProps = IGridChildProps | IStandaloneProps;

const DEFAULT_CLASS_NAME = "tile";

export default class TileDisplay extends React.Component<ITileDisplayProps> {
  constructor(props: ITileDisplayProps) {
    super(props);
  }

  public render() {
    const gridChildProps = this.props as IGridChildProps;
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

    let classNameList = [DEFAULT_CLASS_NAME];
    let debugDiv = <div key="debug" className="debug">{`${col},${row}`}</div>;
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
    let content: Array<ReactNode> = [];
    if (tile.bgColor) {
      tileStyle.backgroundColor = tile.bgColor;
    }
    if (tile.bgSVGName) {
      tileStyle.backgroundImage = `url("${game.assetPack.getSVGURL(
        tile.bgSVGName
      )}")`;
    }
    if (tile.isSelected) {
      classNameList.push("selected");
    }
    // Render Items
    items.forEach((item) => {
      content.push(
        <SVGDisplay
          key={item.id}
          divClassName={`item${item.facingDir == -1 ? " flip" : ""}${
            item.inFront ? " inFront" : ""
          }`}
          assetPack={game.assetPack}
          svgName={item.frameDef.svgName}
        />
      );
    });
    // Render Characters
    [...characters, ...prevCharacters].forEach((character) => {
      content.push(
        <CharacterDisplay
          character={character}
          position={{ col, row }}
          key={`character-${character.id}${
            character.position.equals({ col, row }) ? "" : "-prev"
          }`}
        />
      );
    });

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
          />
        );
      }
    }
    // Render Tile Foreground
    if (tile.fgSVGName) {
      content.push(
        <SVGDisplay
          key="fgSVG"
          divClassName="foreground"
          assetPack={game.assetPack}
          svgName={tile.fgSVGName}
        />
      );
    }

    content.push(debugDiv);
    return (
      <div className={classNameList.join(" ")} style={tileStyle}>
        {content}
      </div>
    );
  }
}
