import React, { useState, useCallback } from 'react';
import { ChatProvider, useChat } from '@/lib/contexts';
import Sidebar from '@/components/chat/Sidebar';
import UsernameModal from '@/components/chat/UsernameModal';
import WelcomeScreen from '@/components/chat/WelcomeScreen';
import MediaBar from '@/components/chat/MediaBar';
import WebRtcRemotePanel from '@/components/chat/WebRtcRemotePanel';
import type { RemoteStreamInfo } from '@/lib/webrtcService';
import RightPanel from '@/components/chat/RightPanel';
import MobileBottomNav from '@/components/chat/MobileBottomNav';
import ChatArea from '@/components/chat/ChatArea';
import AdminPanel from '@/components/chat/AdminPanel';
import NotificationsPanel from '@/components/chat/NotificationsPanel';
import SettingsPanel from '@/components/chat/SettingsPanel';
import DirectMessagePanel from '@/components/chat/DirectMessagePanel';
import UserProfileView from '@/components/chat/UserProfileView';

function ChatApp() {
  const { user, currentSalon, showAdmin, setCurrentSalon } = useChat();
  const [micActive, setMicActive]       = useState<boolean>(false);
  const [micLevel,  setMicLevel]        = useState<number>(0);
  const [showDM,    setShowDM]          = useState<boolean>(false);
  const [dmTarget,  setDmTarget]        = useState<string | null>(null);
  const [showNotif, setShowNotif]       = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsTab, setSettingsTab]   = useState<string>('profile');
  const [viewProfile, setViewProfile]   = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamInfo[]>([]);
  const [mobileSalonsOpen, setMobileSalonsOpen] = useState(false);

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
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-background safe-area-pad">
      {!user && <UsernameModal />}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          onOpenDM={openDM}
          onOpenNotifications={() => setShowNotif(true)}
          onOpenSettings={openSettings}
        />

        {currentSalon ? (
          <>
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <ChatArea micActive={micActive} micLevel={micLevel} onOpenDM={openDM} />
              <WebRtcRemotePanel streams={remoteStreams} />
              <MediaBar onMicChange={handleMicChange} onRemoteStreams={setRemoteStreams} />
            </div>
            <RightPanel onOpenDM={openDM} />
          </>
        ) : (
          <WelcomeScreen
            onOpenDM={openDM}
            mobileSalonsOpen={mobileSalonsOpen}
            onMobileSalonsOpenChange={setMobileSalonsOpen}
          />
        )}
      </div>

      <MobileBottomNav
        onOpenDM={() => openDM()}
        onOpenNotifications={() => setShowNotif(true)}
        onOpenSettings={openSettings}
        onOpenSalons={() => {
          if (currentSalon) setCurrentSalon(null);
          setMobileSalonsOpen(true);
        }}
        showSalonsButton
      />

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
