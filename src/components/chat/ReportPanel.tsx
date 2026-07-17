import React, { useState } from 'react';
import { Flag, X, AlertTriangle, User, MessageSquare, CheckCircle } from 'lucide-react';
import { useUser } from '@/lib/contexts';
import { supabaseDbService } from '@/lib/supabaseDb';

interface ReportPanelProps {
  onClose: () => void;
  targetId: string;
  targetType: 'message' | 'user';
  targetName?: string;
  targetContent?: string;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', icon: '📧' },
  { id: 'harassment', label: 'Harcèlement', icon: '⚠️' },
  { id: 'hate_speech', label: 'Discours haineux', icon: '🚫' },
  { id: 'inappropriate', label: 'Contenu inapproprié', icon: '🔞' },
  { id: 'impersonation', label: "Usurpation d'identité", icon: '🎭' },
  { id: 'other', label: 'Autre', icon: '📝' },
];

export function ReportPanel({ onClose, targetId, targetType, targetName, targetContent }: ReportPanelProps) {
  const { user } = useUser();
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason || submitting) return;
    const reporter = user?.name?.trim();
    if (!reporter) {
      setError('Connectez-vous pour signaler.');
      return;
    }

    setSubmitting(true);
    setError('');

    const saved = await supabaseDbService.addReport({
      target_id: targetId,
      target_type: targetType,
      target_name: targetName,
      target_content: targetContent,
      reason: selectedReason,
      description: description.trim() || undefined,
      reporter,
      timestamp: new Date().toISOString(),
    });

    setSubmitting(false);

    if (!saved) {
      setError("Impossible d'envoyer le signalement. Réessayez.");
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold">Signaler</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {submitted ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="font-medium">Signalement envoyé</p>
              <p className="text-sm text-muted-foreground">Merci, notre équipe va examiner ce contenu.</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {targetType === 'user' ? (
                    <User className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium capitalize">
                    {targetType === 'user' ? 'Utilisateur' : 'Message'}
                  </span>
                </div>
                {targetName && <p className="text-sm text-foreground font-medium">{targetName}</p>}
                {targetContent && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">"{targetContent}"</p>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">
                  Les faux signalements peuvent entraîner des sanctions. Assurez-vous que le signalement est justifié.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Raison du signalement</label>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => setSelectedReason(reason.id)}
                      className={`p-3 rounded-lg border transition-colors text-left ${
                        selectedReason === reason.id
                          ? 'border-red-500 bg-red-500/10 text-red-500'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{reason.icon}</span>
                        <span className="text-sm">{reason.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Détails (optionnel)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Ajoutez des précisions..."
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!selectedReason || submitting}
                className="w-full py-2.5 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50 hover:bg-red-500 transition-colors"
              >
                {submitting ? 'Envoi...' : 'Envoyer le signalement'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
