import React, { useState, useCallback, lazy, Suspense } from 'react';
import { ChatProvider, useChat } from '@/lib/contexts';
import Sidebar from '@/components/chat/Sidebar';
import UsernameModal from '@/components/chat/UsernameModal';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import MediaBar from '@/components/chat/MediaBar';
import WebRtcRemotePanel from '@/components/chat/WebRtcRemotePanel';
import type { RemoteStreamInfo } from '@/lib/webrtcService';
import RightPanel from '@/components/chat/RightPanel';

// Lazy loading des composants lourds
const ChatArea = lazy(() => import('@/components/chat/ChatArea'));
const AdminPanel = lazy(() => import('@/components/chat/AdminPanel'));
const NotificationsPanel = lazy(() => import('@/components/chat/NotificationsPanel'));
const SettingsPanel = lazy(() => import('@/components/chat/SettingsPanel'));
const DirectMessagePanel = lazy(() => import('@/components/chat/DirectMessagePanel'));
const UserProfileView = lazy(() => import('@/components/chat/UserProfileView'));

function ChatApp() {
  const { user, currentSalon, showAdmin } = useChat();
  const [micActive, setMicActive]       = useState<boolean>(false);
  const [micLevel,  setMicLevel]        = useState<number>(0);
  const [showDM,    setShowDM]          = useState<boolean>(false);
  const [dmTarget,  setDmTarget]        = useState<string | null>(null);
  const [showNotif, setShowNotif]       = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamInfo[]>([]);

  const handleMicChange = useCallback((active: boolean, level: number) => {
    setMicActive(active);
    setMicLevel(level);
  }, []);

  const openDM = useCallback((targetName: string | null = null) => {
    setDmTarget(targetName);
    setShowDM(true);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!user && <UsernameModal />}

      {/* Sidebar icônes */}
      <Sidebar
        onOpenDM={openDM}
        onOpenNotifications={() => setShowNotif(true)}
        onOpenSettings={() => setShowSettings(true)}
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

      {showAdmin    && <Suspense fallback={null}><AdminPanel /></Suspense>}
      {showDM       && <Suspense fallback={null}><DirectMessagePanel onClose={() => { setShowDM(false); setDmTarget(null); }} initialUser={dmTarget || undefined} /></Suspense>}
      {showNotif    && <Suspense fallback={null}><NotificationsPanel onClose={() => setShowNotif(false)} /></Suspense>}
      {showSettings && <Suspense fallback={null}><SettingsPanel onClose={() => setShowSettings(false)} /></Suspense>}
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
