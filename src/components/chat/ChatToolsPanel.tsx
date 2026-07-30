import React, { useEffect, useState } from 'react';
import { Dice5, CloudRain, Gamepad2, BellOff, Bell, Bookmark, Zap, X, Grid3X3, Heart, Flame, Lock, MessageCircleHeart } from 'lucide-react';
import {
  broadcastReactionRain,
  formatDiceResult,
  getBookmarks,
  isSalonMuted,
  rollDice,
  toggleSalonMute,
  BOOKMARKS_EVENT,
  type MessageBookmark,
} from '@/lib/funFeatures';
import { drawCoquinIcebreaker } from '@/lib/coquinFeatures';
import { usePreferences, useUser } from '@/lib/contexts';
import SpecialBadgeInline from './SpecialBadgeInline';
import MemoryGame from './MemoryGame';
import TicTacToeGame from './TicTacToeGame';
import ReflexGame from './ReflexGame';
import CoquinTruthOrDare from './CoquinTruthOrDare';
import CoquinHotSeat from './CoquinHotSeat';

interface Props {
  open: boolean;
  onClose: () => void;
  userName?: string;
  salonId: string;
  salonName?: string;
  onDiceResult: (text: string) => void;
  onReactionRain: (emoji: string) => void;
  addNotification: (n: { type: string; message: string }) => void;
}

