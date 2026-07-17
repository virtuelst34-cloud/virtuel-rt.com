import { ReactNode } from 'react'
import { UserProvider } from '@/lib/contexts/UserContext'
import { PreferencesProvider } from '@/lib/contexts/PreferencesContext'
import { NotificationsProvider } from '@/lib/contexts/NotificationsContext'
import { SalonsProvider } from '@/lib/contexts/SalonsContext'
import { MessagesProvider } from '@/lib/contexts/MessagesContext'
import { ModerationProvider } from '@/lib/contexts/ModerationContext'
import { XPProvider } from '@/lib/contexts/XPContext'
import { DMProvider } from '@/lib/contexts/DMContext'
import { BadgesProvider } from '@/lib/contexts/BadgesContext'
import { UIProvider } from '@/lib/contexts/UIContext'
import { TypingProvider } from '@/lib/contexts/TypingContext'
import { CustomEmojisProvider } from '@/lib/contexts/CustomEmojisContext'
import { FriendsProvider } from '@/lib/contexts/FriendsContext'
import { MuteBlockProvider } from '@/lib/contexts/MuteBlockContext'
import { GlobalSettingsProvider } from '@/lib/contexts/GlobalSettingsContext'

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <GlobalSettingsProvider>
      <NotificationsProvider>
        <UserProvider>
          <PreferencesProvider>
            <MessagesProvider>
              <TypingProvider>
                <DMProvider>
                  <FriendsProvider>
                    <MuteBlockProvider>
                      <ModerationProvider>
                        <SalonsProvider>
                          <UIProvider>
                            <XPProvider>
                              <BadgesProvider>
                                <CustomEmojisProvider>
                                  {children}
                                </CustomEmojisProvider>
                              </BadgesProvider>
                            </XPProvider>
                          </UIProvider>
                        </SalonsProvider>
                      </ModerationProvider>
                    </MuteBlockProvider>
                  </FriendsProvider>
                </DMProvider>
              </TypingProvider>
            </MessagesProvider>
          </PreferencesProvider>
        </UserProvider>
      </NotificationsProvider>
    </GlobalSettingsProvider>
  )
}
