import React from 'react';
const renderer = require('react-test-renderer');
const { act } = renderer;

jest.mock('../components/PlayerHand', () => {
  const { Text, View } = jest.requireActual('react-native');

  return {
    PlayerHand: () => (
      <View>
        <Text>Your cards</Text>
      </View>
    ),
  };
});

jest.mock('../components/AwawaSlots', () => {
  const { Text, View } = jest.requireActual('react-native');
  const { getCardLabel } = jest.requireActual('../game/cards');

  return {
    AwawaSlots: ({
      protections,
      awawas,
    }: {
      protections: Array<{ type: string; sourcePlayerId?: number } | null>;
      awawas: boolean[];
    }) => (
      <View>
        {protections.map((card, index) => (
          <Text key={`protection-${index}`}>
            {awawas[index] && card ? getCardLabel(card) : ''}
          </Text>
        ))}
      </View>
    ),
  };
});

import { GameScreen } from './GameScreen';

const noop = () => undefined;

const baseProps = {
  playerCount: 4,
  currentPlayer: 1,
  playerBoards: [
    {
      id: 1,
      protections: [null, null, null, null, null],
      awawas: [true, true, true, true, true],
    },
    {
      id: 2,
      protections: [{ id: 'roca-p2', type: 'roca' as const }, null, null, null, null],
      awawas: [true, true, true, true, true],
    },
    {
      id: 3,
      protections: [null, { id: 'cueva-p3', type: 'cueva' as const }, null, null, null],
      awawas: [true, true, true, true, false],
    },
    {
      id: 4,
      protections: [null, null, null, null, null],
      awawas: [true, false, true, true, true],
    },
  ],
  cardsLeft: 10,
  colonyCount: 5,
  currentHand: [{ id: 'aguila-1', type: 'aguila' as const }],
  selectedCardId: null,
  pendingTarget: null,
  canDraw: true,
  canThrow: false,
  canPlay: true,
  gameOver: false,
  notificationMessages: ['P2 did something important.'],
  resultText: null,
  onDismissNotification: noop,
  onDrawCard: noop,
  onThrowCard: noop,
  onFinishTurn: noop,
  onRestart: noop,
  onSelectCard: noop,
  onSelectTargetSlot: noop,
  onPlayCard: noop,
  onConfirmTarget: noop,
  onCancelTarget: noop,
  onDropProtection: noop,
};

function findHostNodesByTestId(tree: any, testID: string) {
  return tree.root.findAll(
    (node: any) => typeof node.type === 'string' && node.props.testID === testID,
  );
}

function findHostTextNodes(tree: any, text: string) {
  return tree.root.findAll(
    (node: any) => node.type === 'Text' && node.props.children === text,
  );
}

