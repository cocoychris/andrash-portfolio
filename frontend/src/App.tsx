import { ReactNode, useState } from "react";
import Alert from "./components/Alert";
import GameView from "./components/GameView";
import Navbar from "./layouts/Navbar";
import gameData from "./data/gameData";
import Game, { IGameData, IGameDef } from "./lib/Game";
import GameClient from "./lib/GameClient";
import "./App.css";
import tileDefGroup from "./data/tiles";
import { ICharacterDef, ITileDef } from "./lib/IDefinition";
import charaterDefGroup from "./data/characters";
import itemDefGroup from "./data/items";

let gameDef: IGameDef = {
  tileDefGroup,
  charaterDefGroup,
  itemDefGroup,
};

const gameClient = new GameClient("/");
const game: Game = gameClient.newGame(gameDef, gameData);

let init = function () {};
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
