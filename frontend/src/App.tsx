import { ReactNode, useState } from "react";
import Alert from "./components/Alert";
import GameView from "./components/GameView";
import Navbar from "./layouts/Navbar";
import mapData from "./data/mapData";
import PlayerManager from "./lib/PlayerManager";
import GameMap from "./lib/GameMap";
import "./App.css";

const gameMap: GameMap = new GameMap(mapData);
const playerManager: PlayerManager = new PlayerManager(gameMap);
const UPDATE_DELAY_MS = 600;

let init = function () {
  setInterval(() => {
    playerManager.update();
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
        <GameView mapData={mapData} playerManager={playerManager} />
      </div>
    </>
  );
}
export default App;
