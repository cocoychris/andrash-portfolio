import { ReactNode, useState } from "react";
import Alert from "./components/Alert";
import GameView from "./components/GameView";
import Navbar from "./layouts/Navbar";
import mapData from "./data/mapData";
import Game, { IGameData } from "./lib/Game";
import GameMap from "./lib/GameMap";
import "./App.css";
import tileDefGroup from "./data/tiles";
import { ICharacterDef, ITileDef } from "./lib/IDefinition";
import charaterDefGroup from "./data/characters";
import itemDefGroup from "./data/items";

let gameData: IGameData = {
  tileDefGroup,
  charaterDefGroup,
  itemDefGroup,
  mapData,
};
const game: Game = new Game(gameData);
const UPDATE_DELAY_MS = 600;

let init = function () {
  setInterval(() => {
    game.update();
  }, UPDATE_DELAY_MS);
};
init();

function App() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertContent, setAlertContent] = useState<ReactNode>(<>HI</>);
  function renderAlert() {
    return (
      alertVisible && (
        <Alert
          onClose={() => {
            setAlertVisible(false);
          }}
        >
          {alertContent}
        </Alert>
      )
    );
  }
  function alert(content: ReactNode) {
    setAlertContent(content);
    setAlertVisible(true);
  }

  return (
    <>
      {renderAlert()}
      <Navbar />
      <div className="content">
        <GameView game={game} />
      </div>
    </>
  );
}
export default App;
