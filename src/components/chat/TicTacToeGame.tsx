import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';

interface Props {
  onClose: () => void;
}

type Cell = 'X' | 'O' | null;
type Winner = 'X' | 'O' | 'draw' | null;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Cell[]): Winner {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return 'draw';
  return null;
}

function cpuMove(board: Cell[]): number {
  const empty = board.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
  for (const i of empty) {
    const next = [...board];
    next[i] = 'O';
    if (checkWinner(next) === 'O') return i;
  }
  for (const i of empty) {
    const next = [...board];
    next[i] = 'X';
    if (checkWinner(next) === 'X') return i;
  }
  if (empty.includes(4)) return 4;
  const corners = empty.filter(i => [0, 2, 6, 8].includes(i));
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)] ?? -1;
}

export default function TicTacToeGame({ onClose }: Props) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<Winner>(null);
  const [vsCpu, setVsCpu] = useState(true);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinner(null);
  };

  const play = (index: number) => {
    if (winner || board[index]) return;
    if (vsCpu && turn === 'O') return;
    const next = [...board];
    next[index] = turn;
    const w = checkWinner(next);
    setBoard(next);
    if (w) setWinner(w);
    else setTurn(turn === 'X' ? 'O' : 'X');
  };

  useEffect(() => {
    if (!vsCpu || turn !== 'O' || winner) return;
    const t = setTimeout(() => {
      setBoard(prev => {
        if (checkWinner(prev)) return prev;
        const i = cpuMove(prev);
        if (i < 0) return prev;
        const next = [...prev];
        next[i] = 'O';
        const w = checkWinner(next);
        if (w) setWinner(w);
        else setTurn('X');
        return next;
      });
    }, 380);
    return () => clearTimeout(t);
  }, [turn, vsCpu, winner]);

  const status =
    winner === 'draw' ? 'Match nul !'
      : winner === 'X' ? (vsCpu ? 'Vous gagnez !' : 'Joueur ✕ gagne')
        : winner === 'O' ? (vsCpu ? 'La CPU gagne…' : 'Joueur ○ gagne')
          : vsCpu
            ? (turn === 'X' ? 'À vous (✕)' : 'CPU réfléchit…')
            : `Tour de ${turn === 'X' ? '✕' : '○'}`;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-[#0f1a24] to-[#0c1218] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <div className="text-sm font-semibold text-foreground">Morpion</div>
            <div className="text-[10px] text-muted-foreground/55">{status}</div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={reset} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5" title="Rejouer">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pt-3 flex gap-2">
          <button
            type="button"
            onClick={() => { setVsCpu(true); reset(); }}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
              vsCpu ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200' : 'border-border text-muted-foreground/60 hover:bg-white/5'
            }`}
          >
            vs CPU
          </button>
          <button
            type="button"
            onClick={() => { setVsCpu(false); reset(); }}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
              !vsCpu ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200' : 'border-border text-muted-foreground/60 hover:bg-white/5'
            }`}
          >
            À deux
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4">
          {board.map((cell, i) => (
            <button
              key={i}
              type="button"
              disabled={!!cell || !!winner || (vsCpu && turn === 'O')}
              onClick={() => play(i)}
              className="aspect-square rounded-xl border border-border bg-secondary/80 text-2xl font-bold
                flex items-center justify-center hover:border-cyan-500/40 hover:scale-[1.03] transition-all
                disabled:hover:scale-100 disabled:hover:border-border active:scale-95"
            >
              {cell === 'X' && <span className="text-cyan-300">✕</span>}
              {cell === 'O' && <span className="text-rose-300">○</span>}
            </button>
          ))}
        </div>

        {winner && (
          <div className="px-4 pb-4 text-center">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/30"
            >
              Rejouer
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
