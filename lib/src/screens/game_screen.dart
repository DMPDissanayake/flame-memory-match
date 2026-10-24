import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flame/game.dart';
import '../services/storage_service.dart';
import '../game/memory_card_game.dart';
import '../widgets/game_hud.dart';
import '../widgets/game_over_dialog.dart';

/// Fully responsive Game Screen using LayoutBuilder and dynamic constraints
/// ensuring zero pixel overflows across all phone and tablet viewports.
class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  final StorageService _storageService = StorageService();
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
    final score = await _storageService.getHighScore();
    setState(() {
      _highScore = score;
      _isLoaded = true;
    });
  }

  Future<void> _handleScoreUpdate(int currentScore) async {
    final updated = await _storageService.setHighScoreIfGreater(currentScore);
    if (updated) {
      setState(() {
        _highScore = currentScore;
      });
    }
  }

  void _initializeGame() {
    _game = MemoryCardGame(
      onScoreUpdate: _handleScoreUpdate,
      onGameOver: (finalScore, moves) {
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
        body: Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))),
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

            // Calculate bounded canvas width (clamped on large screens)
            final double maxCanvasWidth = math.min(availableWidth, 580.0);

            return Center(
              child: SizedBox(
                width: maxCanvasWidth,
                height: availableHeight,
                child: Column(
                  children: [
                    // Responsive Game HUD
                    GameHud(
                      movesNotifier: _game.movesNotifier,
                      scoreNotifier: _game.scoreNotifier,
                      highScore: _highScore,
                    ),

                    // Embedded Flame Canvas fitting cleanly in available space
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
}
