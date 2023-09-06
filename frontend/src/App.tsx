import { useState } from "react";
import Alert from "./components/Alert";
import Button from "./components/Button";
import ListGroup from "./components/ListGroup";
import axios from "axios";

let items = ["apple", "orange", "banana", "pineapple"];

function handleSelectItem(item: string) {
  console.log(item);
}

function App() {
  const [alertVisible, setAlertVisible] = useState(false);
  return (
    <>
      <h1>Andrash Portfolio Project</h1>
      <img src="vite.svg" />
      React + TypeScript frontend structure created with Vite.
      <br />
      Backend API server built with Express.js + TypeScript.
      {alertVisible && (
        <Alert
          onClose={() => {
            setAlertVisible(false);
            //故意送出一個 DELETE 的 API 呼叫，以確保沒有 CORS 問題。如果呼叫成功，應看到 DELETE 文字出現在 console。
            axios.delete("/api/delete").then((res) => {
              console.log("DELETED!");
            });
          }}
        >
          <b>This</b> is a message UI test.
          <br />
          <a href="/api">CLICK ME TO CALL GET API</a>
          <br />
          You should see a "DELETED!" console log when you close this message.
          This is to test the DELETE API call to ensure that there is no CORS
          problem.
        </Alert>
      )}
      <br />
      <Button
        onClick={() => {
          setAlertVisible(true);
          console.log("Opened");
        }}
      >
        Click Me
      </Button>
    </>
  );
}

// function App() {
//   return (
//     <div>
//       <ListGroup
//         items={items}
//         heading="Fruits"
//         onSelectItem={handleSelectItem}
//       />
//     </div>
//   );
// }

export default App;
