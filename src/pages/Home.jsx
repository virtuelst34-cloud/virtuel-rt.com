import React, { useState, useCallback, lazy, Suspense } from 'react';
import { ChatProvider, useChat } from '@/lib/contexts';
import Sidebar from '@/components/chat/Sidebar';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import ChatArea from '@/components/chat/ChatArea';
import MediaBar from '@/components/chat/MediaBar';
import RightPanel from '@/components/chat/RightPanel';
import UsernameModal from '@/components/chat/UsernameModal';
import DirectMessagePanel from '@/components/chat/DirectMessagePanel';
import { LazyLoadingFallback } from '@/lib/lazyLoad';

// Lazy load des panneaux modaux pour améliorer le bundle initial
const AdminPanel = lazy(() => import('@/components/chat/AdminPanel'));
const NotificationsPanel = lazy(() => import('@/components/chat/NotificationsPanel'));
const SettingsPanel = lazy(() => import('@/components/chat/SettingsPanel'));

function ChatApp() {
  const { user, currentSalon, showAdmin } = useChat();
  const [micActive, setMicActive]       = useState(false);
  const [micLevel,  setMicLevel]        = useState(0);
  const [showDM,    setShowDM]          = useState(false);
  const [dmTarget,  setDmTarget]        = useState(null);
  const [showNotif, setShowNotif]       = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleMicChange = useCallback((active, level) => {
    setMicActive(active);
    setMicLevel(level);
  }, []);

  const openDM = useCallback((targetName = null) => {
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
            <ChatArea micActive={micActive} micLevel={micLevel} onOpenDM={openDM} />
            <MediaBar onMicChange={handleMicChange} />
          </div>
          <RightPanel />
        </>
      ) : (
        /* ── Accueil 3 colonnes ── */
        <WelcomeScreen onOpenDM={openDM} />
      )}

      {showAdmin    && <Suspense fallback={<LazyLoadingFallback />}><AdminPanel /></Suspense>}
      {showDM       && <DirectMessagePanel onClose={() => { setShowDM(false); setDmTarget(null); }} initialUser={dmTarget} />}
      {showNotif    && <Suspense fallback={<LazyLoadingFallback />}><NotificationsPanel onClose={() => setShowNotif(false)} /></Suspense>}
      {showSettings && <Suspense fallback={<LazyLoadingFallback />}><SettingsPanel onClose={() => setShowSettings(false)} /></Suspense>}
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
