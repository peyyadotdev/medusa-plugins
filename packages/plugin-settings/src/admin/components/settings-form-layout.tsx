import { Container, Heading, Text, Button } from "@medusajs/ui"
import type { ReactNode } from "react"
import { ConnectionStatus } from "./connection-status"

type SettingsFormLayoutProps = {
  title: string
  description: string
  children: ReactNode
  onSubmit: (e: React.FormEvent) => void
  isPending?: boolean
  isConfigured?: boolean
  isVerified?: boolean
  verifiedAt?: string | null
  actions?: ReactNode
}

export function SettingsFormLayout({
  title,
  description,
  children,
  onSubmit,
  isPending = false,
  isConfigured = false,
  isVerified = false,
  verifiedAt,
  actions,
}: SettingsFormLayoutProps) {
  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">{title}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {description}
          </Text>
        </div>
        <ConnectionStatus
          isConfigured={isConfigured}
          isVerified={isVerified}
          verifiedAt={verifiedAt}
        />
      </div>

      <Container>
        <form onSubmit={onSubmit} className="flex flex-col gap-y-4 px-6 py-4">
          {children}

          <div className="flex items-center justify-between border-t border-ui-border-base pt-4">
            <div>{actions}</div>
            <Button
              type="submit"
              size="small"
              disabled={isPending}
              isLoading={isPending}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </Container>
    </div>
  )
}