export default function ChatToolsPanel({
  open,
  onClose,
  userName,
  salonId,
  salonName,
  onDiceResult,
  onReactionRain,
  addNotification,
}: Props) {
  const { coquinMode, isPremium, toggleCoquinMode } = usePreferences();
  const { profiles } = useUser();
  const [showMemory, setShowMemory] = useState(false);
  const [showMorpion, setShowMorpion] = useState(false);
  const [showReflex, setShowReflex] = useState(false);
  const [showTruth, setShowTruth] = useState(false);
  const [showHotSeat, setShowHotSeat] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<MessageBookmark[]>([]);
  const [muted, setMuted] = useState(() => isSalonMuted(userName, salonId));
  const [diceSides, setDiceSides] = useState(6);
  const [diceCount, setDiceCount] = useState(1);

  useEffect(() => {
    setMuted(isSalonMuted(userName, salonId));
  }, [userName, salonId]);

  useEffect(() => {
    const reload = () => setBookmarks(getBookmarks(userName));
    reload();
    window.addEventListener(BOOKMARKS_EVENT, reload);
    return () => window.removeEventListener(BOOKMARKS_EVENT, reload);
  }, [userName]);

  if (!open) return null;

  const openPremiumUpsell = () => {
    addNotification({ type: 'premium', message: '🔒 Réservé Premium — ouvrez Réglages → Premium pour débloquer le Mode coquin.' });
    window.dispatchEvent(new CustomEvent('virtuel-rt-open-settings', { detail: { tab: 'premium' } }));
    onClose();
  };

  return (
    <>
      <div className="absolute right-3 top-14 z-30 w-72 rounded-2xl border border-purple-500/30 bg-card/95 backdrop-blur-md shadow-xl shadow-purple-950/40 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-300" /> Outils du salon
          </span>
          <button type="button" onClick={onClose} className="text-muted-foreground/50 hover:text-foreground p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              if (!userName) {
                addNotification({ type: 'system', message: 'Connectez-vous pour muter un salon.' });
                return;
              }
              const next = toggleSalonMute(userName, salonId);
              setMuted(next);
              addNotification({
                type: 'system',
                message: next
                  ? `Notifications mutées pour « ${salonName || salonId} ».`
                  : `Notifications réactivées pour « ${salonName || salonId} ».`,
              });
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-white/[0.05] transition-colors"
          >
            {muted ? <BellOff className="w-4 h-4 text-amber-400" /> : <Bell className="w-4 h-4 text-muted-foreground/70" />}
            <span className="flex-1">{muted ? 'Réactiver les notifs' : 'Muter ce salon'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBookmarks(b => !b)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-white/[0.05] transition-colors"
          >
            <Bookmark className="w-4 h-4 text-rose-400" />
            <span className="flex-1">Mes favoris ({bookmarks.length})</span>
          </button>
          {showBookmarks && (
            <div className="mx-1 mb-1 max-h-36 overflow-y-auto rounded-xl border border-border bg-secondary/60 p-2 space-y-1.5">
              {bookmarks.length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 italic">Aucun favori — utilisez ★ sur un message.</p>
              )}
              {bookmarks.slice(0, 12).map(b => (
                <div key={b.id + b.savedAt} className="text-[10px] leading-snug">
                  <span className="text-purple-300 font-medium inline-flex items-center gap-1">
                    {b.author_name}
                    <SpecialBadgeInline profile={profiles[b.author_name]} size="xs" showLabels={false} />
                  </span>
                  <span className="text-muted-foreground/40"> · {b.salonName || b.salonId}</span>
                  <p className="text-muted-foreground/70 truncate">{b.text}</p>
                </div>
              ))}
            </div>
          )}

          <div className="px-2.5 py-2 rounded-xl hover:bg-white/[0.03]">
            <div className="flex items-center gap-2.5 text-xs mb-2">
              <Dice5 className="w-4 h-4 text-emerald-400" />
              <span className="flex-1 font-medium">Dés virtuels</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-[10px] text-muted-foreground/60">
                faces
                <select
                  value={diceSides}
                  onChange={e => setDiceSides(Number(e.target.value))}
                  className="ml-1 bg-background border border-border rounded px-1 py-0.5 text-[10px]"
                >
                  {[4, 6, 8, 10, 12, 20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-[10px] text-muted-foreground/60">
                nb
                <select
                  value={diceCount}
                  onChange={e => setDiceCount(Number(e.target.value))}
                  className="ml-1 bg-background border border-border rounded px-1 py-0.5 text-[10px]"
                >
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  const rolls = rollDice(diceSides, diceCount);
                  onDiceResult(formatDiceResult(rolls, diceSides));
                  onClose();
                }}
                className="ml-auto px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold hover:bg-emerald-500/25"
              >
                Lancer
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!userName) {
                addNotification({ type: 'system', message: 'Connectez-vous pour lancer une pluie.' });
                return;
              }
              const emoji = coquinMode
                ? ['💋', '🔥', '😏', '🍷', '✨'][Math.floor(Math.random() * 5)]
                : ['✨', '💜', '🎉', '⭐', '🔥'][Math.floor(Math.random() * 5)];
              broadcastReactionRain(userName, emoji);
              onReactionRain(emoji);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-white/[0.05] transition-colors"
          >
            <CloudRain className="w-4 h-4 text-sky-400" />
            <span className="flex-1">Pluie de réactions</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMemory(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-white/[0.05] transition-colors"
          >
            <Gamepad2 className="w-4 h-4 text-violet-400" />
            <span className="flex-1">Mémoire cosmique</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMorpion(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-white/[0.05] transition-colors"
          >
            <Grid3X3 className="w-4 h-4 text-cyan-400" />
            <span className="flex-1">Morpion</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReflex(true)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-white/[0.05] transition-colors"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="flex-1">Réflexe</span>
          </button>

          {/* ── Zone coquine (Premium) ── */}
          <div className="pt-1 mt-1 border-t border-rose-500/20">
            <div className="px-2.5 py-1 text-[9px] uppercase tracking-widest text-rose-300/70 font-semibold flex items-center gap-1">
              <Flame className="w-3 h-3" /> Mode coquin
              {!isPremium && <Lock className="w-3 h-3 ml-auto text-amber-400" />}
              {coquinMode && <span className="ml-auto text-[8px] px-1.5 py-px rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30">ON</span>}
            </div>

            {!coquinMode ? (
              <button
                type="button"
                onClick={() => {
                  if (!isPremium) {
                    openPremiumUpsell();
                    return;
                  }
                  toggleCoquinMode();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-rose-500/10 transition-colors text-rose-200/80"
              >
                <Lock className="w-4 h-4 text-rose-300" />
                <span className="flex-1">{isPremium ? 'Activer le Mode coquin' : 'Réservé Premium'}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowTruth(true)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-rose-500/10 transition-colors"
                >
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="flex-1">Action ou vérité coquin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHotSeat(true)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-fuchsia-500/10 transition-colors"
                >
                  <Flame className="w-4 h-4 text-fuchsia-400" />
                  <span className="flex-1">Défi coquin / Hot seat</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const line = drawCoquinIcebreaker();
                    onDiceResult(`💋 Icebreaker : ${line}`);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs hover:bg-pink-500/10 transition-colors"
                >
                  <MessageCircleHeart className="w-4 h-4 text-pink-400" />
                  <span className="flex-1">Icebreaker flirty</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showMemory && <MemoryGame onClose={() => setShowMemory(false)} />}
      {showMorpion && <TicTacToeGame onClose={() => setShowMorpion(false)} />}
      {showReflex && <ReflexGame onClose={() => setShowReflex(false)} />}
      {showTruth && coquinMode && (
        <CoquinTruthOrDare
          onClose={() => setShowTruth(false)}
          onShare={(text) => { onDiceResult(text); }}
        />
      )}
      {showHotSeat && coquinMode && (
        <CoquinHotSeat
          onClose={() => setShowHotSeat(false)}
          onShare={(text) => { onDiceResult(text); }}
        />
      )}
    </>
  );
}
