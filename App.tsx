import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import {
  canDrawCard,
  canPlaySelectedCard,
  createGameState,
  dismissCurrentNotification,
  drawCard as drawGameCard,
  finishTurn as finishGameTurn,
  getCurrentPlayer,
  placeCardInProtection,
  playSelectedCard,
  selectCard,
} from './src/game/gameState';
import { GameState } from './src/game/types';
import { GameScreen } from './src/screens/GameScreen';
import { HowToPlayScreen } from './src/screens/HowToPlayScreen';
import { SetupScreen } from './src/screens/SetupScreen';

export default function App() {
  const [setupScreen, setSetupScreen] = useState<'setup' | 'rules'>('setup');
  const [gameState, setGameState] = useState<GameState | null>(null);

  const startGame = (nextPlayerCount: number) => {
    setSetupScreen('setup');
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
    setSetupScreen('setup');
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

  const handleDismissNotification = () => {
    setGameState((currentState) =>
      currentState ? dismissCurrentNotification(currentState) : currentState,
    );
  };

  if (!gameState) {
    if (setupScreen === 'rules') {
      return (
        <>
          <StatusBar style="light" />
          <HowToPlayScreen onBack={() => setSetupScreen('setup')} />
        </>
      );
    }

    return (
      <>
        <StatusBar style="light" />
        <SetupScreen
          onStartGame={startGame}
          onShowHowToPlay={() => setSetupScreen('rules')}
        />
      </>
    );
  }

  const currentPlayer = getCurrentPlayer(gameState);
  const gameOver = gameState.status === 'game_over';
  const notificationMessages = currentPlayer.notices;

  return (
    <>
      <StatusBar style="light" />
      <GameScreen
        playerCount={gameState.players.length}
        currentPlayer={currentPlayer.id}
        playerBoards={gameState.players.map((player) => ({
          id: player.id,
          protections: player.protections,
          awawas: player.awawas,
        }))}
        cardsLeft={gameState.drawPile.length}
        colonyCount={gameState.colonyCount}
        currentHand={currentPlayer.hand}
        selectedCardId={gameState.selectedCardId}
        canDraw={canDrawCard(gameState)}
        canPlay={canPlaySelectedCard(gameState)}
        gameOver={gameOver}
        notificationMessages={notificationMessages}
        resultText={gameState.resultText}
        onDismissNotification={handleDismissNotification}
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
