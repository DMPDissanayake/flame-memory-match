import 'package:flutter/material.dart';
import 'src/screens/game_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const FlameMemoryGameApp());
}

/// Root application widget.
class FlameMemoryGameApp extends StatelessWidget {
  const FlameMemoryGameApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flame Memory Matcher',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF1E293B),
        ),
        fontFamily: 'Roboto',
      ),
      home: const GameScreen(),
    );
  }
}
