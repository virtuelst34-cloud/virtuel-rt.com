import { Message } from './searchUtils';
import { buildTextPdf, downloadBlob } from './simplePdf';

export interface ExportOptions {
  format: 'json' | 'text' | 'pdf';
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
  downloadBlob(blob, `conversation-${salonName}-${new Date().toISOString().split('T')[0]}.json`);
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
  downloadBlob(blob, `conversation-${salonName}-${new Date().toISOString().split('T')[0]}.txt`);
}

/**
 * Export conversation en PDF réel
 */
export function exportToPDF(
  messages: Message[],
  salonName: string,
  options: ExportOptions = { format: 'pdf' }
): void {
  const lines: string[] = [
    `Conversation - ${salonName}`,
    `Exporte le: ${new Date().toLocaleString('fr-FR')}`,
    `Nombre de messages: ${messages.length}`,
    '='.repeat(50),
    '',
  ];

  messages.forEach(msg => {
    const date = new Date(msg.created_date).toLocaleString('fr-FR');
    lines.push(`[${date}] ${msg.author_name}:`);
    lines.push(msg.text || '');
    if (options.includeReactions && msg.reactions && Object.keys(msg.reactions).length > 0) {
      lines.push(
        `Reactions: ${Object.entries(msg.reactions)
          .map(([emoji, users]) => `${emoji} ${users.length}`)
          .join(', ')}`,
      );
    }
    lines.push('');
  });

  const blob = buildTextPdf(`Conversation ${salonName}`, lines);
  downloadBlob(blob, `conversation-${salonName}-${new Date().toISOString().split('T')[0]}.pdf`);
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
  } else if (options.format === 'pdf') {
    exportToPDF(messages, salonName, options);
  } else {
    exportToText(messages, salonName, options);
  }
}
