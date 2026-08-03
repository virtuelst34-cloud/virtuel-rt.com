import React, { useMemo, useState } from 'react';
import { Bell, DoorOpen, Scale, X, ChevronRight, Check } from 'lucide-react';
import { hasAgeAcknowledged, setAgeAcknowledged } from '@/lib/ageGate';
import { markOnboardingDone, setFavoriteSalonId } from '@/lib/onboarding';
import { AGE_GATE_LABEL, WELCOME_RULES } from '@/lib/welcomeContent';
import { useSalons } from '@/lib/contexts';
import { mergeAndSortSalons } from '@/lib/salonUtils';

interface OnboardingWizardProps {
  onComplete: () => void;
}

type StepId = 'age' | 'salon' | 'notifs';

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { customSalons, hiddenSalons, displayOrder, setCurrentSalon } = useSalons();
  const needsAge = !hasAgeAcknowledged();

  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = [];
    if (needsAge) list.push('age');
    list.push('salon', 'notifs');
    return list.slice(0, 3);
  }, [needsAge]);

  const [index, setIndex] = useState(0);
  const [ageOk, setAgeOk] = useState(false);
  const [pickedSalon, setPickedSalon] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle');

  const tipSalons = useMemo(() => {
    const all = mergeAndSortSalons(customSalons || [], hiddenSalons || [], displayOrder || {});
    const preferred = ['bienvenue', 'general', 'amical'];
    const ranked = [
      ...preferred.map((id) => all.find((s) => s.id === id)).filter(Boolean),
      ...all.filter((s) => !preferred.includes(s.id)),
    ].slice(0, 5);
    return ranked as typeof all;
  }, [customSalons, hiddenSalons, displayOrder]);

  const step = steps[index];
  const isLast = index >= steps.length - 1;

  const finish = () => {
    markOnboardingDone();
    onComplete();
  };

  const goNext = () => {
    if (step === 'age') {
      if (!ageOk) return;
      setAgeAcknowledged();
    }
    if (step === 'salon' && pickedSalon) {
      setFavoriteSalonId(pickedSalon);
      setCurrentSalon(pickedSalon);
    }
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  const requestNotifs = async () => {
    if (typeof Notification === 'undefined') {
      setNotifStatus('unsupported');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotifStatus(result === 'granted' ? 'granted' : 'denied');
    } catch {
      setNotifStatus('denied');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2100] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-in-up">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-primary' : i < index ? 'w-3 bg-primary/50' : 'w-3 bg-border'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={finish}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 touch-target"
            aria-label="Passer"
            title="Ne plus afficher"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-1 space-y-4">
          {step === 'age' && (
            <>
              <div className="flex items-center gap-2 text-amber-300">
                <Scale className="w-5 h-5" />
                <h2 id="onboarding-title" className="text-base font-semibold text-foreground">
                  Règles &amp; 18+
                </h2>
              </div>
              <ul className="text-[12px] text-muted-foreground/85 space-y-1.5 text-left max-h-40 overflow-y-auto">
                {WELCOME_RULES.slice(0, 4).map((r) => (
                  <li key={r} className="leading-relaxed">• {r}</li>
                ))}
              </ul>
              <label className="flex items-start gap-2.5 text-[12px] text-foreground cursor-pointer rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={ageOk}
                  onChange={(e) => setAgeOk(e.target.checked)}
                  className="mt-0.5"
                />
                <span>{AGE_GATE_LABEL}</span>
              </label>
            </>
          )}

          {step === 'salon' && (
            <>
              <div className="flex items-center gap-2 text-primary">
                <DoorOpen className="w-5 h-5" />
                <h2 id="onboarding-title" className="text-base font-semibold text-foreground">
                  Choisissez un salon
                </h2>
              </div>
              <p className="text-[12px] text-muted-foreground/70 text-left">
                Astuce : commencez par un salon accueillant. Vous pourrez en changer à tout moment.
              </p>
              <div className="space-y-1.5">
                {tipSalons.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPickedSalon(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all touch-target ${
                      pickedSalon === s.id
                        ? 'border-primary/50 bg-primary/15 text-foreground'
                        : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="text-lg">{s.emoji || '💬'}</span>
                    <span className="text-sm font-medium flex-1 truncate">{s.name}</span>
                    {pickedSalon === s.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'notifs' && (
            <>
              <div className="flex items-center gap-2 text-emerald-400">
                <Bell className="w-5 h-5" />
                <h2 id="onboarding-title" className="text-base font-semibold text-foreground">
                  Notifications
                </h2>
              </div>
              <p className="text-[12px] text-muted-foreground/70 text-left">
                Activez les notifications pour ne pas manquer les MP et alertes importantes. Vous pouvez refuser.
              </p>
              <button
                type="button"
                onClick={() => void requestNotifs()}
                className="w-full py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 transition-all touch-target"
              >
                {notifStatus === 'granted'
                  ? 'Notifications activées ✓'
                  : notifStatus === 'denied'
                    ? 'Refusées — vous pourrez les activer plus tard'
                    : notifStatus === 'unsupported'
                      ? 'Non supportées sur cet appareil'
                      : 'Activer les notifications'}
              </button>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={finish}
              className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:bg-white/5 touch-target"
            >
              Passer
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={step === 'age' && !ageOk}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-40 touch-target"
            >
              {isLast ? 'Terminer' : 'Suivant'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
