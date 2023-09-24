import { useEffect, useRef, useState } from "react";
import Character from "../../lib/Character";

interface Props {
  character: Character;
  col: number;
  row: number;
}

const DEFAULT_CLASS_NAME = "CharacterDiv";

export default function CharacterDisplay(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const iconStyle = { fill: "#ffffff" };
  const [className, setClassName] = useState(
    `${DEFAULT_CLASS_NAME} ${getStartPositionName(props)}`
  );

  useEffect(() => {
    setTimeout(() => {
      let character = props.character;
      let isCurrent = character.position.equals(props);
      if (!ref.current) {
        return;
      }
      if (isCurrent) {
        setClassName(`${DEFAULT_CLASS_NAME} position-center`);
      } else {
        setClassName(`${DEFAULT_CLASS_NAME} ${getEndPositionName(props)}`);
      }
    }, 30);
  });
  let SVGImage = props.character.frameDef.svg;
  return (
    <div ref={ref} className={className}>
      <SVGImage key="personIcon" className="CharacterIcon" style={iconStyle} />
    </div>
  );
}

function getStartPositionName(props: Props) {
  let character: Character = props.character;
  let isCurrent = character.position.equals(props);
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
function getEndPositionName(props: Props) {
  let character: Character = props.character;
  let isCurrent = character.position.equals(props);
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
