import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, ArrowRight, Brain, Trophy, Users, X } from 'lucide-react';
import { useUser, usePreferences } from '@/lib/contexts';
import {
  quizRealtimeService,
  QuizEvent,
  formatQuizAnswerMessage,
} from '@/lib/quizRealtimeService';
import {
  QUIZ_THEMES,
  type Quiz,
  type QuizPresetId,
  type QuizQuestion,
  type QuizParticipant,
  type QuizLiveAnswer,
} from '@/lib/quiz';

interface QuizPanelProps {
  salonId: string;
  onClose?: () => void;
  onAnswerPosted?: (text: string) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function mergeAnswers(existing: QuizLiveAnswer[], incoming: QuizLiveAnswer[]): QuizLiveAnswer[] {
  const map = new Map(existing.map(a => [`${a.userId}:${a.questionId}`, a]));
  for (const a of incoming) map.set(`${a.userId}:${a.questionId}`, a);
  return Array.from(map.values());
}

export default function QuizPanel({ salonId, onClose, onAnswerPosted }: QuizPanelProps) {
  const { user } = useUser();
  const { coquinMode, isPremium } = usePreferences();
  const userId = user?.name || '';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [displayQuestion, setDisplayQuestion] = useState<QuizQuestion | null>(null);
  const [leaderboard, setLeaderboard] = useState<QuizParticipant[]>([]);
  const [liveAnswers, setLiveAnswers] = useState<QuizLiveAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(true);

  const questionIndexRef = useRef<number>(-1);
  const postedAnswersRef = useRef<Set<string>>(new Set());

  const applyQuestion = useCallback((activeQuiz: Quiz, answers?: QuizLiveAnswer[]) => {
    const idx = activeQuiz.currentQuestionIndex;
    const q = activeQuiz.questions[idx];
    if (!q) return;

    if (idx !== questionIndexRef.current) {
      questionIndexRef.current = idx;
      setDisplayQuestion(q);
      setSelected(null);
      setHasSubmitted(false);
      setFeedback(null);
      postedAnswersRef.current = new Set();
    }

    const questionAnswers =
      answers?.filter(a => a.questionId === q.id) ??
      quizRealtimeService.getAnswersForQuestion(activeQuiz.id, q.id);
    setLiveAnswers(questionAnswers);

    if (userId && quizRealtimeService.hasUserAnswered(activeQuiz.id, userId, q.id)) {
      const mine = questionAnswers.find(a => a.userId === userId);
      if (mine) {
        setSelected(mine.answerIndex);
        setHasSubmitted(true);
      }
    }
  }, [userId]);

  const refreshQuiz = useCallback(async () => {
    const active = await quizRealtimeService.getActiveQuiz(salonId);
    setQuiz(active);
    if (active) {
      setShowThemePicker(false);
      applyQuestion(active);
      setLeaderboard(quizRealtimeService.getLeaderboard(active.id));
    } else {
      setDisplayQuestion(null);
      setLiveAnswers([]);
      questionIndexRef.current = -1;
      setShowThemePicker(true);
    }
  }, [salonId, applyQuestion]);

  useEffect(() => { void refreshQuiz(); }, [refreshQuiz]);

  const postAnswerToSalon = useCallback((answer: QuizLiveAnswer) => {
    const key = `${answer.userId}:${answer.questionId}`;
    if (postedAnswersRef.current.has(key)) return;
    postedAnswersRef.current.add(key);
    onAnswerPosted?.(formatQuizAnswerMessage(answer));
  }, [onAnswerPosted]);

  useEffect(() => {
    return quizRealtimeService.subscribe(salonId, (event: QuizEvent) => {
      if (event.type === 'quiz_started') {
        setShowThemePicker(false);
        setQuiz(event.quiz);
        applyQuestion(event.quiz);
        setLeaderboard(quizRealtimeService.getLeaderboard(event.quiz.id));
      }

      if (event.type === 'quiz_updated') {
        setQuiz(event.quiz);
        setLeaderboard(quizRealtimeService.getLeaderboard(event.quiz.id));

        if (event.quiz.isActive) {
          setShowThemePicker(false);
          const idxChanged = event.questionIndex !== questionIndexRef.current;
          if (idxChanged) {
            applyQuestion(event.quiz);
          } else if (displayQuestion) {
            const answers = quizRealtimeService.getAnswersForQuestion(
              event.quiz.id,
              displayQuestion.id,
            );
            setLiveAnswers(prev => mergeAnswers(prev, answers));
            for (const a of answers) postAnswerToSalon(a);
          }
        }
      }

      if (event.type === 'quiz_ended') {
        setLeaderboard(event.result.participants);
        setFeedback(`Gagnant : ${event.result.winner?.userName ?? '—'}`);
        setQuiz(null);
        setDisplayQuestion(null);
        setLiveAnswers([]);
        questionIndexRef.current = -1;
        setShowThemePicker(true);
      }

      if (event.type === 'answer_submitted') {
        setLiveAnswers(prev => mergeAnswers(prev, [event.answer]));
        if (quiz) {
          setLeaderboard(quizRealtimeService.getLeaderboard(quiz.id));
        }
        postAnswerToSalon(event.answer);
      }
    });
  }, [salonId, quiz, displayQuestion, applyQuestion, postAnswerToSalon]);

  const startPreset = async (preset: QuizPresetId) => {
    if (!user?.name) return;
    const theme = QUIZ_THEMES.find(t => t.id === preset);
    if (theme?.premiumOnly && !(coquinMode && isPremium)) {
      setFeedback('🔒 Quiz Coquin réservé au Mode coquin Premium.');
      return;
    }
    setCreating(true);
    setFeedback(null);

    if (quiz) {
      await quizRealtimeService.endQuiz(quiz.id, salonId);
      setQuiz(null);
      setDisplayQuestion(null);
      setLiveAnswers([]);
      questionIndexRef.current = -1;
    }

    const created = await quizRealtimeService.createPresetQuiz(salonId, user.name, preset);
    if (created) {
      await quizRealtimeService.startQuiz(created.id);
      setShowThemePicker(false);
    }
    setCreating(false);
  };

  const goBackToThemes = async () => {
    if (quiz) {
      await quizRealtimeService.endQuiz(quiz.id, salonId);
      setQuiz(null);
      setDisplayQuestion(null);
      setLiveAnswers([]);
      setSelected(null);
      setHasSubmitted(false);
      setFeedback(null);
      questionIndexRef.current = -1;
    }
    setShowThemePicker(true);
  };

  const submitAnswer = async () => {
    if (!quiz || !displayQuestion || selected === null || !user?.name || hasSubmitted) return;

    const result = await quizRealtimeService.submitAnswer(
      quiz.id, salonId, user.name, user.name, displayQuestion.id, selected,
    );

    if (result.alreadyAnswered) {
      setHasSubmitted(true);
      return;
    }

    setHasSubmitted(true);
    if (result.liveAnswer) {
      setLiveAnswers(prev => mergeAnswers(prev, [result.liveAnswer!]));
      postAnswerToSalon(result.liveAnswer);
    }
    setLeaderboard(quizRealtimeService.getLeaderboard(quiz.id));
    setFeedback(
      result.isCorrect
        ? `✓ +${result.pointsEarned} pts`
        : result.isLate
          ? 'Trop tard !'
          : '✗ Incorrect',
    );
  };

  const goNextQuestion = async () => {
    if (!quiz || advancing) return;
    setAdvancing(true);
    const next = await quizRealtimeService.nextQuestion(quiz.id, salonId);
    if (!next) {
      await quizRealtimeService.endQuiz(quiz.id, salonId);
    } else {
      const active = await quizRealtimeService.getActiveQuiz(salonId);
      if (active) {
        setQuiz(active);
        applyQuestion(active);
        setLeaderboard(quizRealtimeService.getLeaderboard(active.id));
      }
    }
    setAdvancing(false);
  };

  const progress = quiz
    ? { current: quiz.currentQuestionIndex + 1, total: quiz.questions.length }
    : null;
  const isLastQuestion = quiz ? quiz.currentQuestionIndex >= quiz.questions.length - 1 : false;
  const showPicker = showThemePicker || !quiz;

  return (
    <div className="border-b border-border bg-card/80 px-4 py-3 shrink-0" data-testid="quiz-panel">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground min-w-0">
          {!showPicker && (
            <button
              type="button"
              onClick={() => void goBackToThemes()}
              className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
              title="Changer de thème"
              aria-label="Revenir au choix du thème"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Brain className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">Quiz en direct</span>
          {quiz && (
            <span className="text-[10px] font-normal text-muted-foreground truncate">
              — {quiz.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {progress && !showPicker && (
            <span className="text-[10px] text-muted-foreground tabular-nums px-1.5 py-0.5 rounded bg-secondary">
              {progress.current}/{progress.total}
            </span>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Fermer le quiz">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showPicker && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">Choisis un thème pour démarrer :</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {QUIZ_THEMES.filter(t => !t.premiumOnly || (coquinMode && isPremium)).map(theme => (
              <button
                key={theme.id}
                type="button"
                disabled={creating || !user}
                onClick={() => void startPreset(theme.id)}
                className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg border text-left disabled:opacity-50 transition-colors ${
                  theme.premiumOnly
                    ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                    : 'bg-primary/10 border-primary/25 hover:bg-primary/20'
                }`}
              >
                <span className="text-sm leading-none">{theme.emoji} <span className={`text-xs font-medium ${theme.premiumOnly ? 'text-rose-300' : 'text-primary'}`}>{theme.label}</span></span>
                <span className="text-[9px] text-muted-foreground">{theme.description}</span>
              </button>
            ))}
            {QUIZ_THEMES.some(t => t.premiumOnly) && !(coquinMode && isPremium) && (
              <div className="col-span-2 sm:col-span-4 text-[10px] text-rose-300/70 px-1 py-1 flex items-center gap-1.5">
                💋 Quiz Coquin masqué — activez le Mode coquin Premium (Apparence).
              </div>
            )}
          </div>
          {!user && (
            <p className="text-[10px] text-amber-400">Connecte-toi pour lancer un quiz.</p>
          )}
        </div>
      )}

      {!showPicker && quiz && displayQuestion && (
        <div className="space-y-2">
          {progress && (
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary/70 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          )}
          <p className="text-sm text-foreground font-medium">{displayQuestion.question}</p>
          <p className="text-[10px] text-muted-foreground">
            {displayQuestion.points} pts · {displayQuestion.timeLimit}s
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {displayQuestion.options.map((opt, i) => {
              const showCorrect = hasSubmitted && i === displayQuestion.correctAnswer;
              const showWrong = hasSubmitted && selected === i && i !== displayQuestion.correctAnswer;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={hasSubmitted}
                  onClick={() => !hasSubmitted && setSelected(i)}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors disabled:cursor-not-allowed ${
                    showCorrect
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : showWrong
                        ? 'bg-red-500/15 border-red-500/40 text-red-300'
                        : selected === i
                          ? 'bg-primary/20 border-primary/50 text-foreground'
                          : 'bg-secondary border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <span className="font-semibold text-[10px] text-muted-foreground mr-1.5">{OPTION_LETTERS[i]}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {!hasSubmitted ? (
            <button
              type="button"
              onClick={() => void submitAnswer()}
              disabled={selected === null}
              className="w-full py-2 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
            >
              Valider
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void goBackToThemes()}
                className="flex-1 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                Changer de thème
              </button>
              <button
                type="button"
                onClick={() => void goNextQuestion()}
                disabled={advancing}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isLastQuestion ? 'Terminer' : 'Suivante'}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {liveAnswers.length > 0 && !showPicker && (
        <div className="mt-2 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Users className="w-3 h-3" /> Réponses
          </div>
          {liveAnswers.map(a => (
            <div key={`${a.userId}-${a.createdAt}`} className="flex justify-between text-xs py-0.5">
              <span className="text-foreground truncate">{a.userName}</span>
              <span className={a.isCorrect ? 'text-emerald-400' : 'text-muted-foreground'}>
                {a.answerLabel} {a.isCorrect ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}

      {feedback && <p className="text-xs text-emerald-400 mt-2">{feedback}</p>}

      {leaderboard.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <Trophy className="w-3 h-3" /> Classement
          </div>
          {leaderboard.slice(0, 5).map((p, i) => (
            <div key={p.userId} className="flex justify-between text-xs py-0.5">
              <span className="text-foreground">{i + 1}. {p.userName}</span>
              <span className="text-primary font-medium">{p.totalPoints} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
