import React, { useState, useCallback, useEffect } from 'react';
import { ChatProvider, useUser, useSalons, useUI } from '@/lib/contexts';
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
import AppUpdateBanner from '@/components/AppUpdateBanner';
import OnboardingWizard from '@/components/chat/OnboardingWizard';
import { isOnboardingDone, onboardingUserKey } from '@/lib/onboarding';

function ChatApp() {
  const { user } = useUser();
  const { currentSalon, setCurrentSalon } = useSalons();
  const { showAdmin, profileTarget, openUserProfile, closeUserProfile } = useUI();
  const [micActive, setMicActive]       = useState<boolean>(false);
  const [micLevel,  setMicLevel]        = useState<number>(0);
  const [showDM,    setShowDM]          = useState<boolean>(false);
  const [dmTarget,  setDmTarget]        = useState<string | null>(null);
  const [showNotif, setShowNotif]       = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsTab, setSettingsTab]   = useState<string>('profile');
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamInfo[]>([]);
  const [mobileSalonsOpen, setMobileSalonsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string }>).detail;
      openSettings(detail?.tab || 'premium');
    };
    window.addEventListener('virtuel-rt-open-settings', handler);
    return () => window.removeEventListener('virtuel-rt-open-settings', handler);
  }, [openSettings]);

  // Après UsernameModal uniquement (user défini) — flag par identité, jamais avant entrée
  useEffect(() => {
    if (!user) {
      setShowOnboarding(false);
      return;
    }
    const key = onboardingUserKey(user);
    if (key && !isOnboardingDone(key)) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user?.id, user?.name]);

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-background safe-area-pad">
      <AppUpdateBanner autoApply={!currentSalon} />
      {!user && <UsernameModal />}
      {user && showOnboarding && (
        <OnboardingWizard
          userKey={onboardingUserKey(user) || undefined}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

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
          onViewProfile={openUserProfile}
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
            openUserProfile(name);
          }}
        />
      )}
      {profileTarget && (
        <UserProfileView
          targetName={profileTarget}
          onClose={closeUserProfile}
          onOpenDM={(name) => {
            closeUserProfile();
            openDM(name);
          }}
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
