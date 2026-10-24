import 'dart:math' as math;
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

  /// Recalculates card boundaries and scales text painters proportionally.
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

  /// Trigger 3D flip to face-up.
  void flipFaceUp() {
    if (_state != CardState.faceDown) return;
    _state = CardState.flippingUp;
    _flipElapsed = 0.0;
  }

  /// Trigger 3D flip back down upon mismatch.
  void flipFaceDown() {
    if (_state != CardState.faceUp) return;
    _state = CardState.flippingDown;
    _flipElapsed = 0.0;
  }

  /// Celebrates a match with a spring scale pulse.
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
      // Simulated Z-axis elevation lift (card rises toward camera as it flips)
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
      // Elastic spring bounce
      _scaleBonus = 1.0 + (math.sin(phase * math.pi) * 0.18);
    } else if (_scaleBonus != 1.0) {
      _scaleBonus = 1.0;
    }
  }

  @override
  void onTapDown(TapDownEvent event) {
    super.onTapDown(event);
    // Ignore clicks if currently in-flight or already face up / matched
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

    // 1. Draw Simulated 3D Cast Shadow (scales and softens as card lifts)
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

    // Dynamic Lift scaling
    final double totalScale = (1.0 + _cardLift) * _scaleBonus;
    canvas.scale(totalScale, totalScale);

    // 3D Perspective Matrix projection
    final Matrix4 perspectiveMatrix = Matrix4.identity()
      ..setEntry(3, 2, 0.0016) // Vanishing perspective depth
      ..rotateY(_rotationAngle);

    canvas.transform(perspectiveMatrix.storage);
    canvas.translate(-halfWidth, -halfHeight);

    // 3. Render Appropriate Face Side (Front vs Back)
    final bool isFrontFacing = _rotationAngle >= (math.pi / 2);

    if (isFrontFacing) {
      // Counter-rotate 180 degrees so front content reads right-side up
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

    // Subtle decorative inner frame
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

  /// Renders specular sweep and edge darkening simulating real 3D light reflection.
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
}
