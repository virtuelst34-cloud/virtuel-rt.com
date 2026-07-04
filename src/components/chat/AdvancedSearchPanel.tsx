import React, { useState } from 'react';
import { Search, Calendar, User, Hash, X, Filter as FilterIcon, Save, Trash2 } from 'lucide-react';

export interface SearchFilters {
  query: string;
  author?: string;
  salonId?: string;
  startDate?: Date;
  endDate?: Date;
  includePrivate: boolean;
}

interface AdvancedSearchPanelProps {
  onSearch: (filters: SearchFilters) => void;
  onClose: () => void;
  savedSearches?: SavedSearch[];
  onSaveSearch?: (name: string, filters: SearchFilters) => void;
  onDeleteSearch?: (id: string) => void;
  onLoadSearch?: (filters: SearchFilters) => void;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
}

export function AdvancedSearchPanel({
  onSearch,
  onClose,
  savedSearches = [],
  onSaveSearch,
  onDeleteSearch,
  onLoadSearch
}: AdvancedSearchPanelProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    includePrivate: false
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleSaveSearch = () => {
    if (searchName.trim() && onSaveSearch) {
      onSaveSearch(searchName, filters);
      setSearchName('');
      setShowSaveDialog(false);
    }
  };

  const handleLoadSearch = (saved: SavedSearch) => {
    setFilters(saved.filters);
    if (onLoadSearch) {
      onLoadSearch(saved.filters);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-6 max-w-2xl w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recherche avancée</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Recherche principale */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Recherche textuelle</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Rechercher dans les messages..."
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <User className="w-4 h-4" />
              Auteur
            </label>
            <input
              type="text"
              value={filters.author || ''}
              onChange={(e) => setFilters({ ...filters, author: e.target.value || undefined })}
              placeholder="Nom d'utilisateur"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Salon
            </label>
            <input
              type="text"
              value={filters.salonId || ''}
              onChange={(e) => setFilters({ ...filters, salonId: e.target.value || undefined })}
              placeholder="ID du salon"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date de début
            </label>
            <input
              type="date"
              value={filters.startDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value ? new Date(e.target.value) : undefined })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date de fin
            </label>
            <input
              type="date"
              value={filters.endDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value ? new Date(e.target.value) : undefined })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includePrivate"
            checked={filters.includePrivate}
            onChange={(e) => setFilters({ ...filters, includePrivate: e.target.checked })}
            className="w-4 h-4 rounded border-border"
          />
          <label htmlFor="includePrivate" className="text-sm">
            Inclure les messages privés
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Rechercher
          </button>
          
          {onSaveSearch && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          )}
        </div>
      </div>

      {/* Dialog de sauvegarde */}
      {showSaveDialog && (
        <div className="mt-4 p-4 bg-secondary rounded-lg">
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Nom de la recherche"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveSearch}
              className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Sauvegarder
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Recherches sauvegardées */}
      {savedSearches.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FilterIcon className="w-4 h-4" />
            Recherches sauvegardées
          </h4>
          <div className="space-y-2">
            {savedSearches.map((saved) => (
              <div
                key={saved.id}
                className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{saved.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {saved.filters.query || 'Sans requête'} • {new Date(saved.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLoadSearch(saved)}
                    className="p-2 hover:bg-background rounded-lg transition-colors"
                    title="Charger"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  {onDeleteSearch && (
                    <button
                      onClick={() => onDeleteSearch(saved.id)}
                      className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
