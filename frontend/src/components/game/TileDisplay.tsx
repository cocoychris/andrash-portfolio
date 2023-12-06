import { GridChildComponentProps } from "react-window";
import React, { ReactNode } from "react";
import Game from "../../lib/Game";
import Player from "../../lib/Player";
import asset from "../../assets/gameDef/asset";
import CharacterDisplay from "./CharacterDisplay";
import { ReactComponent as LocationIcon } from "../../assets/icons/location-svgrepo-com.svg";
import Tile from "../../lib/Tile";
import GameMap from "../../lib/GameMap";

interface IProps1 extends GridChildComponentProps {
  game: Game;
}

interface IProps2 {
  tile: Tile;
  style: React.CSSProperties;
}

export type ITileDisplayProps = IProps1 | IProps2;

const DEFAULT_CLASS_NAME = "tile";

export default class TileDisplay extends React.Component<ITileDisplayProps> {
  constructor(props: ITileDisplayProps) {
    super(props);
  }

  public render() {
    const props1 = this.props as IProps1;
    const props2 = this.props as IProps2;
    // const { columnIndex: col, rowIndex: row, tileStyle: _style } = props1;
    const col = props1.columnIndex == undefined ? -1 : props1.columnIndex;
    const row = props1.rowIndex == undefined ? -1 : props1.rowIndex;
    const tileStyle = { ...this.props.style };
    const game: Game | null = props1.game || null;
    const map: GameMap | null = game?.map || null;
    const tile = props2.tile || map?.getTile({ col, row });
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
    if (map) {
      if (col == 0) {
        classNameList.push("left");
      } else if (col == map.colCount - 1) {
        classNameList.push("right");
      }
      if (row == 0) {
        classNameList.push("top");
      } else if (row == map.rowCount - 1) {
        classNameList.push("bottom");
      }
    }
    let { items, characters, prevCharacters } = tile;
    // Render Tile Background
    let content: Array<ReactNode> = [];
    if (tile.bgColor) {
      tileStyle.backgroundColor = tile.bgColor;
    }
    if (tile.bgImageID) {
      tileStyle.backgroundImage = `url("${asset.image(tile.bgImageID)}")`;
    }
    if (tile.isSelected) {
      classNameList.push("selected");
    }
    // Render Items
    items.forEach((item) => {
      const itemSVGStyle = {
        transform: `scaleX(${item.facingDir})`,
        zIndex: item.inFront ? 3 : 1,
      };
      const SVG = asset.svg(item.frameDef.svgID);
      content.push(
        <SVG key={item.id} className="itemSVG" style={itemSVGStyle} />
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

    // Render Target
    let mainPlayer = game?.playerGroup.mainPlayer as Player;
    if (mainPlayer) {
      let mainCharacter = mainPlayer.character;
      if (mainPlayer.stagedTarget?.equals({ col, row })) {
        let className = "targetSVG";
        if (mainPlayer.stagedTarget.equals(mainCharacter.position)) {
          className += " fade-out";
        }
        content.push(<LocationIcon key="targetSVG" className={className} />);
      }
    }
    // Render Tile Foreground
    if (tile.fgImageID) {
      content.push(
        <img
          key="fgImage"
          className="fgImage"
          src={asset.image(tile.fgImageID)}
          draggable="false"
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
