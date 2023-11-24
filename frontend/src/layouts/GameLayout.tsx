import { ReactNode, useEffect, useState } from "react";
import GameClient, { IDidNewGameEvent } from "../lib/GameClient";
import Game from "../lib/Game";
import AnyEvent from "../lib/events/AnyEvent";
import GameView from "../components/GameView";

interface props {
  gameClient: GameClient;
}

export default function GameLayout({ gameClient }: props) {
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    let onNewGame = (event: AnyEvent<IDidNewGameEvent>) => {
      console.log("GameLayout onNewGame");
      setGame(gameClient.game);
    };
    gameClient.on<IDidNewGameEvent>("didNewGame", onNewGame);

    return () => {
      gameClient.off<IDidNewGameEvent>("didNewGame", onNewGame);
    };
  }, []);

  return (
    <div className="gameLayout">
      {game && !game.isDestroyed && <GameView game={game} />}
    </div>
  );
}
