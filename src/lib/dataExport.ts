/**
 * Service d'Export de Données
 * 
 * Permet d'exporter les conversations, statistiques et préférences
 * en différents formats (PDF, JSON, CSV)
 */

export interface MessageExport {
  id: string;
  author: string;
  text: string;
  timestamp: Date;
  salon: string;
  reactions?: string[];
}

export interface UserStatsExport {
  userId: string;
  username: string;
  totalMessages: number;
  totalReactions: number;
  joinDate: Date;
  lastActive: Date;
  achievements: string[];
  level: number;
  xp: number;
}

export interface PreferencesExport {
  theme: string;
  notifications: {
    enabled: boolean;
    types: string[];
  };
  language: string;
  privacy: {
    showOnline: boolean;
    showTyping: boolean;
  };
  customSettings: Record<string, any>;
}

class DataExportService {
  /**
   * Exporte des données en format JSON
   */
  exportJSON(data: any, filename: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    this.downloadBlob(blob, `${filename}.json`);
  }

  /**
   * Exporte des données en format CSV
   */
  exportCSV(data: any[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Échapper les valeurs contenant des virgules ou des guillemets
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${filename}.csv`);
  }

  /**
   * Exporte des conversations en format texte
   */
  exportConversations(messages: MessageExport[], filename: string): void {
    let content = `Export des conversations - ${new Date().toLocaleString('fr-FR')}\n`;
    content += '='.repeat(50) + '\n\n';

    messages.forEach(msg => {
      content += `[${new Date(msg.timestamp).toLocaleString('fr-FR')}] `;
      content += `${msg.author} dans ${msg.salon}:\n`;
      content += `${msg.text}\n`;
      if (msg.reactions && msg.reactions.length > 0) {
        content += `Réactions: ${msg.reactions.join(', ')}\n`;
      }
      content += '\n';
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    this.downloadBlob(blob, `${filename}.txt`);
  }

  /**
   * Exporte des statistiques utilisateur
   */
  exportUserStats(stats: UserStatsExport, filename: string): void {
    const content = {
      exportDate: new Date().toISOString(),
      user: {
        id: stats.userId,
        username: stats.username,
        joinDate: stats.joinDate.toISOString(),
        lastActive: stats.lastActive.toISOString()
      },
      statistics: {
        totalMessages: stats.totalMessages,
        totalReactions: stats.totalReactions,
        level: stats.level,
        xp: stats.xp
      },
      achievements: stats.achievements
    };

    this.exportJSON(content, filename);
  }

  /**
   * Exporte les préférences utilisateur
   */
  exportPreferences(prefs: PreferencesExport, filename: string): void {
    const content = {
      exportDate: new Date().toISOString(),
      preferences: prefs
    };

    this.exportJSON(content, filename);
  }

  /**
   * Crée un backup complet des données utilisateur
   */
  createBackup(
    messages: MessageExport[],
    stats: UserStatsExport,
    prefs: PreferencesExport,
    filename: string
  ): void {
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        messages,
        stats,
        preferences: prefs
      }
    };

    this.exportJSON(backup, filename);
  }

  /**
   * Importe un backup depuis un fichier JSON
   */
  async importBackup(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          resolve(content);
        } catch (error) {
          reject(new Error('Format de fichier invalide'));
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsText(file);
    });
  }

  /**
   * Télécharge un blob comme fichier
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Génère un rapport PDF réel (Helvetica / WinAnsi)
   */
  generatePDFReport(
    messages: MessageExport[],
    stats: UserStatsExport,
    filename: string
  ): void {
    const lines = [
      `RAPPORT D'ACTIVITE`,
      `Genere le ${new Date().toLocaleString('fr-FR')}`,
      '='.repeat(50),
      '',
      'STATISTIQUES UTILISATEUR',
      '-'.repeat(30),
      `Utilisateur: ${stats.username}`,
      `Messages totaux: ${stats.totalMessages}`,
      `Reactions totales: ${stats.totalReactions}`,
      `Niveau: ${stats.level}`,
      `XP: ${stats.xp}`,
      `Succes: ${stats.achievements.join(', ')}`,
      '',
      'MESSAGES RECENTS',
      '-'.repeat(30),
      ...messages.slice(0, 50).map(
        (msg) => `[${new Date(msg.timestamp).toLocaleString('fr-FR')}] ${msg.author}: ${msg.text}`,
      ),
    ];

    // Import dynamique évite un cycle si dataExport est chargé tôt
    void import('./simplePdf').then(({ buildTextPdf, downloadBlob }) => {
      const blob = buildTextPdf(`Rapport ${stats.username}`, lines);
      downloadBlob(blob, `${filename}.pdf`);
    });
  }

  /**
   * Exporte les données pour analyse (format optimisé)
   */
  exportForAnalytics(data: any, filename: string): void {
    const optimized = {
      metadata: {
        exportDate: new Date().toISOString(),
        recordCount: Array.isArray(data) ? data.length : 1,
        format: 'analytics'
      },
      data
    };

    this.exportJSON(optimized, filename);
  }
}

export const dataExportService = new DataExportService();
