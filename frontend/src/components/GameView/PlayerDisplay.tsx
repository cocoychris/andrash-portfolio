import { useEffect, useRef, useState } from "react";
import { ReactComponent as PersonIcon } from "../../assets/icons/person-svgrepo-com.svg";
import Player from "../../lib/Player";

interface Props {
  player: Player;
  col: number;
  row: number;
}

const DEFAULT_CLASS_NAME = "playerDiv";

export default function PlayerDisplay(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const iconStyle = { fill: "#ffffff" };
  const [className, setClassName] = useState(
    `${DEFAULT_CLASS_NAME} ${getStartPositionName(props)}`
  );

  useEffect(() => {
    setTimeout(() => {
      let player = props.player;
      let isCurrent = player.position.equals(props);
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
  return (
    <div ref={ref} className={className}>
      <PersonIcon key="personIcon" className="playerIcon" style={iconStyle} />
    </div>
  );
}

function getStartPositionName(props: Props) {
  let player: Player = props.player;
  let isCurrent = player.position.equals(props);
  let movement = player.movement;
  let suffixList = [];
  if (isCurrent && player.isMoving) {
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
  let player: Player = props.player;
  let isCurrent = player.position.equals(props);
  let movement = player.movement;
  let suffixList = [];
  if (!isCurrent && player.isMoving) {
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
