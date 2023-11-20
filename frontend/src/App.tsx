import Popup from "./components/Popup";
import GameView from "./components/GameView";
import Navbar from "./components/Navbar";
import "./App.css";
import useOperator from "./hooks/useOperator";

function App() {
  const { popupOptions, game, navbarData } = useOperator();

  return (
    <>
      {popupOptions && <Popup options={popupOptions} />}
      {navbarData && <Navbar data={navbarData} />}
      <div className="gameArea">
        {game && !game.isDestroyed && <GameView game={game} />}
      </div>
      {/* <div className="mdReader">Hello World</div> */}
    </>
  );
}
export default App;
