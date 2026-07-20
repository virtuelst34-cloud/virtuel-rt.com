import React, { useState, useCallback, lazy, Suspense } from 'react';
import { ChatProvider, useChat } from '@/lib/contexts';
import Sidebar from '@/components/chat/Sidebar';
import UsernameModal from '@/components/chat/UsernameModal';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import MediaBar from '@/components/chat/MediaBar';
import WebRtcRemotePanel from '@/components/chat/WebRtcRemotePanel';
import type { RemoteStreamInfo } from '@/lib/webrtcService';
import RightPanel from '@/components/chat/RightPanel';

// Lazy loading — normalise toujours `{ default }` (Rollup peut renvoyer
// le composant directement via `.then(m => m.X)`), + reload si chunk 404.
function lazyWithReload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | T>,
) {
  return lazy(() =>
    factory()
      .then((mod) => {
        if (mod && typeof mod === 'object' && 'default' in mod && (mod as { default: T }).default) {
          return mod as { default: T };
        }
        return { default: mod as T };
      })
      .catch((err) => {
        const key = 'virtuel-rt-lazy-reload';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
        }
        throw err;
      }),
  );
}

const ChatArea = lazyWithReload(() => import('@/components/chat/ChatArea'));
const AdminPanel = lazyWithReload(() => import('@/components/chat/AdminPanel'));
const NotificationsPanel = lazyWithReload(() => import('@/components/chat/NotificationsPanel'));
const SettingsPanel = lazyWithReload(() => import('@/components/chat/SettingsPanel'));
const DirectMessagePanel = lazyWithReload(() => import('@/components/chat/DirectMessagePanel'));
const UserProfileView = lazyWithReload(() => import('@/components/chat/UserProfileView'));

function ChatApp() {
  const { user, currentSalon, showAdmin } = useChat();
  const [micActive, setMicActive]       = useState<boolean>(false);
  const [micLevel,  setMicLevel]        = useState<number>(0);
  const [showDM,    setShowDM]          = useState<boolean>(false);
  const [dmTarget,  setDmTarget]        = useState<string | null>(null);
  const [showNotif, setShowNotif]       = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsTab, setSettingsTab]   = useState<string>('profile');
  const [viewProfile, setViewProfile]   = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamInfo[]>([]);

  const handleMicChange = useCallback((active: boolean, level: number) => {
    setMicActive(active);
    setMicLevel(level);
  }, []);

  const openDM = useCallback((targetName: string | null = null) => {
    setDmTarget(targetName);
    setShowDM(true);
  }, []);

  const openSettings = useCallback((tab = 'profile') => {
    setSettingsTab(tab);
    setShowSettings(true);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!user && <UsernameModal />}

      {/* Sidebar icônes */}
      <Sidebar
        onOpenDM={openDM}
        onOpenNotifications={() => setShowNotif(true)}
        onOpenSettings={openSettings}
      />

      {currentSalon ? (
        /* ── Vue salon ── */
        <>
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Chargement...</div>}>
              <ChatArea micActive={micActive} micLevel={micLevel} onOpenDM={openDM} />
            </Suspense>
            <WebRtcRemotePanel streams={remoteStreams} />
            <MediaBar onMicChange={handleMicChange} onRemoteStreams={setRemoteStreams} />
          </div>
          <RightPanel onOpenDM={openDM} />
        </>
      ) : (
        /* ── Accueil 3 colonnes ── */
        <WelcomeScreen onOpenDM={openDM} />
      )}

      {showAdmin    && <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-sm text-muted-foreground">Chargement…</div>}><AdminPanel /></Suspense>}
      {showDM       && <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-sm text-muted-foreground">Chargement…</div>}><DirectMessagePanel onClose={() => { setShowDM(false); setDmTarget(null); }} initialUser={dmTarget || undefined} /></Suspense>}
      {showNotif    && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-sm text-muted-foreground">Chargement…</div>}>
          <NotificationsPanel
            onClose={() => setShowNotif(false)}
            onOpenDM={openDM}
            onOpenSettings={openSettings}
            onViewProfile={name => setViewProfile(name)}
          />
        </Suspense>
      )}
      {showSettings && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-sm text-muted-foreground">Chargement…</div>}>
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            initialTab={settingsTab}
            onOpenDM={name => {
              setShowSettings(false);
              openDM(name);
            }}
            onViewProfile={name => {
              setShowSettings(false);
              setViewProfile(name);
            }}
          />
        </Suspense>
      )}
      {viewProfile && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-sm text-muted-foreground">Chargement…</div>}>
          <UserProfileView
            targetName={viewProfile}
            onClose={() => setViewProfile(null)}
            onOpenDM={openDM}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <ChatProvider>
      <ChatApp />
    </ChatProvider>
  );
}
