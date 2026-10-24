import 'package:flutter/material.dart';

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
    // Screen width check for micro-screens (< 360dp) vs standard devices
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
            // Moves Metric
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

            // Current Score Metric
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

            // High Score Metric
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
}
