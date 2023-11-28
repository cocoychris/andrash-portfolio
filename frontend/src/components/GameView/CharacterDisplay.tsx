import React, { useEffect, useRef, useState, FunctionComponent } from "react";
import Character, { IMoveEvent } from "../../lib/Character";
import ASSET_MAP from "../../assets/gameDef/asset";
import { IPosition } from "../../lib/Position";
import AnyEvent from "../../lib/events/AnyEvent";
import { ICharacterFrameDef } from "../../lib/IDefinition";

interface IProps {
  character: Character;
  position: IPosition;
}
interface IState {
  className: string;
  frameDef: ICharacterFrameDef;
}

const DEFAULT_CLASS_NAME = "CharacterDiv";
const TRANSITION_DELAY = 16;

export default class CharacterDisplay extends React.Component<IProps, IState> {
  private _ref = React.createRef<HTMLDivElement>();
  private _character: Character;
  private _position: IPosition;
  private _timeoutID: NodeJS.Timeout | null = null;

  constructor(props: IProps) {
    super(props);
    this._character = this.props.character;
    this._position = this.props.position;
    this.state = {
      className: `${DEFAULT_CLASS_NAME} ${this._getStartPositionName()}`,
      frameDef: this._character.frameDef,
    };
  }

  public componentDidMount(): void {
    let isCurrent = this._character.position.equals(this._position);
    this._timeoutID = setTimeout(() => {
      if (isCurrent) {
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
    let color = this._character.color;
    let stroke = "none";
    if (this._character.hitCharacter()) {
      color = "#ff0000";
      stroke = "#ffffff";
    }
    if (this._character.hitItem()) {
      color = "#00ff00";
      stroke = "#ffffff";
    }
    const SVG = ASSET_MAP.svg(this._character.frameDef.svgID);
    let id =
      "character" + this._character.id + "-" + this._character.frameDef.svgID;
    return (
      <div ref={this._ref} className={this.state.className}>
        <SVG
          id={id}
          className="CharacterIcon"
          style={{
            transform: `scaleX(${this._character.facingDir})`,
            fill: color,
            stroke: stroke,
          }}
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
