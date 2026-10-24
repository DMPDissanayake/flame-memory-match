export interface ProjectFile {
  path: string;
  category: 'Config' | 'Entry' | 'Screens' | 'Game' | 'Components' | 'Widgets' | 'Services' | 'Models';
  description: string;
  code: string;
}

export const MODULAR_FLUTTER_PROJECT: ProjectFile[] = [
  {
    path: 'pubspec.yaml',
    category: 'Config',
    description: 'Dependencies configuration for Flame Engine & SharedPreferences',
    code: `name: flame_memory_matcher
description: "A production-grade 2D Memory Card Matching game built with Flutter and Flame Engine."
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  flame: ^1.18.0
  shared_preferences: ^2.2.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true`,
  },
  {
    path: 'lib/main.dart',
    category: 'Entry',
    description: 'Application entry point with WidgetsFlutterBinding and MaterialApp',
    code: `import 'package:flutter/material.dart';
import 'src/screens/game_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const FlameMemoryGameApp());
}

/// Root application widget.
class FlameMemoryGameApp extends StatelessWidget {
  const FlameMemoryGameApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flame Memory 3D',
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
      home: const GameScreen(),
    );
  }
}`,
  },
  {
    path: 'lib/src/screens/game_screen.dart',
    category: 'Screens',
    description: 'Scaffold embedding GameWidget with RepaintBoundary, LayoutBuilder, and AppLifecycleState listeners',
    code: `import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flame/game.dart';
import '../services/storage_service.dart';
import '../game/memory_card_game.dart';
import '../widgets/game_hud.dart';
import '../widgets/game_over_dialog.dart';

/// Highly optimized Game Screen hosting the 3D-enhanced Flame canvas within
/// Flutter Scaffold, utilizing RepaintBoundary, LayoutBuilder, and AppLifecycleState listeners.
class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with WidgetsBindingObserver {
  final StorageService _storageService = StorageService();
  late MemoryCardGame _game;
  int _highScore = 0;
  bool _isLoaded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadHighScore();
    _initializeGame();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// App lifecycle listener: pauses the Flame engine loop when the app is in the
  /// background, conserving device GPU/CPU and battery during 3D particle processing.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_isLoaded) return;
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      _game.pauseEngine();
    } else if (state == AppLifecycleState.resumed) {
      _game.resumeEngine();
    }
  }

  Future<void> _loadHighScore() async {
    final score = await _storageService.getHighScore();
    if (!mounted) return;
    setState(() {
      _highScore = score;
      _isLoaded = true;
    });
  }

  Future<void> _handleScoreUpdate(int currentScore) async {
    final updated = await _storageService.setHighScoreIfGreater(currentScore);
    if (updated && mounted) {
      setState(() {
        _highScore = currentScore;
      });
    }
  }

  void _initializeGame() {
    _game = MemoryCardGame(
      onScoreUpdate: _handleScoreUpdate,
      onGameOver: (finalScore, moves) {
        if (!mounted) return;
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => GameOverDialog(
            finalScore: finalScore,
            moves: moves,
            highScore: _highScore,
            onPlayAgain: _restartGame,
          ),
        );
      },
    );
  }

  void _restartGame() {
    setState(() {
      _initializeGame();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_isLoaded) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F172A),
        body: Center(
          child: CircularProgressIndicator(
            color: Color(0xFF6366F1),
            strokeWidth: 3.0,
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.gamepad_rounded, color: Color(0xFF6366F1)),
            SizedBox(width: 10),
            Text(
              'Flame Memory 3D',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
                fontSize: 18,
              ),
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

            // Constrain canvas width on tablets/desktops to prevent ultra-wide stretching
            final double maxCanvasWidth = math.min(availableWidth, 580.0);

            return Center(
              child: SizedBox(
                width: maxCanvasWidth,
                height: availableHeight,
                child: Column(
                  children: [
                    // Reactive HUD (isolated from game canvas redraws)
                    GameHud(
                      movesNotifier: _game.movesNotifier,
                      scoreNotifier: _game.scoreNotifier,
                      highScore: _highScore,
                    ),

                    // Embedded Flame Canvas wrapped in RepaintBoundary and ClipRRect
                    // for optimal GPU rasterization and zero overflow
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(12.0, 4.0, 12.0, 12.0),
                        child: RepaintBoundary(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: GameWidget(game: _game),
                          ),
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
}`,
  },
  {
    path: 'lib/src/game/memory_card_game.dart',
    category: 'Game',
    description: 'FlameGame orchestrating the 4x4 card grid, checks, and 3D particle systems',
    code: `import 'dart:async';
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

  final ValueNotifier<int> scoreNotifier = ValueNotifier<int>(0);
  final ValueNotifier<int> movesNotifier = ValueNotifier<int>(0);

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
}`,
  },
  {
    path: 'lib/src/game/components/card_component.dart',
    category: 'Components',
    description: '3D perspective card rotation with Matrix4, dynamic Z-lift, and specular lighting',
    code: `import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';
import '../../models/card_data.dart';

/// Card animation state machine.
enum CardState {
  faceDown,
  flippingUp,
  faceUp,
  flippingDown,
  matched,
}

/// Advanced 2D Component simulating realistic 3D perspective rotation and lighting.
class CardComponent extends PositionComponent with TapCallbacks {
  final int cardId;
  final CardData data;
  final ValueChanged<CardComponent> onCardTapped;
  final VoidCallback? onFlippedUp;

  CardState _state = CardState.faceDown;
  CardState get state => _state;
  bool get isFaceUp => _state == CardState.faceUp || _state == CardState.matched;
  bool get isMatched => _state == CardState.matched;

  // 3D Animation timing and interpolation
  static const double _flipDuration = 0.34; // seconds
  double _flipElapsed = 0.0;
  double _rotationAngle = 0.0; // 0 to pi (radians)
  double _cardLift = 0.0;      // 0 to 1 peak lift off table

  // Match celebration spring bounce
  double _celebrateTimer = 0.0;
  double _scaleBonus = 1.0;

  // Paints & styling
  final Paint _backPaint = Paint()..color = const Color(0xFF1E293B);
  final Paint _backBorderPaint = Paint()
    ..color = Colors.white.withOpacity(0.18)
    ..style = PaintingStyle.stroke
    ..strokeWidth = 1.5;

  final Paint _frontPaint = Paint()..color = const Color(0xFF0F172A);
  final Paint _frontBorderPaint = Paint()..style = PaintingStyle.stroke;
  final Paint _matchedGlowPaint = Paint()..style = PaintingStyle.fill;
  final Paint _bevelPaint = Paint()..style = PaintingStyle.fill;
  final Paint _shadowPaint = Paint()..color = Colors.black.withOpacity(0.35);

  TextPainter? _symbolPainter;
  TextPainter? _questionPainter;
  double _lastSide = 0.0;

  CardComponent({
    required this.cardId,
    required this.data,
    required this.onCardTapped,
    this.onFlippedUp,
  }) : super(anchor: Anchor.center) {
    _frontBorderPaint.color = data.themeColor;
    _frontBorderPaint.strokeWidth = 2.2;
    _matchedGlowPaint.color = data.themeColor.withOpacity(0.25);
    _bevelPaint.color = Colors.white.withOpacity(0.08);
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

  void flipFaceUp() {
    if (_state != CardState.faceDown) return;
    _state = CardState.flippingUp;
    _flipElapsed = 0.0;
  }

  void flipFaceDown() {
    if (_state != CardState.faceUp) return;
    _state = CardState.flippingDown;
    _flipElapsed = 0.0;
  }

  void celebrateMatch() {
    _state = CardState.matched;
    _celebrateTimer = 0.38;
    _frontBorderPaint.strokeWidth = 3.2;
  }

  @override
  void update(double dt) {
    super.update(dt);

    // 1. Process 3D Rotation Flip Physics
    if (_state == CardState.flippingUp) {
      _flipElapsed += dt;
      final double progress = (_flipElapsed / _flipDuration).clamp(0.0, 1.0);
      final double curvedProgress = Curves.easeInOutCubic.transform(progress);

      _rotationAngle = curvedProgress * math.pi;
      _cardLift = math.sin(curvedProgress * math.pi) * 0.14;

      if (progress >= 1.0) {
        _rotationAngle = math.pi;
        _cardLift = 0.0;
        _state = CardState.faceUp;
        onFlippedUp?.call();
      }
    } else if (_state == CardState.flippingDown) {
      _flipElapsed += dt;
      final double progress = (_flipElapsed / _flipDuration).clamp(0.0, 1.0);
      final double curvedProgress = Curves.easeInOutCubic.transform(1.0 - progress);

      _rotationAngle = curvedProgress * math.pi;
      _cardLift = math.sin(curvedProgress * math.pi) * 0.12;

      if (progress >= 1.0) {
        _rotationAngle = 0.0;
        _cardLift = 0.0;
        _state = CardState.faceDown;
      }
    }

    // 2. Process Match Celebration Spring Animation
    if (_celebrateTimer > 0) {
      _celebrateTimer = math.max(0.0, _celebrateTimer - dt);
      final double phase = 1.0 - (_celebrateTimer / 0.38);
      _scaleBonus = 1.0 + (math.sin(phase * math.pi) * 0.18);
    } else if (_scaleBonus != 1.0) {
      _scaleBonus = 1.0;
    }
  }

  @override
  void onTapDown(TapDownEvent event) {
    super.onTapDown(event);
    if (_state != CardState.faceDown) return;
    onCardTapped(this);
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    if (_symbolPainter == null) {
      updateCardDimensions(size);
    }

    final double halfWidth = size.x / 2;
    final double halfHeight = size.y / 2;

    // 1. Draw Simulated 3D Cast Shadow
    if (_cardLift > 0.01) {
      final double shadowOffset = 6.0 + (_cardLift * 18.0);
      final double shadowScale = 1.0 + (_cardLift * 0.08);

      canvas.save();
      canvas.translate(halfWidth, halfHeight + shadowOffset);
      canvas.scale(shadowScale, shadowScale * 0.95);
      final RRect shadowRRect = RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset.zero,
          width: size.x * 0.92,
          height: size.y * 0.92,
        ),
        const Radius.circular(16),
      );
      canvas.drawRRect(shadowRRect, _shadowPaint);
      canvas.restore();
    }

    // 2. Apply Simulated 3D Matrix Perspective Transformation
    canvas.save();
    canvas.translate(halfWidth, halfHeight);

    final double totalScale = (1.0 + _cardLift) * _scaleBonus;
    canvas.scale(totalScale, totalScale);

    final Matrix4 perspectiveMatrix = Matrix4.identity()
      ..setEntry(3, 2, 0.0016)
      ..rotateY(_rotationAngle);

    canvas.transform(perspectiveMatrix.storage);
    canvas.translate(-halfWidth, -halfHeight);

    // 3. Render Appropriate Face Side (Front vs Back)
    final bool isFrontFacing = _rotationAngle >= (math.pi / 2);

    if (isFrontFacing) {
      canvas.save();
      canvas.translate(halfWidth, halfHeight);
      canvas.transform((Matrix4.identity()..rotateY(math.pi)).storage);
      canvas.translate(-halfWidth, -halfHeight);

      _drawFront(canvas);
      _drawLightingReflection(canvas, math.sin(_rotationAngle));
      canvas.restore();
    } else {
      _drawBack(canvas);
      _drawLightingReflection(canvas, math.sin(_rotationAngle));
    }

    canvas.restore();
  }

  void _drawFront(Canvas canvas) {
    final RRect rrect = RRect.fromRectAndRadius(
      size.toRect(),
      const Radius.circular(14),
    );

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
  }

  void _drawBack(Canvas canvas) {
    final RRect rrect = RRect.fromRectAndRadius(
      size.toRect(),
      const Radius.circular(14),
    );

    canvas.drawRRect(rrect, _backPaint);
    canvas.drawRRect(rrect, _backBorderPaint);

    final RRect innerRRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(6, 6, size.x - 12, size.y - 12),
      const Radius.circular(10),
    );
    canvas.drawRRect(innerRRect, _bevelPaint);

    if (_questionPainter != null) {
      final double qX = (size.x - _questionPainter!.width) / 2;
      final double qY = (size.y - _questionPainter!.height) / 2;
      _questionPainter!.paint(canvas, Offset(qX, qY));
    }
  }

  void _drawLightingReflection(Canvas canvas, double angleSin) {
    if (angleSin < 0.05) return;

    final Paint shadePaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white.withOpacity(angleSin * 0.28),
          Colors.transparent,
          Colors.black.withOpacity(angleSin * 0.40),
        ],
        stops: const [0.0, 0.45, 1.0],
      ).createShader(size.toRect());

    final RRect rrect = RRect.fromRectAndRadius(
      size.toRect(),
      const Radius.circular(14),
    );
    canvas.drawRRect(rrect, shadePaint);
  }
}`,
  },
  {
    path: 'lib/src/game/effects/match_particles.dart',
    category: 'Game',
    description: 'ThreeDMatchParticleEffect emitting conical 3D particle bursts with depth scaling',
    code: `import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flutter/material.dart';

/// Single particle unit simulating full 3D coordinates (x, y, z) with perspective scaling.
class _Simulated3DParticle {
  double x;
  double y;
  double z; // Depth along camera axis (0 = card plane, negative = flying toward camera)

  double vx;
  double vy;
  double vz;

  final double baseRadius;
  final Color baseColor;
  final double maxLifespan;
  double elapsed = 0.0;
  double rotation = 0.0;
  double rotationSpeed = 0.0;

  _Simulated3DParticle({
    required this.x,
    required this.y,
    required this.z,
    required this.vx,
    required this.vy,
    required this.vz,
    required this.baseRadius,
    required this.baseColor,
    required this.maxLifespan,
    required this.rotationSpeed,
  });

  bool update(double dt) {
    elapsed += dt;
    if (elapsed >= maxLifespan) return false;

    x += vx * dt;
    y += vy * dt;
    z += vz * dt;

    vx *= 0.96;
    vy += 90.0 * dt; // gravity
    vz *= 0.94;

    rotation += rotationSpeed * dt;
    return true;
  }
}

/// A high-performance 2D Flame Component simulating a 3D conical particle explosion
/// with depth perspective scaling, glowing particle cores, and forward camera eruptions.
class ThreeDMatchParticleEffect extends PositionComponent {
  final Color particleColor;
  final int particleCount;
  final List<_Simulated3DParticle> _particles = [];
  final Paint _particlePaint = Paint()..style = PaintingStyle.fill;
  final Paint _glowPaint = Paint()..style = PaintingStyle.fill;

  static const double _focalLength = 260.0;

  ThreeDMatchParticleEffect({
    required Vector2 centerPosition,
    required this.particleColor,
    this.particleCount = 36,
  }) : super(position: centerPosition, anchor: Anchor.center) {
    _initialize3DExplosion();
  }

  void _initialize3DExplosion() {
    final random = math.Random();

    for (int i = 0; i < particleCount; i++) {
      final double radialAngle = random.nextDouble() * math.pi * 2;
      final double elevationAngle = (random.nextDouble() * 0.85) + 0.15;

      final double speed = random.nextDouble() * 220 + 80;
      final double forwardSpeed = (random.nextDouble() * 260 + 120);

      final double vx = math.cos(radialAngle) * math.sin(elevationAngle) * speed;
      final double vy = math.sin(radialAngle) * math.sin(elevationAngle) * speed;
      final double vz = -math.cos(elevationAngle) * forwardSpeed;

      final Color color = i.isEven
          ? particleColor
          : Color.lerp(particleColor, Colors.white, 0.45)!;

      _particles.add(
        _Simulated3DParticle(
          x: (random.nextDouble() - 0.5) * 8.0,
          y: (random.nextDouble() - 0.5) * 8.0,
          z: (random.nextDouble() * 15.0),
          vx: vx,
          vy: vy,
          vz: vz,
          baseRadius: random.nextDouble() * 3.5 + 2.5,
          baseColor: color,
          maxLifespan: random.nextDouble() * 0.35 + 0.48,
          rotationSpeed: (random.nextDouble() - 0.5) * 12.0,
        ),
      );
    }
  }

  @override
  void update(double dt) {
    super.update(dt);

    _particles.removeWhere((particle) => !particle.update(dt));

    if (_particles.isEmpty) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    _particles.sort((a, b) => b.z.compareTo(a.z));

    for (final p in _particles) {
      final double progress = p.elapsed / p.maxLifespan;
      final double alpha = (1.0 - progress).clamp(0.0, 1.0);

      final double depthFactor = (_focalLength + p.z);
      if (depthFactor <= 20.0) continue;

      final double perspectiveScale = (_focalLength / depthFactor).clamp(0.4, 2.5);

      final double screenX = p.x * perspectiveScale;
      final double screenY = p.y * perspectiveScale;
      final double renderedRadius = p.baseRadius * perspectiveScale;

      _glowPaint.color = p.baseColor.withOpacity(alpha * 0.35);
      canvas.drawCircle(
        Offset(screenX, screenY),
        renderedRadius * 1.8,
        _glowPaint,
      );

      _particlePaint.color = p.baseColor.withOpacity(alpha * 0.95);
      canvas.drawCircle(
        Offset(screenX, screenY),
        renderedRadius,
        _particlePaint,
      );
    }
  }
}`,
  },
  {
    path: 'lib/src/widgets/game_hud.dart',
    category: 'Widgets',
    description: 'Responsive HUD bar displaying Moves, Score, and High Score with FittedBox scaling',
    code: `import 'package:flutter/material.dart';

/// Responsive HUD Bar displaying Moves, Score, and High Score with dynamic font sizing
/// and zero-overflow flexible layout across all phone widths.
class GameHud extends StatelessWidget {
  final ValueNotifier<int> movesNotifier;
  final ValueNotifier<int> scoreNotifier;
  final int highScore;

  const GameHud({
    super.key,
    required this.movesNotifier,
    required this.scoreNotifier,
    required this.highScore,
  });

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.sizeOf(context).width;
    final bool isCompact = screenWidth < 380;

    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: isCompact ? 10.0 : 16.0,
        vertical: 6.0,
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 560),
        padding: EdgeInsets.symmetric(
          horizontal: isCompact ? 10 : 16,
          vertical: isCompact ? 10 : 12,
        ),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: ValueListenableBuilder<int>(
                valueListenable: movesNotifier,
                builder: (context, moves, _) {
                  return _buildMetricItem(
                    label: 'Moves',
                    value: '$moves',
                    icon: Icons.touch_app_outlined,
                    color: const Color(0xFF60A5FA),
                    isCompact: isCompact,
                  );
                },
              ),
            ),
            Container(width: 1, height: 26, color: Colors.white12),
            Expanded(
              child: ValueListenableBuilder<int>(
                valueListenable: scoreNotifier,
                builder: (context, score, _) {
                  return _buildMetricItem(
                    label: 'Score',
                    value: '$score',
                    icon: Icons.bolt_rounded,
                    color: const Color(0xFFFBBF24),
                    isCompact: isCompact,
                  );
                },
              ),
            ),
            Container(width: 1, height: 26, color: Colors.white12),
            Expanded(
              child: _buildMetricItem(
                label: 'High Score',
                value: '$highScore',
                icon: Icons.emoji_events_outlined,
                color: const Color(0xFF10B981),
                isCompact: isCompact,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricItem({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
    required bool isCompact,
  }) {
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
}`,
  },
  {
    path: 'lib/src/widgets/game_over_dialog.dart',
    category: 'Widgets',
    description: 'Game Over modal dialog with score summary and restart callback',
    code: `import 'package:flutter/material.dart';

/// Dialog shown when all card pairs are matched.
class GameOverDialog extends StatelessWidget {
  final int finalScore;
  final int moves;
  final int highScore;
  final VoidCallback onPlayAgain;

  const GameOverDialog({
    super.key,
    required this.finalScore,
    required this.moves,
    required this.highScore,
    required this.onPlayAgain,
  });

  @override
  Widget build(BuildContext context) {
    final bool isNewRecord = finalScore > highScore;

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
                  _buildMetricCol('Best', '$highScore'),
                ],
              ),
            ),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).pop();
                  onPlayAgain();
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
}`,
  },
  {
    path: 'lib/src/services/storage_service.dart',
    category: 'Services',
    description: 'SharedPreferences persistent storage service for high scores',
    code: `import 'package:shared_preferences/shared_preferences.dart';

/// Service managing persistent game data (e.g. High Scores) via SharedPreferences.
class StorageService {
  static const String _highScoreKey = 'memory_high_score';

  /// Loads the saved high score. Returns 0 if none is found.
  Future<int> getHighScore() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_highScoreKey) ?? 0;
  }

  /// Updates high score if [newScore] exceeds the current record.
  /// Returns \`true\` if a new record was established.
  Future<bool> setHighScoreIfGreater(int newScore) async {
    final currentHigh = await getHighScore();
    if (newScore > currentHigh) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_highScoreKey, newScore);
      return true;
    }
    return false;
  }
}`,
  },
  {
    path: 'lib/src/models/card_data.dart',
    category: 'Models',
    description: 'Immutable CardData domain model representing card pairs',
    code: `import 'package:flutter/material.dart';

/// Data Model representing a unique card pair in the memory game.
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
}`,
  },
];