describe('GameScreen', () => {
  let warnSpy: jest.SpyInstance;

  beforeAll(() => {
    global.requestAnimationFrame = ((callback: (time: number) => void) => {
      callback(0);
      return 0 as never;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = (() => undefined) as typeof cancelAnimationFrame;
  });

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('renders player peek buttons in stable order and disables the current player slot', () => {
    let tree: any;

    act(() => {
      tree = renderer.create(<GameScreen {...baseProps} />);
    });

    const buttons = [1, 2, 3, 4].map((playerId) =>
      tree.root.findByProps({ testID: `peek-button-p${playerId}` }),
    );

    expect(buttons.map((button) => button.props.testID)).toEqual([
      'peek-button-p1',
      'peek-button-p2',
      'peek-button-p3',
      'peek-button-p4',
    ]);
    expect(buttons[0].props.accessibilityState).toEqual({ disabled: true });
    expect(buttons[1].props.accessibilityState).toEqual({ disabled: false });
    expect(buttons[2].props.accessibilityState).toEqual({ disabled: false });
    expect(buttons[3].props.accessibilityState).toEqual({ disabled: false });

    act(() => {
      tree.unmount();
    });
  });

  it('shows another player board only while their button is held', () => {
    let tree: any;

    act(() => {
      tree = renderer.create(<GameScreen {...baseProps} />);
    });

    const playerTwoButton = tree.root.findByProps({ testID: 'peek-button-p2' });

    expect(findHostNodesByTestId(tree, 'current-player-hand')).toHaveLength(1);
    expect(findHostNodesByTestId(tree, 'peek-board-header')).toHaveLength(0);
    expect(findHostNodesByTestId(tree, 'notification-box')).toHaveLength(1);

    act(() => {
      playerTwoButton.props.onPressIn();
    });

    expect(findHostNodesByTestId(tree, 'current-player-hand')).toHaveLength(0);
    expect(findHostNodesByTestId(tree, 'peek-board-header')).toHaveLength(1);
    expect(findHostNodesByTestId(tree, 'notification-box')).toHaveLength(0);
    expect(findHostTextNodes(tree, 'Roca')).toHaveLength(1);

    act(() => {
      playerTwoButton.props.onPressOut();
    });

    expect(findHostNodesByTestId(tree, 'current-player-hand')).toHaveLength(1);
    expect(findHostNodesByTestId(tree, 'peek-board-header')).toHaveLength(0);
    expect(findHostNodesByTestId(tree, 'notification-box')).toHaveLength(1);

    act(() => {
      tree.unmount();
    });
  });

  it('does not enter peek mode when pressing the current player button', () => {
    let tree: any;

    act(() => {
      tree = renderer.create(<GameScreen {...baseProps} />);
    });

    const currentPlayerButton = tree.root.findByProps({ testID: 'peek-button-p1' });

    act(() => {
      currentPlayerButton.props.onPressIn?.();
    });

    expect(findHostNodesByTestId(tree, 'peek-board-header')).toHaveLength(0);
    expect(findHostNodesByTestId(tree, 'current-player-hand')).toHaveLength(1);

    act(() => {
      tree.unmount();
    });
  });

  it('shows the throw card button and disables it when no selected card can be thrown', () => {
    let tree: any;

    act(() => {
      tree = renderer.create(<GameScreen {...baseProps} />);
    });

    const throwButton = tree.root.findByProps({ label: 'Throw Card' });

    expect(throwButton.props.disabled).toBe(true);

    act(() => {
      tree.update(<GameScreen {...baseProps} canThrow={true} selectedCardId="aguila-1" />);
    });

    const enabledThrowButton = tree.root.findByProps({ label: 'Throw Card' });

    expect(enabledThrowButton.props.disabled).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  it('shows eat and cancel controls while choosing an aguila target', () => {
    let tree: any;

    act(() => {
      tree = renderer.create(
        <GameScreen
          {...baseProps}
          pendingTarget={{
            type: 'aguila',
            playerId: 2,
            protections: baseProps.playerBoards[1].protections,
            awawas: baseProps.playerBoards[1].awawas,
            validSlotIndexes: [0],
            selectedSlotIndex: 0,
          }}
        />,
      );
    });

    expect(findHostNodesByTestId(tree, 'target-action-header')).toHaveLength(1);
    expect(findHostNodesByTestId(tree, 'current-player-hand')).toHaveLength(0);
    expect(findHostNodesByTestId(tree, 'notification-box')).toHaveLength(0);
    expect(tree.root.findByProps({ label: 'Eat' }).props.disabled).toBe(false);
    expect(tree.root.findByProps({ label: 'Cancel' })).toBeDefined();

    act(() => {
      tree.unmount();
    });
  });

  it('uses card-specific labels for other targeted actions', () => {
    let tree: any;

    act(() => {
      tree = renderer.create(
        <GameScreen
          {...baseProps}
          pendingTarget={{
            type: 'rey',
            playerId: 2,
            protections: baseProps.playerBoards[1].protections,
            awawas: baseProps.playerBoards[1].awawas,
            validSlotIndexes: [0, 1, 2, 3, 4],
            selectedSlotIndex: 0,
          }}
        />,
      );
    });

    expect(tree.root.findByProps({ label: 'Stole' })).toBeDefined();

    act(() => {
      tree.update(
        <GameScreen
          {...baseProps}
          pendingTarget={{
            type: 'solcito',
            playerId: 2,
            protections: baseProps.playerBoards[1].protections,
            awawas: baseProps.playerBoards[1].awawas,
            validSlotIndexes: [1],
            selectedSlotIndex: 1,
          }}
        />,
      );
    });

    expect(tree.root.findByProps({ label: 'Send to Rest' })).toBeDefined();

    act(() => {
      tree.update(
        <GameScreen
          {...baseProps}
          pendingTarget={{
            type: 'gritar',
            playerId: 2,
            protections: baseProps.playerBoards[1].protections,
            awawas: baseProps.playerBoards[1].awawas,
            validSlotIndexes: [0],
            selectedSlotIndex: 0,
          }}
        />,
      );
    });

    expect(tree.root.findByProps({ label: 'Scare' })).toBeDefined();

    act(() => {
      tree.unmount();
    });
  });
});
