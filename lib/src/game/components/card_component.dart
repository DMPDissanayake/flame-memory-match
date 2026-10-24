import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flame/events.dart';
import 'package:flutter/material.dart';
import '../../models/card_data.dart';

/// Individual 2D Card Component inside the Flame game world with responsive font scaling.
class CardComponent extends PositionComponent with TapCallbacks {
  final int cardId;
  final CardData data;
  final ValueChanged<CardComponent> onCardTapped;

  bool isFaceUp = false;
  bool isMatched = false;

  // Render Paints
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

  /// Dynamically updates card size and reclamps text painters to fit exactly within card bounds.
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

  /// Horizontal scale flip animation to reveal the card face.
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

  /// Flip card back down upon mismatch.
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

  /// Spring scale-bump animation triggered when a match occurs.
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
      // Front face
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
      // Back face
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
