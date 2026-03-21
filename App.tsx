import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import {
  canDrawCard,
  canPlaySelectedCard,
  createGameState,
  drawCard as drawGameCard,
  finishTurn as finishGameTurn,
  getCurrentPlayer,
  placeCardInProtection,
  playSelectedCard,
  selectCard,
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

  const handleSelectCard = (cardId: string) => {
    setGameState((currentState) =>
      currentState ? selectCard(currentState, cardId) : currentState,
    );
  };

  const handlePlayCard = () => {
    setGameState((currentState) =>
      currentState ? playSelectedCard(currentState) : currentState,
    );
  };

  const handleDropProtection = (cardId: string, slotIndex: number) => {
    setGameState((currentState) =>
      currentState
        ? placeCardInProtection(currentState, cardId, slotIndex)
        : currentState,
    );
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
  const notificationMessages = [
    ...splitNotificationText(gameState.lastActionText),
    ...currentPlayer.notices,
  ];

  return (
    <>
      <StatusBar style="light" />
      <GameScreen
        playerCount={gameState.players.length}
        currentPlayer={currentPlayer.id}
        cardsLeft={gameState.drawPile.length}
        colonyCount={gameState.colonyCount}
        currentHand={currentPlayer.hand}
        protections={currentPlayer.protections}
        awawas={currentPlayer.awawas}
        selectedCardId={gameState.selectedCardId}
        canDraw={canDrawCard(gameState)}
        canPlay={canPlaySelectedCard(gameState)}
        gameOver={gameOver}
        notificationMessages={notificationMessages}
        resultText={gameState.resultText}
        onDrawCard={drawCard}
        onFinishTurn={finishTurn}
        onRestart={restartGame}
        onSelectCard={handleSelectCard}
        onPlayCard={handlePlayCard}
        onDropProtection={handleDropProtection}
      />
    </>
  );
}

function splitNotificationText(text: string | null) {
  if (!text) {
    return [];
  }

  return text
    .split(/(?<=[.!?])\s+/)
    .map((message) => message.trim())
    .filter(Boolean);
}
