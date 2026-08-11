import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// StatsSection import
const statsPath = join(root, 'src/components/chat/admin/StatsSection.tsx');
let stats = readFileSync(statsPath, 'utf8');
if (!stats.includes("import { presenceService }")) {
  stats = stats.replace(
    "import { SALONS } from '@/lib/chatConfig';",
    "import { SALONS } from '@/lib/chatConfig';\nimport { presenceService } from '@/lib/presenceService';",
  );
  writeFileSync(statsPath, stats);
  console.log('StatsSection: import ajouté');
}

// DMContext loadInbox
const dmPath = join(root, 'src/lib/contexts/DMContext.tsx');
let dm = readFileSync(dmPath, 'utf8');
if (!dm.includes('loadInbox: () =>')) {
  dm = dm.replace(
    '  loadConversation: (userName1: string, userName2: string) => Promise<void>;\n}',
    '  loadConversation: (userName1: string, userName2: string) => Promise<void>;\n  loadInbox: () => Promise<void>;\n}',
  );
}
if (!dm.includes('const loadInbox = useCallback')) {
  dm = dm.replace(
    `    [resolveUserId]
  );

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(\`direct_messages:\${currentUserId}\`)`,
    `    [resolveUserId]
  );

  const loadInbox = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(\`sender_id.eq.\${currentUserId},receiver_id.eq.\${currentUserId}\`)
        .order('created_at', { ascending: true })
        .limit(500);

      if (error) throw error;

      const grouped: Record<string, DMMessage[]> = {};
      for (const message of data || []) {
        const key = conversationKey(message.sender_id, message.receiver_id);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(message as DMMessage);
      }
      setConversations(prev => ({ ...prev, ...grouped }));
    } catch (error) {
      console.error('Erreur chargement inbox DM:', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) void loadInbox();
  }, [currentUserId, loadInbox]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(\`direct_messages:\${currentUserId}\`)`,
  );
  writeFileSync(dmPath, dm);
  console.log('DMContext: loadInbox ajouté');
}

console.log('Patch terminé');
