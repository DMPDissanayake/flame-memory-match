import 'dart:math' as math;
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

    // Apply velocities
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;

    // Atmospheric drag & gravity
    vx *= 0.96;
    vy += 90.0 * dt; // gravity
    vz *= 0.94; // camera-depth deceleration

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

  static const double _focalLength = 260.0; // Camera perspective focal distance

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
      // 3D Spherical/Conical distribution
      // Biased toward camera (negative Z) to erupt out of the screen toward the player
      final double radialAngle = random.nextDouble() * math.pi * 2;
      final double elevationAngle = (random.nextDouble() * 0.85) + 0.15; // Cone angle toward camera

      final double speed = random.nextDouble() * 220 + 80;
      final double forwardSpeed = (random.nextDouble() * 260 + 120); // Z-speed toward camera

      final double vx = math.cos(radialAngle) * math.sin(elevationAngle) * speed;
      final double vy = math.sin(radialAngle) * math.sin(elevationAngle) * speed;
      final double vz = -math.cos(elevationAngle) * forwardSpeed; // Negative = approaching viewer

      // Varying particle color hues around theme
      final Color color = i.isEven
          ? particleColor
          : Color.lerp(particleColor, Colors.white, 0.45)!;

      _particles.add(
        _Simulated3DParticle(
          x: (random.nextDouble() - 0.5) * 8.0,
          y: (random.nextDouble() - 0.5) * 8.0,
          z: (random.nextDouble() * 15.0), // Start near card surface
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

    // Self-terminate when all particles have expired
    if (_particles.isEmpty) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    // Sort particles by Z depth (back-to-front rendering for accurate 3D overlapping)
    _particles.sort((a, b) => b.z.compareTo(a.z));

    for (final p in _particles) {
      final double progress = p.elapsed / p.maxLifespan;
      final double alpha = (1.0 - progress).clamp(0.0, 1.0);

      // 3D Perspective Projection:
      // scale = focalLength / (focalLength + z)
      // When z is negative (close to camera), scale > 1.0 (particle expands toward screen!)
      final double depthFactor = (_focalLength + p.z);
      if (depthFactor <= 20.0) continue; // Behind camera clipping

      final double perspectiveScale = (_focalLength / depthFactor).clamp(0.4, 2.5);

      final double screenX = p.x * perspectiveScale;
      final double screenY = p.y * perspectiveScale;
      final double renderedRadius = p.baseRadius * perspectiveScale;

      // Glow halo
      _glowPaint.color = p.baseColor.withOpacity(alpha * 0.35);
      canvas.drawCircle(
        Offset(screenX, screenY),
        renderedRadius * 1.8,
        _glowPaint,
      );

      // Core particle
      _particlePaint.color = p.baseColor.withOpacity(alpha * 0.95);
      canvas.drawCircle(
        Offset(screenX, screenY),
        renderedRadius,
        _particlePaint,
      );
    }
  }
}
