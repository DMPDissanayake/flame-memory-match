// ==============================================================================
// Flutter Flame Engine 2D Memory Card Matching Game (main.dart)
// ==============================================================================
// - Fully Responsive Layout with LayoutBuilder & safe constraints
// - Zero RenderFlex overflow on small (< 360dp) and large (> 600dp) screens
// - flame: ^1.18.0 & shared_preferences: ^2.2.3
// - Dynamic font scaling and proportional card dimension recalculation
// ==============================================================================

import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flame/game.dart';
import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flame/effects.dart';
import 'package:flame/particles.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const FlameMemoryGameApp());
}

/// Root Flutter App embedding the Flame GameWidget.
class FlameMemoryGameApp extends StatelessWidget {
  const FlameMemoryGameApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flame Memory Matcher',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF1E293B),
        ),
        fontFamily: 'Roboto',
      ),
      home: const FlameGameScreen(),
    );
  }
}

/// Flutter wrapper screen handling responsive HUD, High Score, and Flame GameWidget.
class FlameGameScreen extends StatefulWidget {
  const FlameGameScreen({super.key});

  @override
  State<FlameGameScreen> createState() => _FlameGameScreenState();
}

class _FlameGameScreenState extends State<FlameGameScreen> {
  late MemoryCardGame _game;
  int _highScore = 0;
  bool _isLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadHighScore();
    _initializeGame();
  }

  Future<void> _loadHighScore() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _highScore = prefs.getInt('memory_high_score') ?? 0;
      _isLoaded = true;
    });
  }

  Future<void> _saveHighScore(int newScore) async {
    if (newScore > _highScore) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('memory_high_score', newScore);
      setState(() {
        _highScore = newScore;
      });
    }
  }

  void _initializeGame() {
    _game = MemoryCardGame(
      onScoreUpdate: (score) {
        _saveHighScore(score);
      },
      onGameOver: (finalScore, moves) {
        _showGameOverDialog(finalScore, moves);
      },
    );
  }

  void _restartGame() {
    setState(() {
      _initializeGame();
    });
  }

  void _showGameOverDialog(int finalScore, int moves) {
    final isNewRecord = finalScore > _highScore;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(26),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.4), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.6),
                  blurRadius: 30,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withOpacity(0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFF59E0B), width: 2),
                  ),
                  child: const Icon(Icons.emoji_events_rounded, color: Color(0xFFF59E0B), size: 38),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Board Cleared!',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 6),
                Text(
                  isNewRecord ? 'New High Score Achieved!' : 'All 8 card pairs matched!',
                  style: TextStyle(
                    fontSize: 13,
                    color: isNewRecord ? const Color(0xFF10B981) : Colors.white60,
                    fontWeight: isNewRecord ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildMetricCol('Moves', '$moves'),
                      Container(width: 1, height: 26, color: Colors.white12),
                      _buildMetricCol('Score', '$finalScore'),
                      Container(width: 1, height: 26, color: Colors.white12),
                      _buildMetricCol('Best', '$_highScore'),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _restartGame();
                    },
                    icon: const Icon(Icons.refresh_rounded, size: 20),
                    label: const Text('Play Again', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMetricCol(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.white54)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_isLoaded) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))),
      );
    }

    final double screenWidth = MediaQuery.sizeOf(context).width;
    final bool isCompact = screenWidth < 380;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.gamepad_rounded, color: Color(0xFF6366F1)),
            SizedBox(width: 10),
            Text(
              'Flame Memory Matcher',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.5, fontSize: 18),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Restart Board',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _restartGame,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double availableWidth = constraints.maxWidth;
            final double availableHeight = constraints.maxHeight;
            final double maxCanvasWidth = math.min(availableWidth, 580.0);

            return Center(
              child: SizedBox(
                width: maxCanvasWidth,
                height: availableHeight,
                child: Column(
                  children: [
                    // Responsive HUD
                    Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: isCompact ? 10.0 : 16.0,
                        vertical: 6.0,
                      ),
                      child: Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: isCompact ? 10 : 16,
                          vertical: isCompact ? 10 : 12,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.08)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: ValueListenableBuilder<int>(
                                valueListenable: _game.movesNotifier,
                                builder: (context, moves, _) {
                                  return _buildHudItem('Moves', '$moves', Icons.touch_app_outlined, const Color(0xFF60A5FA), isCompact);
                                },
                              ),
                            ),
                            Container(width: 1, height: 26, color: Colors.white12),
                            Expanded(
                              child: ValueListenableBuilder<int>(
                                valueListenable: _game.scoreNotifier,
                                builder: (context, score, _) {
                                  return _buildHudItem('Score', '$score', Icons.bolt_rounded, const Color(0xFFFBBF24), isCompact);
                                },
                              ),
                            ),
                            Container(width: 1, height: 26, color: Colors.white12),
                            Expanded(
                              child: _buildHudItem('High Score', '$_highScore', Icons.emoji_events_outlined, const Color(0xFF10B981), isCompact),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Embedded Flame 2D Canvas with adaptive bounds
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(12.0, 4.0, 12.0, 12.0),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: GameWidget(game: _game),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildHudItem(String label, String value, IconData icon, Color color, bool isCompact) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: EdgeInsets.all(isCompact ? 5 : 6),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: isCompact ? 13 : 16, color: color),
          ),
          SizedBox(width: isCompact ? 5 : 8),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: isCompact ? 9 : 10,
                    color: Colors.white54,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: isCompact ? 14 : 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ==============================================================================
