import 'dart:async';
import 'dart:math' as math;
import 'package:flame/game.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';
import '../models/card_data.dart';
import 'components/card_component.dart';
import 'effects/match_particles.dart';

/// Main Flame Game orchestrating the 4x4 card grid with responsive dynamic layout.
class MemoryCardGame extends FlameGame with TapCallbacks {
  final ValueChanged<int> onScoreUpdate;
  final Function(int finalScore, int moves) onGameOver;

  MemoryCardGame({
    required this.onScoreUpdate,
    required this.onGameOver,
  });

  // Reactive state notifiers for Flutter HUD
  final ValueNotifier<int> scoreNotifier = ValueNotifier<int>(0);
  final ValueNotifier<int> movesNotifier = ValueNotifier<int>(0);

  // 8 unique pairs
  static const List<CardData> masterDeck = [
    CardData(pairId: 0, symbol: '⚡', themeColor: Color(0xFFF59E0B), label: 'Thunder'),
    CardData(pairId: 1, symbol: '💎', themeColor: Color(0xFF06B6D4), label: 'Diamond'),
    CardData(pairId: 2, symbol: '🚀', themeColor: Color(0xFFEF4444), label: 'Rocket'),
    CardData(pairId: 3, symbol: '❤️', themeColor: Color(0xFFEC4899), label: 'Heart'),
    CardData(pairId: 4, symbol: '⭐', themeColor: Color(0xFFEAB308), label: 'Star'),
    CardData(pairId: 5, symbol: '🍀', themeColor: Color(0xFF10B981), label: 'Clover'),
    CardData(pairId: 6, symbol: '🎮', themeColor: Color(0xFF8B5CF6), label: 'Arcade'),
    CardData(pairId: 7, symbol: '🔥', themeColor: Color(0xFFF97316), label: 'Flame'),
  ];

  final List<CardComponent> _cards = [];
  CardComponent? _firstSelected;
  CardComponent? _secondSelected;
  bool _isProcessing = false;
  int _matchedPairsCount = 0;

  @override
  Color backgroundColor() => const Color(0xFF0F172A);

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    _buildAndLayoutGrid();
  }

  @override
  void onGameResize(Vector2 size) {
    super.onGameResize(size);
    _repositionGrid(size);
  }

  void _buildAndLayoutGrid() {
    final List<CardData> deck = [];
    for (var card in masterDeck) {
      deck.add(card);
      deck.add(card);
    }

    deck.shuffle(math.Random());

    _cards.clear();
    for (int i = 0; i < deck.length; i++) {
      final cardComponent = CardComponent(
        cardId: i,
        data: deck[i],
        onCardTapped: _handleCardTap,
      );
      _cards.add(cardComponent);
      add(cardComponent);
    }

    if (size.x > 0 && size.y > 0) {
      _repositionGrid(size);
    }
  }

  /// Responsive grid algorithm that dynamically scales spacing & card sizes
  /// to fit strictly within any device viewport without clipping.
  void _repositionGrid(Vector2 canvasSize) {
    if (_cards.isEmpty || canvasSize.x <= 0 || canvasSize.y <= 0) return;

    const int cols = 4;
    const int rows = 4;

    // Dynamically adjust padding and spacing based on screen size
    final double padding = canvasSize.x < 380 ? 10.0 : 16.0;
    final double spacing = canvasSize.x < 380 ? 6.0 : 10.0;

    final double availableWidth = canvasSize.x - (padding * 2);
    final double availableHeight = canvasSize.y - (padding * 2);

    final double maxCardWidth = (availableWidth - (spacing * (cols - 1))) / cols;
    final double maxCardHeight = (availableHeight - (spacing * (rows - 1))) / rows;

    // Cards are strictly square and clamped to guarantee no overflow
    final double cardSide = math.min(maxCardWidth, maxCardHeight).clamp(42.0, 115.0);

    final double totalGridWidth = (cols * cardSide) + ((cols - 1) * spacing);
    final double totalGridHeight = (rows * cardSide) + ((rows - 1) * spacing);

    // Center grid in available canvas
    final double startX = (canvasSize.x - totalGridWidth) / 2;
    final double startY = (canvasSize.y - totalGridHeight) / 2;

    for (int i = 0; i < _cards.length; i++) {
      final int col = i % cols;
      final int row = i ~/ cols;

      final double x = startX + (col * (cardSide + spacing));
      final double y = startY + (row * (cardSide + spacing));

      // With Anchor.center, position at card center for symmetric 3D rotation and scale
      _cards[i].updateCardDimensions(Vector2(cardSide, cardSide));
      _cards[i].position = Vector2(x + (cardSide / 2), y + (cardSide / 2));
    }
  }

  void _handleCardTap(CardComponent tappedCard) {
    if (_isProcessing) return;
    if (tappedCard.isFaceUp || tappedCard.isMatched) return;

    tappedCard.flipFaceUp();

    if (_firstSelected == null) {
      _firstSelected = tappedCard;
    } else {
      _secondSelected = tappedCard;
      movesNotifier.value++;
      _isProcessing = true;

      if (_firstSelected!.data.pairId == _secondSelected!.data.pairId) {
        // Match found
        scoreNotifier.value += 100;
        onScoreUpdate(scoreNotifier.value);
        _matchedPairsCount++;

        final first = _firstSelected!;
        final second = _secondSelected!;

        first.celebrateMatch();
        second.celebrateMatch();

        add(ThreeDMatchParticleEffect(
          centerPosition: first.position.clone(),
          particleColor: first.data.themeColor,
        ));
        add(ThreeDMatchParticleEffect(
          centerPosition: second.position.clone(),
          particleColor: second.data.themeColor,
        ));

        _firstSelected = null;
        _secondSelected = null;
        _isProcessing = false;

        if (_matchedPairsCount == 8) {
          Future.delayed(const Duration(milliseconds: 600), () {
            onGameOver(scoreNotifier.value, movesNotifier.value);
          });
        }
      } else {
        // Mismatch
        scoreNotifier.value = math.max(0, scoreNotifier.value - 15);
        onScoreUpdate(scoreNotifier.value);

        Future.delayed(const Duration(milliseconds: 1000), () {
          _firstSelected?.flipFaceDown();
          _secondSelected?.flipFaceDown();
          _firstSelected = null;
          _secondSelected = null;
          _isProcessing = false;
        });
      }
    }
  }
}
