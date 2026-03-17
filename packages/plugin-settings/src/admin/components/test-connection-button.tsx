import { Button, toast } from "@medusajs/ui"
import { CheckCircleSolid, XCircleSolid } from "@medusajs/icons"
import { useState } from "react"
import { sdk } from "../lib/client"

type TestConnectionButtonProps = {
  providerId: string
  verifyUrl?: string
  disabled?: boolean
  onVerified?: () => void
}

export function TestConnectionButton({
  providerId,
  verifyUrl,
  disabled = false,
  onVerified,
}: TestConnectionButtonProps) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<"success" | "error" | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setResult(null)

    try {
      const url =
        verifyUrl || `/admin/plugin-settings/${providerId}/verify`
      await sdk.client.fetch(url, { method: "POST" })
      setResult("success")
      toast.success("Connection verified successfully")
      onVerified?.()
    } catch (err: unknown) {
      setResult("error")
      const message =
        err instanceof Error ? err.message : "Connection test failed"
      toast.error(message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex items-center gap-x-2">
      <Button
        size="small"
        variant="secondary"
        onClick={handleTest}
        disabled={disabled || testing}
        isLoading={testing}
        type="button"
      >
        Test Connection
      </Button>
      {result === "success" && (
        <CheckCircleSolid className="text-ui-fg-interactive" />
      )}
      {result === "error" && (
        <XCircleSolid className="text-ui-tag-red-icon" />
      )}
    </div>
  )
}
