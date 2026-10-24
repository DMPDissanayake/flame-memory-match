import 'dart:math' as math;
import 'package:flame/components.dart';
import 'package:flame/particles.dart';
import 'package:flutter/material.dart';

/// Spawns radiant particle bursts upon successful card matches.
class MatchParticleSpawner {
  static ParticleSystemComponent createBurst({
    required Vector2 centerPosition,
    required Color particleColor,
    int particleCount = 28,
  }) {
    final random = math.Random();
    final particle = Particle.generate(
      count: particleCount,
      lifespan: 0.65,
      generator: (i) {
        final double speed = random.nextDouble() * 180 + 60;
        final double angle = random.nextDouble() * math.pi * 2;
        final Vector2 velocity = Vector2(
          math.cos(angle) * speed,
          math.sin(angle) * speed,
        );

        return AcceleratedParticle(
          position: centerPosition.clone(),
          speed: velocity,
          acceleration: Vector2(0, 80), // Subtle downward gravity
          child: CircleParticle(
            radius: random.nextDouble() * 3.5 + 2.0,
            paint: Paint()
              ..color = particleColor.withOpacity(0.9)
              ..style = PaintingStyle.fill,
          ),
        );
      },
    );

    return ParticleSystemComponent(particle: particle);
  }
}
