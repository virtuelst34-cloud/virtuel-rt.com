import React, { useState } from 'react';
import { Download, X, FileJson, FileText, CheckSquare, Square } from 'lucide-react';
import { exportConversation, ExportOptions } from '@/lib/exportUtils';
import { Message } from '@/lib/searchUtils';

interface ExportPanelProps {
  messages: Message[];
  salonName: string;
  onClose: () => void;
}

export function ExportPanel({ messages, salonName, onClose }: ExportPanelProps) {
  const [format, setFormat] = useState<'json' | 'text'>('json');
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeReactions, setIncludeReactions] = useState(true);
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    const options: ExportOptions = {
      format,
      includeMetadata,
      includeReactions,
    };

    exportConversation(messages, salonName, options);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Exporter conversation</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Format d'export</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('json')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  format === 'json'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <FileJson className="w-5 h-5" />
                <span>JSON</span>
              </button>
              <button
                onClick={() => setFormat('text')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  format === 'text'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Texte</span>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Options</label>
            
            <button
              onClick={() => setIncludeMetadata(!includeMetadata)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              {includeMetadata ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              <span className="text-sm">Inclure métadonnées (avatar, initials)</span>
            </button>

            <button
              onClick={() => setIncludeReactions(!includeReactions)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              {includeReactions ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              <span className="text-sm">Inclure les réactions</span>
            </button>
          </div>

          {/* Info */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium">{messages.length}</span> message(s) à exporter
            </p>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exported}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              exported
                ? 'bg-green-500 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {exported ? (
              <span className="flex items-center justify-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Exporté !
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Exporter
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
