import React, { useState } from 'react';
import { Flag, X, AlertTriangle, User, MessageSquare, CheckCircle } from 'lucide-react';

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
  { id: 'impersonation', label: 'Usurpation d\'identité', icon: '🎭' },
  { id: 'other', label: 'Autre', icon: '📝' },
];

export function ReportPanel({ onClose, targetId, targetType, targetName, targetContent }: ReportPanelProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedReason) return;

    // Simuler l'envoi du rapport
    const report = {
      id: Date.now().toString(),
      targetId,
      targetType,
      targetName,
      targetContent,
      reason: selectedReason,
      description,
      timestamp: new Date().toISOString(),
      reporter: 'current_user', // À remplacer avec l'utilisateur réel
    };

    console.log('Rapport soumis:', report);
    
    // Enregistrer dans localStorage pour simulation
    try {
      const existingReports = JSON.parse(localStorage.getItem('virtuel_rt_reports') || '[]');
      existingReports.push(report);
      localStorage.setItem('virtuel_rt_reports', JSON.stringify(existingReports));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde du rapport:', e);
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold">Signaler</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Target Info */}
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
            {targetName && (
              <p className="text-sm text-foreground font-medium">{targetName}</p>
            )}
            {targetContent && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                "{targetContent}"
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              Les faux signalements peuvent entraîner des sanctions. Assurez-vous que le signalement est justifié.
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Raison du signalement</label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`p-3 rounded-lg border transition-colors text-left ${
                    selectedReason === reason.id
                      ? 'border-red-500 bg-red-500/10 text-red-500'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{reason.icon}</span>
                    <span className="text-sm">{reason.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème en détail..."
              className="w-full px-3 py-2 border rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-500"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || submitted}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              submitted
                ? 'bg-green-500 text-white'
                : !selectedReason
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {submitted ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Signalement envoyé
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Flag className="w-5 h-5" />
                Envoyer le signalement
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
