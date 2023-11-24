import React, { useEffect, useRef, useState, FunctionComponent } from "react";
import Character, { IFrameUpdateEvent, IMoveEvent } from "../../lib/Character";
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
    // this._onCharacterMove = this._onCharacterMove.bind(this);
  }

  public componentDidMount(): void {
    // console.log("Mount", this._position);
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
    // this._character.once<IMoveEvent>("move", this._onCharacterMove);
  }

  public componentWillUnmount(): void {
    // console.log("Unmount", this._position);
    // this._character.off<IMoveEvent>("move", this._onCharacterMove);
    if (this._timeoutID) {
      clearTimeout(this._timeoutID);
      this._timeoutID = null;
    }
  }

  // private _onCharacterMove(event: AnyEvent<IMoveEvent>) {
  //   console.log("onCharacterMove", this._position);
  //   this._timeoutID = setTimeout(() => {
  //     this.setState({
  //       className: `${DEFAULT_CLASS_NAME} ${this._getEndPositionName()}`,
  //     });
  //     this._timeoutID = null;
  //   }, TRANSITION_DELAY);
  // }

  public render() {
    const iconStyle = { fill: this._character.color || "#ffffff" };
    if (this._character.hitCharacter()) {
      iconStyle.fill = "#ff0000";
    }
    if (this._character.hitItem()) {
      iconStyle.fill = "#00ff00";
    }
    const SVG = ASSET_MAP.svg(this._character.frameDef.svgID);
    return (
      <div ref={this._ref} className={this.state.className}>
        <SVG key="CharacterIcon" className="CharacterIcon" style={iconStyle} />
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
