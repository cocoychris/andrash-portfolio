import { ReactNode, useState } from "react";
import Alert from "./components/Alert";
import GameView from "./components/GameView";
import Navbar from "./layouts/Navbar";
import "./App.css";

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
        <GameView />
      </div>
    </>
  );
}
export default App;
