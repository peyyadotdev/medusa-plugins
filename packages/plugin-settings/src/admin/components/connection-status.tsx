import { Badge } from "@medusajs/ui"

type ConnectionStatusProps = {
  isConfigured: boolean
  isVerified: boolean
  verifiedAt?: string | null
}

export function ConnectionStatus({
  isConfigured,
  isVerified,
  verifiedAt,
}: ConnectionStatusProps) {
  if (!isConfigured) {
    return <Badge color="grey">Not Configured</Badge>
  }

  if (isVerified) {
    return (
      <div className="flex items-center gap-x-2">
        <Badge color="green">Connected</Badge>
        {verifiedAt && (
          <span className="text-ui-fg-subtle txt-small">
            Verified {new Date(verifiedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    )
  }

  return <Badge color="orange">Configured (Unverified)</Badge>
}
