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

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <NotificationsProvider>
        <PreferencesProvider>
          <SalonsProvider>
            <MessagesProvider>
              <ModerationProvider>
                <XPProvider>
                  <DMProvider>
                    <BadgesProvider>
                      <UIProvider>
                        {children}
                      </UIProvider>
                    </BadgesProvider>
                  </DMProvider>
                </XPProvider>
              </ModerationProvider>
            </MessagesProvider>
          </SalonsProvider>
        </PreferencesProvider>
      </NotificationsProvider>
    </UserProvider>
  )
}
