import { GridChildComponentProps } from "react-window";
import React, { ReactNode } from "react";
import Game from "../../lib/Game";
import Player from "../../lib/Player";
import asset from "../../assets/gameDef/asset";
import CharacterDisplay from "./CharacterDisplay";
import { ReactComponent as LocationIcon } from "../../assets/icons/location-svgrepo-com.svg";

export interface ITileDisplayProps extends GridChildComponentProps {
  game: Game;
}

const DEFAULT_CLASS_NAME = "tile";

export default class TileDisplay extends React.Component<ITileDisplayProps> {
  private _game: Game;

  constructor(props: ITileDisplayProps) {
    super(props);
    const { game } = props;
    this._game = game;
  }

  public render() {
    const { columnIndex: col, rowIndex: row, style: _style } = this.props;
    let style = { ..._style };
    let debugDiv = <div key="debug" className="debug">{`${col},${row}`}</div>;
    const tile = this._game.map.getTile({ col, row });
    // Render Empty Cell
    if (!tile) {
      return (
        <div className={DEFAULT_CLASS_NAME} style={style}>
          {debugDiv}
        </div>
      );
    }
    let { items, characters, prevCharacters } = tile;
    // Render Tile Background
    let content: Array<ReactNode> = [];
    tile.bgColor && (style.backgroundColor = tile.bgColor);
    tile.bgImageID &&
      (style.backgroundImage = `url("${asset.image(tile.bgImageID)}")`);
    // Render Items
    items.forEach((item) => {
      const style = {
        zIndex: item.inFront ? 3 : 1,
      };
      const SVG = asset.svg(item.frameDef.svgID);
      content.push(<SVG key="itemSVG" className="itemSVG" style={style} />);
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
    let mainPlayer = this._game.playerGroup.mainPlayer as Player;
    let mainCharacter = mainPlayer.character;
    if (mainPlayer.stagedTarget?.equals({ col, row })) {
      let className = "targetSVG";
      if (mainPlayer.stagedTarget.equals(mainCharacter.position)) {
        className += " fade-out";
      }
      content.push(<LocationIcon key="targetSVG" className={className} />);
    }
    // Render Tile Foreground
    if (tile.fgImageID) {
      content.push(
        <img
          key="fgImage"
          className="fgImage"
          src={asset.image(tile.fgImageID)}
        />
      );
    }

    content.push(debugDiv);

    return (
      <div className={DEFAULT_CLASS_NAME} style={style}>
        {content}
      </div>
    );
  }
}
