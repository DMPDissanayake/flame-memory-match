import 'package:shared_preferences/shared_preferences.dart';

/// Service managing persistent game data (e.g. High Scores) via SharedPreferences.
class StorageService {
  static const String _highScoreKey = 'memory_high_score';

  /// Loads the saved high score. Returns 0 if none is found.
  Future<int> getHighScore() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_highScoreKey) ?? 0;
  }

  /// Updates high score if [newScore] exceeds the current record.
  /// Returns `true` if a new record was established.
  Future<bool> setHighScoreIfGreater(int newScore) async {
    final currentHigh = await getHighScore();
    if (newScore > currentHigh) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_highScoreKey, newScore);
      return true;
    }
    return false;
  }
}