// Flame Engine Game Implementation (flame: ^1.18.0)
// ==============================================================================

class CardData {
  final int pairId;
  final String symbol;
  final Color themeColor;
  final String label;

  const CardData({
    required this.pairId,
    required this.symbol,
    required this.themeColor,
    required this.label,
  });
}

class MemoryCardGame extends FlameGame with TapCallbacks {
  final ValueChanged<int> onScoreUpdate;
  final Function(int finalScore, int moves) onGameOver;

  MemoryCardGame({
    required this.onScoreUpdate,
    required this.onGameOver,
  });

  final ValueNotifier<int> scoreNotifier = ValueNotifier<int>(0);
  final ValueNotifier<int> movesNotifier = ValueNotifier<int>(0);

  static const List<CardData> _masterCards = [
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
    for (var card in _masterCards) {
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

  void _repositionGrid(Vector2 canvasSize) {
    if (_cards.isEmpty || canvasSize.x <= 0 || canvasSize.y <= 0) return;

    const int cols = 4;
    const int rows = 4;

    final double padding = canvasSize.x < 380 ? 10.0 : 16.0;
    final double spacing = canvasSize.x < 380 ? 6.0 : 10.0;

    final double availableWidth = canvasSize.x - (padding * 2);
    final double availableHeight = canvasSize.y - (padding * 2);

    final double maxCardWidth = (availableWidth - (spacing * (cols - 1))) / cols;
    final double maxCardHeight = (availableHeight - (spacing * (rows - 1))) / rows;
    final double cardSide = math.min(maxCardWidth, maxCardHeight).clamp(42.0, 115.0);

    final double totalGridWidth = (cols * cardSide) + ((cols - 1) * spacing);
    final double totalGridHeight = (rows * cardSide) + ((rows - 1) * spacing);

    final double startX = (canvasSize.x - totalGridWidth) / 2;
    final double startY = (canvasSize.y - totalGridHeight) / 2;

    for (int i = 0; i < _cards.length; i++) {
      final int col = i % cols;
      final int row = i ~/ cols;

      final double x = startX + (col * (cardSide + spacing));
      final double y = startY + (row * (cardSide + spacing));

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
        scoreNotifier.value += 100;
        onScoreUpdate(scoreNotifier.value);
        _matchedPairsCount++;

        final first = _firstSelected!;
        final second = _secondSelected!;

        first.celebrateMatch();
        second.celebrateMatch();
        _spawnMatchParticles(first.position.clone(), first.data.themeColor);
        _spawnMatchParticles(second.position.clone(), second.data.themeColor);

        _firstSelected = null;
        _secondSelected = null;
        _isProcessing = false;

        if (_matchedPairsCount == 8) {
          Future.delayed(const Duration(milliseconds: 600), () {
            onGameOver(scoreNotifier.value, movesNotifier.value);
          });
        }
      } else {
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

  void _spawnMatchParticles(Vector2 centerPosition, Color particleColor) {
    final random = math.Random();
    final particle = Particle.generate(
      count: 28,
      lifespan: 0.65,
      generator: (i) {
        final double speed = random.nextDouble() * 180 + 60;
        final double angle = random.nextDouble() * math.pi * 2;
        final Vector2 velocity = Vector2(math.cos(angle) * speed, math.sin(angle) * speed);

        return AcceleratedParticle(
          position: centerPosition.clone(),
          speed: velocity,
          acceleration: Vector2(0, 80),
          child: CircleParticle(
            radius: random.nextDouble() * 3.5 + 2.0,
            paint: Paint()
              ..color = particleColor.withOpacity(0.9)
              ..style = PaintingStyle.fill,
          ),
        );
      },
    );

    add(ParticleSystemComponent(particle: particle));
  }
}

class CardComponent extends PositionComponent with TapCallbacks {
  final int cardId;
  final CardData data;
  final ValueChanged<CardComponent> onCardTapped;

  bool isFaceUp = false;
  bool isMatched = false;

  final Paint _backPaint = Paint()..color = const Color(0xFF1E293B);
  final Paint _backBorderPaint = Paint()
    ..color = Colors.white.withOpacity(0.15)
    ..style = PaintingStyle.stroke
    ..strokeWidth = 1.5;

  final Paint _frontPaint = Paint()..color = const Color(0xFF0F172A);
  final Paint _frontBorderPaint = Paint()..style = PaintingStyle.stroke;
  final Paint _matchedGlowPaint = Paint()..style = PaintingStyle.fill;

  TextPainter? _symbolPainter;
  TextPainter? _questionPainter;
  double _lastSide = 0.0;

  CardComponent({
    required this.cardId,
    required this.data,
    required this.onCardTapped,
  }) : super(anchor: Anchor.center) {
    _frontBorderPaint.color = data.themeColor;
    _frontBorderPaint.strokeWidth = 2.0;
    _matchedGlowPaint.color = data.themeColor.withOpacity(0.25);
  }

  void updateCardDimensions(Vector2 newSize) {
    size = newSize;
    final double side = newSize.x;
    if ((side - _lastSide).abs() < 1.0) return;
    _lastSide = side;

    final double symbolFontSize = (side * 0.42).clamp(18.0, 36.0);
    final double questionFontSize = (side * 0.32).clamp(14.0, 26.0);

    _symbolPainter = TextPainter(
      text: TextSpan(
        text: data.symbol,
        style: TextStyle(fontSize: symbolFontSize),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    _questionPainter = TextPainter(
      text: TextSpan(
        text: '?',
        style: TextStyle(
          fontSize: questionFontSize,
          fontWeight: FontWeight.bold,
          color: Colors.white.withOpacity(0.35),
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
  }

  @override
  void onTapDown(TapDownEvent event) {
    super.onTapDown(event);
    onCardTapped(this);
  }

  void flipFaceUp() {
    if (isFaceUp) return;
    add(
      ScaleEffect.to(
        Vector2(0.0, 1.0),
        EffectController(duration: 0.12, curve: Curves.easeIn),
        onComplete: () {
          isFaceUp = true;
          add(
            ScaleEffect.to(
              Vector2(1.0, 1.0),
              EffectController(duration: 0.12, curve: Curves.easeOut),
            ),
          );
        },
      ),
    );
  }

  void flipFaceDown() {
    if (!isFaceUp || isMatched) return;
    add(
      ScaleEffect.to(
        Vector2(0.0, 1.0),
        EffectController(duration: 0.12, curve: Curves.easeIn),
        onComplete: () {
          isFaceUp = false;
          add(
            ScaleEffect.to(
              Vector2(1.0, 1.0),
              EffectController(duration: 0.12, curve: Curves.easeOut),
            ),
          );
        },
      ),
    );
  }

  void celebrateMatch() {
    isMatched = true;
    _frontBorderPaint.strokeWidth = 3.0;
    add(
      ScaleEffect.by(
        Vector2.all(1.15),
        EffectController(
          duration: 0.16,
          reverseDuration: 0.16,
          curve: Curves.easeInOutBack,
        ),
      ),
    );
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    if (_symbolPainter == null) {
      updateCardDimensions(size);
    }

    final RRect rrect = RRect.fromRectAndRadius(
      size.toRect(),
      const Radius.circular(14),
    );

    if (isFaceUp) {
      canvas.drawRRect(rrect, _frontPaint);
      if (isMatched) {
        canvas.drawRRect(rrect, _matchedGlowPaint);
      }
      canvas.drawRRect(rrect, _frontBorderPaint);

      if (_symbolPainter != null) {
        final double textX = (size.x - _symbolPainter!.width) / 2;
        final double textY = (size.y - _symbolPainter!.height) / 2;
        _symbolPainter!.paint(canvas, Offset(textX, textY));
      }
    } else {
      canvas.drawRRect(rrect, _backPaint);
      canvas.drawRRect(rrect, _backBorderPaint);

      if (_questionPainter != null) {
        final double qX = (size.x - _questionPainter!.width) / 2;
        final double qY = (size.y - _questionPainter!.height) / 2;
        _questionPainter!.paint(canvas, Offset(qX, qY));
      }
    }
  }
}
