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
import { useIsPhone } from '@/hooks/use-mobile';
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight';
import type { MobileSurface } from '@/lib/mobileShell';

function ChatApp() {
  const { user } = useUser();
  const { currentSalon, setCurrentSalon } = useSalons();
  const { showAdmin, profileTarget, openUserProfile, closeUserProfile } = useUI();
  const isPhone = useIsPhone();
  useVisualViewportHeight(isPhone);

  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [showDM, setShowDM] = useState(false);
  const [dmTarget, setDmTarget] = useState<string | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamInfo[]>([]);
  const [mobileSalonsOpen, setMobileSalonsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleMicChange = useCallback((active: boolean, level: number) => {
    setMicActive(active);
    setMicLevel(level);
  }, []);

  /** Un seul overlay métier à la fois (DM / notifs / settings / liste salons / profil). */
  const clearOverlays = useCallback(() => {
    setShowDM(false);
    setDmTarget(null);
    setShowNotif(false);
    setShowSettings(false);
    setMobileSalonsOpen(false);
    closeUserProfile();
  }, [closeUserProfile]);

  const goHome = useCallback(() => {
    clearOverlays();
    setCurrentSalon(null);
  }, [clearOverlays, setCurrentSalon]);

  const openSalons = useCallback(() => {
    setShowDM(false);
    setDmTarget(null);
    setShowNotif(false);
    setShowSettings(false);
    closeUserProfile();
    // Liste salons = écran dédié : quitter le salon courant sur téléphone
    if (isPhone && currentSalon) setCurrentSalon(null);
    setMobileSalonsOpen(true);
  }, [closeUserProfile, currentSalon, isPhone, setCurrentSalon]);

  const openDM = useCallback(
    (targetName: string | null = null) => {
      setShowNotif(false);
      setShowSettings(false);
      setMobileSalonsOpen(false);
      closeUserProfile();
      setDmTarget(targetName);
      setShowDM(true);
    },
    [closeUserProfile],
  );

  const openNotifications = useCallback(() => {
    setShowDM(false);
    setDmTarget(null);
    setShowSettings(false);
    setMobileSalonsOpen(false);
    closeUserProfile();
    setShowNotif(true);
  }, [closeUserProfile]);

  const openSettings = useCallback(
    (tab = 'profile') => {
      setShowDM(false);
      setDmTarget(null);
      setShowNotif(false);
      setMobileSalonsOpen(false);
      closeUserProfile();
      setSettingsTab(tab);
      setShowSettings(true);
    },
    [closeUserProfile],
  );

  const openProfileExclusive = useCallback(
    (name: string) => {
      setShowDM(false);
      setDmTarget(null);
      setShowNotif(false);
      setShowSettings(false);
      setMobileSalonsOpen(false);
      openUserProfile(name);
    },
    [openUserProfile],
  );

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

  // Surface active pour la nav bas (téléphone)
  const mobileSurface: MobileSurface = showSettings
    ? 'settings'
    : showNotif
      ? 'notifs'
      : showDM
        ? 'dm'
        : mobileSalonsOpen
          ? 'salons'
          : currentSalon
            ? 'salon'
            : 'home';

  // En salon sur téléphone : fermer le drawer salons s’il traîne
  useEffect(() => {
    if (currentSalon && mobileSalonsOpen) {
      setMobileSalonsOpen(false);
    }
  }, [currentSalon, mobileSalonsOpen]);

  return (
    <div className="chat-mobile-shell flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-background safe-area-pad">
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
          onOpenNotifications={openNotifications}
          onOpenSettings={openSettings}
        />

        {currentSalon ? (
          <>
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <ChatArea
                micActive={micActive}
                micLevel={micLevel}
                onOpenDM={openDM}
                composerExtras={
                  <>
                    <WebRtcRemotePanel streams={remoteStreams} />
                    <MediaBar onMicChange={handleMicChange} onRemoteStreams={setRemoteStreams} />
                  </>
                }
              />
            </div>
            {/* Desktop only — déjà hidden lg:flex dans le composant */}
            <RightPanel onOpenDM={openDM} />
          </>
        ) : (
          <WelcomeScreen
            onOpenDM={openDM}
            mobileSalonsOpen={mobileSalonsOpen}
            onMobileSalonsOpenChange={(open) => {
              if (open) openSalons();
              else setMobileSalonsOpen(false);
            }}
            salonsFullScreen={isPhone}
          />
        )}
      </div>

      <MobileBottomNav
        surface={mobileSurface}
        onGoHome={goHome}
        onOpenDM={() => openDM()}
        onOpenNotifications={openNotifications}
        onOpenSettings={openSettings}
        onOpenSalons={openSalons}
        onExclusiveNavigate={clearOverlays}
        showSalonsButton
      />

      {showAdmin && <AdminPanel />}
      {showDM && (
        <DirectMessagePanel
          onClose={() => {
            setShowDM(false);
            setDmTarget(null);
          }}
          initialUser={dmTarget || undefined}
        />
      )}
      {showNotif && (
        <NotificationsPanel
          onClose={() => setShowNotif(false)}
          onOpenDM={openDM}
          onOpenSettings={openSettings}
          onViewProfile={openProfileExclusive}
        />
      )}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          initialTab={settingsTab}
          onOpenDM={(name) => {
            openDM(name);
          }}
          onViewProfile={(name) => {
            openProfileExclusive(name);
          }}
        />
      )}
      {profileTarget && (
        <UserProfileView
          targetName={profileTarget}
          onClose={closeUserProfile}
          onOpenDM={(name) => {
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
