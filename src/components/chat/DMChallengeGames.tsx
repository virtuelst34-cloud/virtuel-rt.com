import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Gamepad2, Swords, Timer, Hand } from 'lucide-react';
import {
  dmGameService,
  DM_GAME_LABELS,
  type DmGamePayload,
  type DmGameType,
} from '@/lib/dmGameService';

interface Props {
  myName: string;
  myId: string;
  contactName: string;
  contactId: string;
  open: boolean;
  onClose: () => void;
  onInviteSent?: (gameType: DmGameType) => void;
  /** Invite entrante détectée hors panneau (toast / auto-open) */
  pendingInvite?: DmGamePayload | null;
  onClearPendingInvite?: () => void;
}

type Cell = 'X' | 'O' | null;
type Winner = 'X' | 'O' | 'draw' | null;
type PfcChoice = 'pierre' | 'feuille' | 'ciseaux';

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

function pfcWinner(a: PfcChoice, b: PfcChoice): 'a' | 'b' | 'draw' {
  if (a === b) return 'draw';
  if (
    (a === 'pierre' && b === 'ciseaux') ||
    (a === 'feuille' && b === 'pierre') ||
    (a === 'ciseaux' && b === 'feuille')
  ) return 'a';
  return 'b';
}

const PFC_EMOJI: Record<PfcChoice, string> = {
  pierre: '✊',
  feuille: '✋',
  ciseaux: '✌️',
};

const PFC_LABEL: Record<PfcChoice, string> = {
  pierre: 'Pierre',
  feuille: 'Feuille',
  ciseaux: 'Ciseaux',
};

type Phase =
  | 'picker'
  | 'waiting'
  | 'incoming'
  | 'playing'
  | 'ended';

