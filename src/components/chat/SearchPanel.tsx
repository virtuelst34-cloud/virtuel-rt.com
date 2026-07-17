import React, { useState, useCallback } from 'react';
import { Search, X, Filter, MessageSquare, Users, Hash, Loader2 } from 'lucide-react';
import { useMessages } from '@/lib/contexts/MessagesContext';
import { useUser } from '@/lib/contexts/UserContext';
import { SALONS } from '@/lib/chatConfig';
import { globalSearch, SearchFilters, SearchResult } from '@/lib/searchUtils';
import { supabaseDbService } from '@/lib/supabaseDb';

interface SearchPanelProps {
  onClose: () => void;
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const { salonMessages } = useMessages();
  const { profiles } = useUser();
  
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'messages' | 'users' | 'salons'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [salonFilter, setSalonFilter] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    const filters: SearchFilters = {
      query,
      type: searchType,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      authorName: authorName || undefined,
      salonId: salonFilter || undefined,
    };

    setLoading(true);
    try {
      let searchResults = globalSearch(salonMessages, profiles, SALONS, filters);

      if (query.trim().length >= 2 && (searchType === 'all' || searchType === 'messages')) {
        const remote = await supabaseDbService.searchMessages(query, {
          salonId: salonFilter || undefined,
          authorName: authorName || undefined,
          limit: 100,
        });
        const remoteResults: SearchResult[] = remote.map(msg => ({
          type: 'message' as const,
          id: msg.id,
          title: msg.author_name,
          subtitle: msg.text?.slice(0, 120) || '',
          meta: msg.salon_id,
        }));
        const seen = new Set(searchResults.map(r => r.id));
        for (const r of remoteResults) {
          if (!seen.has(r.id)) {
            searchResults.push(r);
            seen.add(r.id);
          }
        }
      }

      setResults(searchResults);
    } finally {
      setLoading(false);
    }
  }, [query, searchType, dateFrom, dateTo, authorName, salonFilter, salonMessages, profiles]);

  const clearFilters = () => {
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setAuthorName('');
    setSalonFilter('');
    setResults([]);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'user': return <Users className="w-4 h-4" />;
      case 'salon': return <Hash className="w-4 h-4" />;
    }
  };

  const getResultColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'message': return 'text-blue-500';
      case 'user': return 'text-purple-500';
      case 'salon': return 'text-green-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recherche avancée</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher messages, utilisateurs, salons..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* Type Selector */}
          <div className="flex gap-2">
            {(['all', 'messages', 'users', 'salons'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSearchType(type)}
                className={`px-3 py-1 rounded capitalize ${
                  searchType === type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          </button>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Date début</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Date fin</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Auteur</label>
                <input
                  type="text"
                  placeholder="Nom d'utilisateur"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Salon</label>
                <select
                  value={salonFilter}
                  onChange={(e) => setSalonFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Tous les salons</option>
                  {SALONS.map(salon => (
                    <option key={salon.id} value={salon.id}>{salon.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Effacer les filtres
              </button>
            </div>
          )}

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Rechercher
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 && query && (
            <p className="text-center text-muted-foreground py-8">
              Aucun résultat pour "{query}"
            </p>
          )}
          
          {results.length === 0 && !query && (
            <p className="text-center text-muted-foreground py-8">
              Entrez une recherche pour commencer
            </p>
          )}

          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                className="p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition"
              >
                <div className="flex items-start gap-3">
                  <div className={getResultColor(result.type)}>
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.title}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {result.type}
                      </span>
                    </div>
                    {result.subtitle && (
                      <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                    )}
                    {result.content && (
                      <p className="text-sm mt-1 line-clamp-2">{result.content}</p>
                    )}
                    {result.timestamp && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(result.timestamp).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-sm text-muted-foreground">
          {results.length > 0 && `${results.length} résultat(s)`}
        </div>
      </div>
    </div>
  );
}
