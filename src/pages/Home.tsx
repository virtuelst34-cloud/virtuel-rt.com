import React, { useState, useCallback, lazy, Suspense } from 'react';
import { ChatProvider, useChat } from '@/lib/contexts';
import Sidebar from '@/components/chat/Sidebar';
import UsernameModal from '@/components/chat/UsernameModal';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import MediaBar from '@/components/chat/MediaBar';
import WebRtcRemotePanel from '@/components/chat/WebRtcRemotePanel';
import type { RemoteStreamInfo } from '@/lib/webrtcService';
import RightPanel from '@/components/chat/RightPanel';
// Panels importés en statique : le lazy + chunks qui ré-importent l'index
// provoquait React #306 (element type undefined) en prod (notifications, profil…).
import AdminPanel from '@/components/chat/AdminPanel';
import NotificationsPanel from '@/components/chat/NotificationsPanel';
import SettingsPanel from '@/components/chat/SettingsPanel';
import DirectMessagePanel from '@/components/chat/DirectMessagePanel';
import UserProfileView from '@/components/chat/UserProfileView';

// Lazy loading — normalise toujours `{ default }` (Rollup peut renvoyer
// le composant directement via `.then(m => m.X)`), + reload si chunk 404.
function lazyWithReload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | T>,
) {
  return lazy(() =>
    factory()
      .then((mod) => {
        const resolved =
          mod && typeof mod === 'object' && 'default' in mod && (mod as { default: T }).default
            ? (mod as { default: T }).default
            : (mod as T);
        if (typeof resolved !== 'function' && (typeof resolved !== 'object' || resolved === null)) {
          throw new Error('Lazy module resolved to an invalid React component');
        }
        return { default: resolved };
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

      {showAdmin && <AdminPanel />}
      {showDM && (
        <DirectMessagePanel
          onClose={() => { setShowDM(false); setDmTarget(null); }}
          initialUser={dmTarget || undefined}
        />
      )}
      {showNotif && (
        <NotificationsPanel
          onClose={() => setShowNotif(false)}
          onOpenDM={openDM}
          onOpenSettings={openSettings}
          onViewProfile={name => setViewProfile(name)}
        />
      )}
      {showSettings && (
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
      )}
      {viewProfile && (
        <UserProfileView
          targetName={viewProfile}
          onClose={() => setViewProfile(null)}
          onOpenDM={openDM}
        />
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
