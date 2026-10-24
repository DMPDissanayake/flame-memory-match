import 'package:flutter/material.dart';

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
}
