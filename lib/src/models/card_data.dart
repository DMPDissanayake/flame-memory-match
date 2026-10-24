import 'package:flutter/material.dart';

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
}
