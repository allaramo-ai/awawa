import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import {
  canDrawCard,
  createGameState,
  drawCard as drawGameCard,
  finishTurn as finishGameTurn,
  getCurrentPlayer,
} from './src/game/gameState';
import { GameState } from './src/game/types';
import { GameScreen } from './src/screens/GameScreen';
import { SetupScreen } from './src/screens/SetupScreen';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const startGame = (nextPlayerCount: number) => {
    setGameState(createGameState(nextPlayerCount));
  };

  const drawCard = () => {
    setGameState((currentState) =>
      currentState ? drawGameCard(currentState) : currentState,
    );
  };

  const finishTurn = () => {
    setGameState((currentState) =>
      currentState ? finishGameTurn(currentState) : currentState,
    );
  };

  const restartGame = () => {
    setGameState(null);
  };

  if (!gameState) {
    return (
      <>
        <StatusBar style="light" />
        <SetupScreen onStartGame={startGame} />
      </>
    );
  }

  const currentPlayer = getCurrentPlayer(gameState);
  const gameOver = gameState.status === 'game_over';

  return (
    <>
      <StatusBar style="light" />
      <GameScreen
        playerCount={gameState.players.length}
        currentPlayer={currentPlayer.id}
        cardsLeft={gameState.drawPile.length}
        currentHand={currentPlayer.hand}
        canDraw={canDrawCard(gameState)}
        gameOver={gameOver}
        onDrawCard={drawCard}
        onFinishTurn={finishTurn}
        onRestart={restartGame}
      />
    </>
  );
}
