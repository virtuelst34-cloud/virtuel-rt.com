import { Message } from './searchUtils';

export interface ExportOptions {
  format: 'json' | 'text';
  includeMetadata?: boolean;
  includeReactions?: boolean;
}

/**
 * Export conversation en JSON
 */
export function exportToJSON(
  messages: Message[],
  salonName: string,
  options: ExportOptions = { format: 'json' }
): void {
  const exportData = {
    salon: salonName,
    exportDate: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map(msg => {
      const baseMsg = {
        id: msg.id,
        author: msg.author_name,
        text: msg.text,
        timestamp: msg.created_date,
      };

      if (options.includeMetadata) {
        (baseMsg as any).avatar = msg.author_avatar;
        (baseMsg as any).initials = msg.author_initials;
        (baseMsg as any).isSystem = msg.is_system;
        (baseMsg as any).isAnnouncement = msg.is_announcement;
      }

      if (options.includeReactions && msg.reactions) {
        (baseMsg as any).reactions = msg.reactions;
      }

      return baseMsg;
    }),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation-${salonName}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export conversation en texte brut (.txt)
 */
export function exportToText(
  messages: Message[],
  salonName: string,
  options: ExportOptions = { format: 'text' }
): void {
  let content = `Conversation - ${salonName}\n`;
  content += `Exporté le: ${new Date().toLocaleString('fr-FR')}\n`;
  content += `Nombre de messages: ${messages.length}\n`;
  content += `${'='.repeat(50)}\n\n`;

  messages.forEach(msg => {
    const date = new Date(msg.created_date).toLocaleString('fr-FR');
    content += `[${date}] ${msg.author_name}:\n`;
    content += `${msg.text}\n`;
    
    if (options.includeReactions && msg.reactions && Object.keys(msg.reactions).length > 0) {
      content += `Réactions: ${Object.entries(msg.reactions).map(([emoji, users]) => `${emoji} ${users.length}`).join(', ')}\n`;
    }
    
    content += '\n';
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation-${salonName}-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export conversation principal
 */
export function exportConversation(
  messages: Message[],
  salonName: string,
  options: ExportOptions = { format: 'json' }
): void {
  if (options.format === 'json') {
    exportToJSON(messages, salonName, options);
  } else {
    exportToText(messages, salonName, options);
  }
}

/** Alias historique — exporte du texte, pas un PDF. */
export const exportToPDF = exportToText;
