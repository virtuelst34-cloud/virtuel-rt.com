import React, { useState } from 'react';
import { Filter, X, Calendar, User, MessageSquare } from 'lucide-react';
import { filterMessages, Message } from '@/lib/searchUtils';

interface FilterPanelProps {
  messages: Message[];
  onFilteredMessages: (filtered: Message[]) => void;
  onClose: () => void;
}

export function FilterPanel({ messages, onFilteredMessages, onClose }: FilterPanelProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [messageType, setMessageType] = useState<'all' | 'system' | 'announcement' | 'normal'>('all');

  const applyFilters = () => {
    const filtered = filterMessages(messages, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      authorName: authorName || undefined,
      type: messageType,
    });
    onFilteredMessages(filtered);
    onClose();
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setAuthorName('');
    setMessageType('all');
    onFilteredMessages(messages);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Filtres de messages</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              Période
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Du</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Au</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Author */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <User className="w-4 h-4" />
              Auteur
            </label>
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* Message Type */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="w-4 h-4" />
              Type de message
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'normal', 'system', 'announcement'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMessageType(type)}
                  className={`px-3 py-1 rounded capitalize text-sm ${
                    messageType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {type === 'all' ? 'Tous' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={clearFilters}
              className="flex-1 py-2 border rounded hover:bg-muted transition"
            >
              Effacer
            </button>
            <button
              onClick={applyFilters}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
            >
              Appliquer
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-muted text-xs text-muted-foreground text-center">
          {messages.length} message(s) au total
        </div>
      </div>
    </div>
  );
}
