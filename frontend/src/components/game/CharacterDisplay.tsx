import React from "react";
import Character from "../../lib/Character";
import { IPosition } from "../../lib/Position";
import { ISpriteFrameDef } from "../../lib/data/DefPack";
import tinycolor from "tinycolor2";
import SVGDisplay from "./SVGDisplay";

interface IProps {
  character: Character;
  position: IPosition;
}
interface IState {
  className: string;
  frameDef: ISpriteFrameDef;
}

const DEFAULT_CLASS_NAME = "characterDiv";
const TRANSITION_DELAY = 16;

export default class CharacterDisplay extends React.Component<IProps, IState> {
  private _ref = React.createRef<HTMLDivElement>();
  private _character: Character;
  private _position: IPosition;
  private _timeoutID: NodeJS.Timeout | null = null;
  private _isCurrent: boolean;

  constructor(props: IProps) {
    super(props);
    this._character = this.props.character;
    this._position = this.props.position;
    this._isCurrent = this._character.position.equals(this._position);
    this.state = {
      className: `${DEFAULT_CLASS_NAME} ${this._getStartPositionName()}`,
      frameDef: this._character.frameDef,
    };
  }

  public componentDidMount(): void {
    this._timeoutID = setTimeout(() => {
      if (this._isCurrent) {
        this.setState({ className: `${DEFAULT_CLASS_NAME} position-center` });
      } else {
        this.setState({
          className: `${DEFAULT_CLASS_NAME} ${this._getEndPositionName()}`,
        });
      }
      this._timeoutID = null;
    }, TRANSITION_DELAY);
  }

  public componentWillUnmount(): void {
    if (this._timeoutID) {
      clearTimeout(this._timeoutID);
      this._timeoutID = null;
    }
  }

  public render() {
    let svgStyle: React.CSSProperties = {
      fill: this._character.color,
      stroke: "none",
    };
    let classList = [this.state.className];
    if (!this._character.isEnabled) {
      classList.push("disabled");
      svgStyle.fill = Character.DEFAULT_COLOR;
    }
    if (this._character.isSelected) {
      classList.push("selected");
      svgStyle.stroke = "#ffffff";
      svgStyle.strokeWidth = "4px";
    }
    if (this._character.hitCharacter()) {
      classList.push("hitCharacter");
      svgStyle.fill = tinycolor(this._character.color).brighten(30).toString();
      svgStyle.stroke = "#ffffff";
      svgStyle.strokeWidth = "4px";
    }
    if (this._character.hitItem()) {
      classList.push("hitItem");
      svgStyle.fill = tinycolor(this._character.color).brighten(30).toString();
      svgStyle.stroke = "#ffffff";
      svgStyle.strokeWidth = "4px";
    }
    if (this._character.facingDir == -1) {
      classList.push("flip");
    }

    let id =
      "character" + this._character.id + "-" + this._character.frameDef.svgName;
    return (
      <div id={id} className={classList.join(" ")} ref={this._ref}>
        <SVGDisplay
          assetPack={this._character.group.game.assetPack}
          svgName={this._character.frameDef.svgName}
          svgStyle={svgStyle}
        />
      </div>
    );
  }

  private _getStartPositionName() {
    let character: Character = this._character;
    let isCurrent = character.position.equals(this._position);
    let movement = character.movement;
    let suffixList = [];
    if (isCurrent && character.isMoving) {
      if (movement.col > 0) {
        suffixList.push("left");
      } else if (movement.col < 0) {
        suffixList.push("right");
      }
      if (movement.row > 0) {
        suffixList.push("up");
      } else if (movement.row < 0) {
        suffixList.push("down");
      }
    }
    suffixList.length == 0 && suffixList.push("center");
    return `position-${suffixList.join("-")}`;
  }
  private _getEndPositionName() {
    let character: Character = this._character;
    let isCurrent = character.position.equals(this._position);
    let movement = character.movement;
    let suffixList = [];
    if (!isCurrent && character.isMoving) {
      if (movement.col > 0) {
        suffixList.push("right");
      } else if (movement.col < 0) {
        suffixList.push("left");
      }
      if (movement.row > 0) {
        suffixList.push("down");
      } else if (movement.row < 0) {
        suffixList.push("up");
      }
    }
    suffixList.length == 0 && suffixList.push("center");
    return `position-${suffixList.join("-")}`;
  }
}
