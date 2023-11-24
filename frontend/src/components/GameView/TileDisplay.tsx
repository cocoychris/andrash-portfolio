import { GridChildComponentProps } from "react-window";
import React, { ReactNode } from "react";
import Game from "../../lib/Game";
import Character from "../../lib/Character";
import Player from "../../lib/Player";
import asset from "../../assets/gameDef/asset";
import CharacterDisplay from "./CharacterDisplay";
import { ReactComponent as LocationIcon } from "../../assets/icons/location-svgrepo-com.svg";
import { IDidSetUpdateEvent } from "../../lib/DataHolder";
import AnyEvent from "../../lib/events/AnyEvent";

export interface ITileDisplayProps extends GridChildComponentProps {
  game: Game;
}

const DEFAULT_CLASS_NAME = "tile";

export default class TileDisplay extends React.Component<ITileDisplayProps> {
  private _game: Game;
  private _mainPlayer: Player;
  private _mainCharacter: Character;

  constructor(props: ITileDisplayProps) {
    super(props);
    const { game } = props;
    this._game = game;
    this._mainPlayer = game.playerGroup.mainPlayer as Player;
    this._mainCharacter = this._mainPlayer.character;
    this._onGameUpdate = this._onGameUpdate.bind(this);
  }

  public componentDidMount(): void {
    this._game.on<IDidSetUpdateEvent>("didSetUpdate", this._onGameUpdate);
  }

  private _onGameUpdate(event: AnyEvent<IDidSetUpdateEvent>) {
    if (!event.data.changes.isChanged) {
      return;
    }
    this.forceUpdate();
  }
  public render() {
    const { columnIndex: col, rowIndex: row, style: _style } = this.props;
    let style = { ..._style };
    const tile = this._game.map.getTile({ col, row });
    let debugDiv = <div key="debug" className="debug">{`${col},${row}`}</div>;
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
          key={`character-${character.id}@${character.position}`}
        />
      );
    });

    // Render Target
    if (this._mainPlayer.stagedTarget?.equals({ col, row })) {
      let className = "targetSVG";
      if (this._mainPlayer.stagedTarget.equals(this._mainCharacter.position)) {
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
