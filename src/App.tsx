/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Download,
  Code2,
  Gamepad2,
  Zap,
  Touchpad,
  Layers,
  ChevronRight,
  Flame as FlameIcon,
  BookOpen,
  FileCode,
  FolderTree,
  Folder,
  File,
} from 'lucide-react';
import { MODULAR_FLUTTER_PROJECT, ProjectFile } from './flutterModularCode';
import { sounds } from './soundEngine';

interface CardItem {
  id: number;
  pairId: number;
  symbol: string;
  label: string;
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

const MASTER_FLAME_PAIRS = [
  { pairId: 0, symbol: '⚡', label: 'Thunder', color: '#F59E0B' },
  { pairId: 1, symbol: '💎', label: 'Diamond', color: '#06B6D4' },
  { pairId: 2, symbol: '🚀', label: 'Rocket', color: '#EF4444' },
  { pairId: 3, symbol: '❤️', label: 'Heart', color: '#EC4899' },
  { pairId: 4, symbol: '⭐', label: 'Star', color: '#EAB308' },
  { pairId: 5, symbol: '🍀', label: 'Clover', color: '#10B981' },
  { pairId: 6, symbol: '🎮', label: 'Arcade', color: '#8B5CF6' },
  { pairId: 7, symbol: '🔥', label: 'Flame', color: '#F97316' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'architecture'>('simulator');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [firstSelectedIdx, setFirstSelectedIdx] = useState<number | null>(null);
  const [, setSecondSelectedIdx] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // HUD stats
  const [moves, setMoves] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('flame_memory_high_score');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Active file in modular browser
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [fileFilter, setFileFilter] = useState<string>('');

  // 2D Particle System for Flame ParticleSystemComponent simulation
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize board
  const startNewGame = () => {
    setMoves(0);
    setScore(0);
    setFirstSelectedIdx(null);
    setSecondSelectedIdx(null);
    setIsProcessing(false);
    setIsGameOver(false);
    setParticles([]);

    const newCards: CardItem[] = [];
    let id = 0;

    MASTER_FLAME_PAIRS.forEach((item) => {
      newCards.push({
        id: id++,
        pairId: item.pairId,
        symbol: item.symbol,
        label: item.label,
        color: item.color,
        isFlipped: false,
        isMatched: false,
      });
      newCards.push({
        id: id++,
        pairId: item.pairId,
        symbol: item.symbol,
        label: item.label,
        color: item.color,
        isFlipped: false,
        isMatched: false,
      });
    });

    for (let i = newCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
    }

    setCards(newCards);
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const updateScoreAndHighScore = (newScore: number) => {
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        localStorage.setItem('flame_memory_high_score', newScore.toString());
      } catch {
        // Storage not available
      }
    }
  };

  // Particle loop
  useEffect(() => {
    if (particles.length === 0) return;

    let animId: number;
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.18,
            alpha: Math.max(0, p.alpha - 0.035),
            life: p.life + 1,
          }))
          .filter((p) => p.alpha > 0 && p.life < p.maxLife);

