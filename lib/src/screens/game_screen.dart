import 'dart:math' as math;
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
}