export default function DMChallengeGames({
  myName,
  myId,
  contactName,
  contactId,
  open,
  onClose,
  onInviteSent,
  pendingInvite,
  onClearPendingInvite,
}: Props) {
  const [phase, setPhase] = useState<Phase>('picker');
  const [gameType, setGameType] = useState<DmGameType | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [iAmHost, setIAmHost] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const gameIdRef = useRef<string | null>(null);
  const iAmHostRef = useRef(true);
  const contactNameRef = useRef(contactName);

  // Morpion
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<Winner>(null);
  const myMark: 'X' | 'O' = iAmHost ? 'X' : 'O';

  // PFC
  const [myChoice, setMyChoice] = useState<PfcChoice | null>(null);
  const [theirChoice, setTheirChoice] = useState<PfcChoice | null>(null);
  const [pfcReveal, setPfcReveal] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [pfcRound, setPfcRound] = useState(1);
  const myChoiceRef = useRef<PfcChoice | null>(null);
  const theirChoiceRef = useRef<PfcChoice | null>(null);

  // Reflex
  const [reflexPhase, setReflexPhase] = useState<'idle' | 'wait' | 'go' | 'early' | 'done'>('idle');
  const [myMs, setMyMs] = useState<number | null>(null);
  const [theirMs, setTheirMs] = useState<number | null>(null);
  const goAtRef = useRef(0);
  const startRef = useRef(0);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { gameIdRef.current = gameId; }, [gameId]);
  useEffect(() => { iAmHostRef.current = iAmHost; }, [iAmHost]);
  useEffect(() => { contactNameRef.current = contactName; }, [contactName]);

  const broadcast = useCallback(
    (payload: Omit<DmGamePayload, 'from' | 'to' | 'fromId' | 'ts'>) => {
      dmGameService.broadcast(myId, contactId, {
        ...payload,
        from: myName,
        to: contactName,
        fromId: myId,
        ts: Date.now(),
      });
    },
    [myId, contactId, myName, contactName],
  );

  const resetBoard = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinner(null);
  };

  const resetPfcRound = () => {
    setMyChoice(null);
    setTheirChoice(null);
    setPfcReveal(false);
    myChoiceRef.current = null;
    theirChoiceRef.current = null;
  };

  const clearWait = () => {
    if (waitTimerRef.current) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  };

  const closeAll = () => {
    clearWait();
    setPhase('picker');
    setGameType(null);
    setGameId(null);
    setStatusMsg('');
    resetBoard();
    resetPfcRound();
    setMyScore(0);
    setTheirScore(0);
    setPfcRound(1);
    setReflexPhase('idle');
    setMyMs(null);
    setTheirMs(null);
    onClearPendingInvite?.();
    onClose();
  };

  // Incoming invite from parent
  useEffect(() => {
    if (!open || !pendingInvite) return;
    if (pendingInvite.event !== 'invite') return;
    if (pendingInvite.from === myName) return;
    setGameId(pendingInvite.gameId);
    setGameType(pendingInvite.gameType);
    setIAmHost(false);
    setPhase('incoming');
    setStatusMsg(`${pendingInvite.from} vous défie au ${DM_GAME_LABELS[pendingInvite.gameType]}`);
  }, [open, pendingInvite, myName]);

  useEffect(() => () => clearWait(), []);

  // Sync game events
  useEffect(() => {
    if (!open || !myId || !contactId) return;

    return dmGameService.subscribe(myId, contactId, (payload) => {
      if (payload.fromId === myId) return;

      if (payload.event === 'invite') {
        setGameId(payload.gameId);
        setGameType(payload.gameType);
        setIAmHost(false);
        setPhase('incoming');
        setStatusMsg(`${payload.from} vous défie au ${DM_GAME_LABELS[payload.gameType]}`);
        return;
      }

      if (payload.event === 'decline' || payload.event === 'cancel') {
        setStatusMsg(payload.event === 'decline' ? 'Défi refusé.' : 'Défi annulé.');
        setPhase('picker');
        setGameType(null);
        setGameId(null);
        return;
      }

      if (payload.event === 'accept') {
        if (gameIdRef.current && payload.gameId !== gameIdRef.current) return;
        setGameId(payload.gameId);
        setGameType(payload.gameType);
        setPhase('playing');
        setStatusMsg('Partie en cours');
        if (payload.gameType === 'morpion') {
          setBoard(Array(9).fill(null));
          setTurn('X');
          setWinner(null);
        }
        if (payload.gameType === 'pfc') {
          myChoiceRef.current = null;
          theirChoiceRef.current = null;
          setMyChoice(null);
          setTheirChoice(null);
          setPfcReveal(false);
          setMyScore(0);
          setTheirScore(0);
          setPfcRound(1);
        }
        if (payload.gameType === 'reflex') {
          setReflexPhase('idle');
          setMyMs(null);
          setTheirMs(null);
        }
        return;
      }

      if (gameIdRef.current && payload.gameId !== gameIdRef.current) return;

      if (payload.event === 'move' || payload.event === 'state') {
        const data = payload.data || {};
        const gt = payload.gameType;

        if (gt === 'morpion') {
          const nextBoard = (data.board as Cell[]) || Array(9).fill(null);
          const nextTurn = (data.turn as 'X' | 'O') || 'X';
          const nextWinner = (data.winner as Winner) ?? checkWinner(nextBoard);
          setBoard(nextBoard);
          setTurn(nextTurn);
          setWinner(nextWinner);
          if (nextWinner) {
            setPhase('ended');
            const mark: 'X' | 'O' = iAmHostRef.current ? 'X' : 'O';
            setStatusMsg(
              nextWinner === 'draw'
                ? 'Match nul !'
                : nextWinner === mark
                  ? 'Vous gagnez !'
                  : `${contactNameRef.current} gagne !`,
            );
          }
        }

        if (gt === 'pfc') {
          const choice = data.choice as PfcChoice | undefined;
          if (choice) {
            theirChoiceRef.current = choice;
            setTheirChoice(choice);
            if (myChoiceRef.current) {
              setPfcReveal(true);
              const result = pfcWinner(myChoiceRef.current, choice);
              if (result === 'a') setMyScore((s) => s + 1);
              else if (result === 'b') setTheirScore((s) => s + 1);
            }
          }
          if (data.nextRound) {
            myChoiceRef.current = null;
            theirChoiceRef.current = null;
            setMyChoice(null);
            setTheirChoice(null);
            setPfcReveal(false);
            setPfcRound((r) => r + 1);
          }
        }

        if (gt === 'reflex') {
          if (typeof data.goAt === 'number') {
            if (waitTimerRef.current) {
              clearTimeout(waitTimerRef.current);
              waitTimerRef.current = null;
            }
            setMyMs(null);
            setTheirMs(null);
            setReflexPhase('wait');
            goAtRef.current = data.goAt;
            const delay = Math.max(0, data.goAt - Date.now());
            waitTimerRef.current = setTimeout(() => {
              startRef.current = performance.now();
              setReflexPhase('go');
            }, delay);
          }
          if (typeof data.ms === 'number') {
            setTheirMs(data.ms);
          }
        }
      }

      if (payload.event === 'end') {
        setPhase('ended');
        setStatusMsg((payload.data?.message as string) || 'Partie terminée');
      }
    });
  }, [open, myId, contactId]);

  // Compare reflex times when both ready
  useEffect(() => {
    if (gameType !== 'reflex' || myMs == null || theirMs == null) return;
    setReflexPhase('done');
    setPhase('ended');
    if (myMs < theirMs) setStatusMsg(`Vous gagnez ! (${myMs} ms vs ${theirMs} ms)`);
    else if (theirMs < myMs) setStatusMsg(`${contactName} gagne ! (${theirMs} ms vs ${myMs} ms)`);
    else setStatusMsg(`Égalité ! (${myMs} ms)`);
  }, [myMs, theirMs, gameType, contactName]);

  const sendInvite = (type: DmGameType) => {
    const id = dmGameService.newGameId();
    setGameId(id);
    setGameType(type);
    setIAmHost(true);
    setPhase('waiting');
    setStatusMsg(`En attente de ${contactName}…`);
    resetBoard();
    resetPfcRound();
    setMyScore(0);
    setTheirScore(0);
    setPfcRound(1);
    setReflexPhase('idle');
    setMyMs(null);
    setTheirMs(null);
    broadcast({ event: 'invite', gameId: id, gameType: type });
    onInviteSent?.(type);
  };

  const acceptInvite = () => {
    if (!gameId || !gameType) return;
    broadcast({ event: 'accept', gameId, gameType });
    setPhase('playing');
    setStatusMsg('Partie en cours');
    resetBoard();
    resetPfcRound();
    setMyScore(0);
    setTheirScore(0);
    setPfcRound(1);
    onClearPendingInvite?.();
  };

  const declineInvite = () => {
    if (gameId && gameType) {
      broadcast({ event: 'decline', gameId, gameType });
    }
    setPhase('picker');
    setGameType(null);
    setGameId(null);
    onClearPendingInvite?.();
  };

  const cancelInvite = () => {
    if (gameId && gameType) {
      broadcast({ event: 'cancel', gameId, gameType });
    }
    setPhase('picker');
    setGameType(null);
    setGameId(null);
  };

  const playMorpion = (index: number) => {
    if (phase !== 'playing' || gameType !== 'morpion' || !gameId) return;
    if (winner || board[index] || turn !== myMark) return;
    const next = [...board];
    next[index] = myMark;
    const w = checkWinner(next);
    const nextTurn = myMark === 'X' ? 'O' : 'X';
    setBoard(next);
    if (w) {
      setWinner(w);
      setPhase('ended');
      setStatusMsg(
        w === 'draw' ? 'Match nul !' : w === myMark ? 'Vous gagnez !' : `${contactName} gagne !`,
      );
    } else {
      setTurn(nextTurn);
    }
    broadcast({
      event: 'move',
      gameId,
      gameType: 'morpion',
      data: { board: next, turn: w ? turn : nextTurn, winner: w, index },
    });
  };

  const playPfc = (choice: PfcChoice) => {
    if (phase !== 'playing' || gameType !== 'pfc' || !gameId || myChoice) return;
    myChoiceRef.current = choice;
    setMyChoice(choice);
    broadcast({ event: 'move', gameId, gameType: 'pfc', data: { choice } });
    if (theirChoiceRef.current) {
      setPfcReveal(true);
      const result = pfcWinner(choice, theirChoiceRef.current);
      if (result === 'a') setMyScore((s) => s + 1);
      else if (result === 'b') setTheirScore((s) => s + 1);
    }
  };

  const nextPfcRound = () => {
    if (!gameId) return;
    resetPfcRound();
    setPfcRound((r) => r + 1);
    broadcast({ event: 'state', gameId, gameType: 'pfc', data: { nextRound: true } });
  };

  const startReflexAsHost = () => {
    if (!iAmHost || !gameId || gameType !== 'reflex') return;
    const delay = 1500 + Math.random() * 2500;
    const goAt = Date.now() + delay;
    setMyMs(null);
    setTheirMs(null);
    setReflexPhase('wait');
    goAtRef.current = goAt;
    clearWait();
    waitTimerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setReflexPhase('go');
    }, delay);
    broadcast({ event: 'state', gameId, gameType: 'reflex', data: { goAt } });
  };

  const tapReflex = () => {
    if (!gameId || gameType !== 'reflex') return;
    if (reflexPhase === 'wait') {
      clearWait();
      setReflexPhase('early');
      return;
    }
    if (reflexPhase === 'go') {
      const elapsed = Math.round(performance.now() - startRef.current);
      setMyMs(elapsed);
      setReflexPhase('done');
      broadcast({ event: 'move', gameId, gameType: 'reflex', data: { ms: elapsed } });
    }
  };

  if (!open) return null;

  const games: { type: DmGameType; icon: React.ReactNode; desc: string }[] = [
    { type: 'morpion', icon: <Swords className="w-5 h-5" />, desc: 'Tour par tour en temps réel' },
    { type: 'pfc', icon: <Hand className="w-5 h-5" />, desc: 'Choix simultanés, meilleur score' },
    { type: 'reflex', icon: <Timer className="w-5 h-5" />, desc: 'Qui tape le plus vite au vert ?' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[1600] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4" onClick={closeAll}>
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-violet-500/35 bg-gradient-to-br from-[#14101c] to-[#0e0c12] shadow-2xl overflow-hidden max-h-[88dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Gamepad2 className="w-4 h-4 text-violet-300 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                {phase === 'picker' ? 'Défier / Jeux' : DM_GAME_LABELS[gameType!] || 'Jeu'}
              </div>
              <div className="text-[10px] text-muted-foreground/55 truncate">
                {statusMsg || `Contre ${contactName}`}
              </div>
            </div>
          </div>
          <button type="button" onClick={closeAll} className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-white/5 touch-target" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {phase === 'picker' && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground/60 mb-3">
                Choisissez un jeu pour défier <span className="text-foreground font-medium">{contactName}</span>.
              </p>
              {games.map((g) => (
                <button
                  key={g.type}
                  type="button"
                  onClick={() => sendInvite(g.type)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-border bg-secondary/50 hover:bg-violet-500/10 hover:border-violet-500/35 transition-all text-left touch-target"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
                    {g.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{DM_GAME_LABELS[g.type]}</div>
                    <div className="text-[10px] text-muted-foreground/55">{g.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {phase === 'waiting' && (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full border-2 border-violet-400/40 border-t-violet-300 animate-spin" />
              <p className="text-sm text-foreground">Invitation envoyée</p>
              <p className="text-[11px] text-muted-foreground/55">{statusMsg}</p>
              <button type="button" onClick={cancelInvite} className="mt-2 px-4 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground touch-target">
                Annuler
              </button>
            </div>
          )}

          {phase === 'incoming' && gameType && (
            <div className="text-center py-6 space-y-4">
              <div className="text-3xl">🎮</div>
              <p className="text-sm text-foreground font-medium">{statusMsg}</p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={acceptInvite}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm font-semibold hover:bg-emerald-500/30 touch-target"
                >
                  Accepter
                </button>
                <button
                  type="button"
                  onClick={declineInvite}
                  className="px-5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/35 text-red-300 text-sm font-semibold hover:bg-red-500/25 touch-target"
                >
                  Refuser
                </button>
              </div>
            </div>
          )}

          {(phase === 'playing' || phase === 'ended') && gameType === 'morpion' && (
            <div className="space-y-3">
              <p className="text-[11px] text-center text-muted-foreground/60">
                Vous êtes <span className="text-cyan-300 font-semibold">{myMark === 'X' ? '✕' : '○'}</span>
                {phase === 'playing' && !winner && (
                  <> · {turn === myMark ? 'À vous' : `Tour de ${contactName}`}</>
                )}
              </p>
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                {board.map((cell, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={phase !== 'playing' || !!cell || !!winner || turn !== myMark}
                    onClick={() => playMorpion(i)}
                    className="aspect-square rounded-xl border border-border bg-secondary/80 text-2xl font-bold
                      flex items-center justify-center hover:border-violet-500/40 active:scale-95 transition-all
                      disabled:opacity-80 touch-target"
                  >
                    {cell === 'X' && <span className="text-cyan-300">✕</span>}
                    {cell === 'O' && <span className="text-rose-300">○</span>}
                  </button>
                ))}
              </div>
              {phase === 'ended' && (
                <div className="text-center space-y-2">
                  <p className="text-sm font-semibold text-foreground">{statusMsg}</p>
                  <button type="button" onClick={() => { setPhase('picker'); setGameType(null); setGameId(null); }} className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-200 text-xs font-semibold touch-target">
                    Retour aux jeux
                  </button>
                </div>
              )}
            </div>
          )}

          {(phase === 'playing' || phase === 'ended') && gameType === 'pfc' && (
            <div className="space-y-4">
              <div className="flex justify-between text-[11px] px-1">
                <span className="text-foreground font-medium">Vous {myScore}</span>
                <span className="text-muted-foreground/50">Manche {pfcRound}</span>
                <span className="text-foreground font-medium">{contactName} {theirScore}</span>
              </div>
              <div className="flex justify-center gap-6 py-2">
                <div className="text-center">
                  <div className="text-4xl mb-1">{myChoice && (pfcReveal || theirChoice) ? PFC_EMOJI[myChoice] : myChoice ? '❓' : '❔'}</div>
                  <div className="text-[10px] text-muted-foreground/55">Vous</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-1">{pfcReveal && theirChoice ? PFC_EMOJI[theirChoice] : theirChoice || myChoice ? '❓' : '❔'}</div>
                  <div className="text-[10px] text-muted-foreground/55 truncate max-w-[80px]">{contactName}</div>
                </div>
              </div>
              {pfcReveal && myChoice && theirChoice && (
                <p className="text-center text-sm font-semibold text-foreground">
                  {(() => {
                    const r = pfcWinner(myChoice, theirChoice);
                    if (r === 'draw') return 'Égalité !';
                    if (r === 'a') return 'Vous marquez !';
                    return `${contactName} marque !`;
                  })()}
                </p>
              )}
              {phase === 'playing' && !myChoice && (
                <div className="grid grid-cols-3 gap-2">
                  {(['pierre', 'feuille', 'ciseaux'] as PfcChoice[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => playPfc(c)}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl border border-border bg-secondary/60 hover:border-violet-500/40 hover:bg-violet-500/10 touch-target"
                    >
                      <span className="text-2xl">{PFC_EMOJI[c]}</span>
                      <span className="text-[10px] text-muted-foreground/70">{PFC_LABEL[c]}</span>
                    </button>
                  ))}
                </div>
              )}
              {phase === 'playing' && myChoice && !pfcReveal && (
                <p className="text-center text-[11px] text-muted-foreground/55 animate-pulse">
                  En attente du choix de {contactName}…
                </p>
              )}
              {phase === 'playing' && pfcReveal && (
                <div className="text-center">
                  <button type="button" onClick={nextPfcRound} className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-200 text-xs font-semibold touch-target">
                    Manche suivante
                  </button>
                </div>
              )}
              {phase === 'ended' && (
                <div className="text-center">
                  <button type="button" onClick={() => { setPhase('picker'); setGameType(null); setGameId(null); }} className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-200 text-xs font-semibold touch-target">
                    Retour aux jeux
                  </button>
                </div>
              )}
            </div>
          )}

          {(phase === 'playing' || phase === 'ended') && gameType === 'reflex' && (
            <div className="space-y-3">
              {iAmHost && reflexPhase === 'idle' && phase === 'playing' && (
                <button
                  type="button"
                  onClick={startReflexAsHost}
                  className="w-full py-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm font-semibold touch-target"
                >
                  Lancer le signal
                </button>
              )}
              {!iAmHost && reflexPhase === 'idle' && phase === 'playing' && (
                <p className="text-center text-[11px] text-muted-foreground/55 animate-pulse">
                  En attente que {contactName} lance le signal…
                </p>
              )}
              {(reflexPhase === 'wait' || reflexPhase === 'go' || reflexPhase === 'early' || reflexPhase === 'done') && (
                <button
                  type="button"
                  onClick={tapReflex}
                  disabled={reflexPhase === 'done' || phase === 'ended'}
                  className={`w-full aspect-[4/3] rounded-2xl border-2 flex flex-col items-center justify-center gap-2
                    transition-all active:scale-[0.98] select-none touch-manipulation
                    ${reflexPhase === 'go' ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
                      : reflexPhase === 'wait' ? 'bg-rose-500/15 border-rose-400/35 text-rose-200'
                        : reflexPhase === 'early' ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                          : 'bg-sky-500/15 border-sky-400/40 text-sky-200'}`}
                >
                  <span className="text-2xl font-bold">
                    {reflexPhase === 'wait' ? 'Attendez le vert…'
                      : reflexPhase === 'go' ? 'TAP !'
                        : reflexPhase === 'early' ? 'Trop tôt !'
                          : myMs != null ? `${myMs} ms` : '…'}
                  </span>
                  {theirMs != null && (
                    <span className="text-[11px] opacity-70">{contactName} : {theirMs} ms</span>
                  )}
                </button>
              )}
              {phase === 'ended' && (
                <div className="text-center space-y-2">
                  <p className="text-sm font-semibold text-foreground">{statusMsg}</p>
                  <button type="button" onClick={() => { setPhase('picker'); setGameType(null); setGameId(null); setReflexPhase('idle'); }} className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-200 text-xs font-semibold touch-target">
                    Retour aux jeux
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