        next.forEach((p) => {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        return next;
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [particles.length]);

  const spawnParticleBurst = (clientX: number, clientY: number, color: string) => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const newParticles: Particle[] = [];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      newParticles.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 2,
        alpha: 1,
        life: 0,
        maxLife: 35,
      });
    }

    setParticles((prev) => [...prev, ...newParticles]);
  };

  const handleCardTap = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (isProcessing) return;
    const card = cards[index];
    if (card.isFlipped || card.isMatched) return;

    sounds.playFlip();

    const updated = [...cards];
    updated[index] = { ...card, isFlipped: true };
    setCards(updated);

    if (firstSelectedIdx === null) {
      setFirstSelectedIdx(index);
    } else {
      const firstIdx = firstSelectedIdx;
      setSecondSelectedIdx(index);
      setMoves((m) => m + 1);
      setIsProcessing(true);

      const firstCard = updated[firstIdx];
      const secondCard = updated[index];

      if (firstCard.pairId === secondCard.pairId) {
        sounds.playMatch();
        const newScore = score + 100;
        updateScoreAndHighScore(newScore);

        updated[firstIdx] = { ...firstCard, isMatched: true };
        updated[index] = { ...secondCard, isMatched: true };
        setCards(updated);

        spawnParticleBurst(e.clientX, e.clientY, secondCard.color);

        setFirstSelectedIdx(null);
        setSecondSelectedIdx(null);
        setIsProcessing(false);

        if (updated.every((c) => c.isMatched)) {
          sounds.playVictory();
          setTimeout(() => {
            setIsGameOver(true);
          }, 500);
        }
      } else {
        sounds.playMismatch();
        const penalized = Math.max(0, score - 15);
        updateScoreAndHighScore(penalized);

        setTimeout(() => {
          setCards((prev) => {
            const next = [...prev];
            next[firstIdx] = { ...next[firstIdx], isFlipped: false };
            next[index] = { ...next[index], isFlipped: false };
            return next;
          });
          setFirstSelectedIdx(null);
          setSecondSelectedIdx(null);
          setIsProcessing(false);
        }, 1000);
      }
    }
  };

  const handleCopyFileCode = async (file: ProjectFile) => {
    try {
      await navigator.clipboard.writeText(file.code);
      setCopiedFile(file.path);
      setTimeout(() => setCopiedFile(null), 2200);
    } catch {
      // Ignored
    }
  };

  const handleDownloadActiveFile = (file: ProjectFile) => {
    const filename = file.path.split('/').pop() || 'file.dart';
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  };

  const matchedCount = cards.filter((c) => c.isMatched).length / 2;
  const activeFile = MODULAR_FLUTTER_PROJECT[selectedFileIndex] || MODULAR_FLUTTER_PROJECT[0];

  const filteredFiles = MODULAR_FLUTTER_PROJECT.filter((f) =>
    f.path.toLowerCase().includes(fileFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract (3 Zones) */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/20">
            <FlameIcon className="w-4 h-4 fill-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            Flame Memory Matcher · Modular Architecture
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              activeTab === 'simulator' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Flame 2D Canvas
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              activeTab === 'code' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Modular Project Tree
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              activeTab === 'architecture' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Flame ECS & Guide
          </button>
        </nav>

        {/* Zone 3: Primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleCopyFileCode(activeFile)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedFile === activeFile.path ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedFile === activeFile.path ? 'Copied File' : `Copy ${activeFile.path.split('/').pop()}`}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Modular Flutter Architecture</span>
            <span aria-hidden="true">·</span>
            <span>flame: ^1.18.0</span>
            <span aria-hidden="true">·</span>
            <span>shared_preferences</span>
            <span aria-hidden="true">·</span>
            <span>10 Decoupled Files</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Canvas Game</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'code'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Project Files</span>
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architecture</span>
            </button>
          </div>
        </div>

        {/* TAB 1: CANVAS SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 flex flex-col items-center">
              <div className="w-full max-w-[560px] bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl shadow-black/60 relative overflow-hidden">
                <canvas
                  ref={particleCanvasRef}
                  width={560}
                  height={560}
                  className="absolute inset-0 pointer-events-none z-20"
                />

                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                      <FlameIcon className="w-4 h-4 fill-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-tight">GameWidget Canvas</h2>
                      <p className="text-[11px] text-slate-400">PositionComponent · Vector2 · TapCallbacks</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSound}
                      title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={startNewGame}
                      title="Reset Board"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restart</span>
                    </button>
                  </div>
                </div>

                {/* HUD */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 mb-4">
                  <div className="flex items-center gap-2 px-2">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Touchpad className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Moves</div>
                      <div className="text-lg font-bold text-white font-mono tabular-nums leading-tight">{moves}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-2 border-x border-slate-800/80">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Score</div>
                      <div className="text-lg font-bold text-white font-mono tabular-nums leading-tight">{score}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">High Score</div>
                      <div className="text-lg font-bold text-white font-mono tabular-nums leading-tight">{highScore}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mb-3">
                  <span>
                    Matched: <strong className="text-slate-200">{matchedCount}</strong> / 8 pairs
                  </span>
                  <span>
                    Status: <strong className="text-indigo-400">{isProcessing ? 'Checking Pair...' : 'Ready'}</strong>
                  </span>
                </div>

                {/* 4x4 Grid */}
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 select-none relative z-10 aspect-square">
                  {cards.map((card, index) => {
                    const isRevealed = card.isFlipped || card.isMatched;

                    return (
                      <div
                        key={card.id}
                        onClick={(e) => handleCardTap(index, e)}
                        className={`aspect-square w-full cursor-pointer relative transition-transform duration-200 active:scale-95 ${
                          card.isMatched ? 'cursor-default' : ''
                        }`}
                      >
                        <div
                          style={{
                            transform: isRevealed
                              ? card.isMatched
                                ? 'scale(1.05)'
                                : 'scale(1)'
                              : 'scale(1)',
                            transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                            borderColor: isRevealed ? (card.isMatched ? card.color : `${card.color}99`) : undefined,
                            boxShadow: card.isMatched ? `0 0 16px ${card.color}55` : undefined,
                          }}
                          className={`w-full h-full rounded-2xl flex flex-col items-center justify-center p-2 border transition-all ${
                            isRevealed
                              ? card.isMatched
                                ? 'bg-slate-900 border-2 shadow-lg'
                                : 'bg-slate-800 border-slate-600'
                              : 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600/50 hover:border-indigo-400/60 shadow-md'
                          }`}
                        >
                          {isRevealed ? (
                            <>
                              <span className="text-3xl leading-none">{card.symbol}</span>
                              <span
                                className="text-[10px] font-semibold mt-1 tracking-wide truncate max-w-full text-center"
                                style={{ color: card.color }}
                              >
                                {card.label}
                              </span>
                            </>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900/40 border border-slate-600/40 flex items-center justify-center text-slate-400 group-hover:text-indigo-300">
                              <span className="font-bold text-xs">?</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Victory Dialog */}
                {isGameOver && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex items-center justify-center p-6 z-30 animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-6 text-center shadow-2xl">
                      <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
                        <Trophy className="w-8 h-8" />
                      </div>

                      <h3 className="text-xl font-bold text-white tracking-tight mb-1">
                        Board Cleared!
                      </h3>
                      <p className="text-xs text-slate-400 mb-4">
                        {score >= highScore
                          ? 'New High Score saved to SharedPreferences!'
                          : 'All 8 card pairs matched successfully.'}
                      </p>

                      <div className="grid grid-cols-3 gap-2 bg-slate-950 rounded-xl p-3 mb-5 border border-slate-800">
                        <div>
                          <div className="text-[10px] uppercase font-semibold text-slate-400">Moves</div>
                          <div className="text-base font-bold text-white font-mono tabular-nums">{moves}</div>
                        </div>
                        <div className="border-x border-slate-800">
                          <div className="text-[10px] uppercase font-semibold text-slate-400">Score</div>
                          <div className="text-base font-bold text-white font-mono tabular-nums">{score}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-semibold text-slate-400">Best</div>
                          <div className="text-base font-bold text-white font-mono tabular-nums">{highScore}</div>
                        </div>
                      </div>

                      <button
                        onClick={startNewGame}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Play Again</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Modular Architecture Summary */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <FolderTree className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Project Structure</h3>
                </div>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed">
                  <div className="text-indigo-400 font-bold">lib/</div>
                  <div>├── <span className="text-emerald-400">main.dart</span></div>
                  <div>└── <span className="text-indigo-400">src/</span></div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;├── <span className="text-amber-400">models/</span> (card_data.dart)</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;├── <span className="text-blue-400">services/</span> (storage_service.dart)</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;├── <span className="text-orange-400">game/</span> (memory_card_game.dart)</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── components/ (card_component.dart)</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── effects/ (match_particles.dart)</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;├── <span className="text-purple-400">widgets/</span> (game_hud, game_over)</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;└── <span className="text-cyan-400">screens/</span> (game_screen.dart)</div>
                  <div className="text-slate-500 pt-1">pubspec.yaml (flame, shared_preferences)</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-2">Architectural Highlights</h3>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Separation of Concerns:</strong> Flame game loop is completely decoupled from Flutter UI widgets.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Null Safety & Typing:</strong> Strictly typed domain models with immutable parameters.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span><strong>Reactivity:</strong> ValueNotifiers avoid rebuilding entire widget trees.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MODULAR FILE BROWSER */}
        {activeTab === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: File Tree Directory */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <FolderTree className="w-4 h-4 text-indigo-400" />
                  <span>Project Explorer</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">10 files</span>
              </div>

              <input
                type="text"
                placeholder="Filter files..."
                value={fileFilter}
                onChange={(e) => setFileFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <div className="space-y-1 max-h-[580px] overflow-y-auto pr-1">
                {filteredFiles.map((file) => {
                  const originalIndex = MODULAR_FLUTTER_PROJECT.findIndex((f) => f.path === file.path);
                  const isSelected = selectedFileIndex === originalIndex;

                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFileIndex(originalIndex)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 text-white'
                          : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {file.path.endsWith('.yaml') ? (
                          <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <File className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                        <span className="text-xs font-mono truncate">{file.path}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">
                        {file.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Code Viewer for Active File */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-indigo-400">{activeFile.path}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {activeFile.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{activeFile.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyFileCode(activeFile)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedFile === activeFile.path ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedFile === activeFile.path ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadActiveFile(activeFile)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                  <span>{activeFile.path}</span>
                  <span>{activeFile.code.split('\n').length} lines</span>
                </div>
                <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto leading-relaxed">
                  <table className="w-full border-collapse">
                    <tbody>
                      {activeFile.code.split('\n').map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="text-slate-600 select-none pr-4 text-right align-top w-12 font-mono tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="text-slate-200 whitespace-pre font-mono">
                            {line.startsWith('//') ? (
                              <span className="text-slate-500 italic">{line}</span>
                            ) : line.includes('import ') ? (
                              <span className="text-indigo-400">{line}</span>
                            ) : line.includes('class ') ? (
                              <span className="text-emerald-400 font-bold">{line}</span>
                            ) : (
                              <span>{line}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Modular Architecture Guide</h2>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                By organizing the codebase into distinct layers (Domain Models, Services, Game Engine Components, Flutter Widgets, and Screen Coordinators), each unit can be independently unit-tested, extended with sound/asset loaders, or swapped with new themes without breaking other components.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="font-bold text-emerald-400 mb-1">1. Domain Models</div>
                  <p className="text-slate-400">
                    <code className="text-slate-200">card_data.dart</code> holds pure, immutable data for symbols, theme colors, and pair IDs.
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="font-bold text-amber-400 mb-1">2. Flame Game Engine</div>
                  <p className="text-slate-400">
                    <code className="text-slate-200">memory_card_game.dart</code>, components, and particle spawners handle the 60fps canvas loop.
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="font-bold text-blue-400 mb-1">3. Services & Widgets</div>
                  <p className="text-slate-400">
                    <code className="text-slate-200">storage_service.dart</code> and HUD widgets interact with Flutter via ValueNotifiers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-900/30 text-xs text-slate-500 py-4 px-6 text-center">
        <span>Refactored Modular Flutter Flame Memory Game · Clean Scalable Project Structure</span>
      </footer>
    </div>
  );
}
