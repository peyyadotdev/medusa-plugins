import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Label, Input, Switch, toast, Badge } from "@medusajs/ui"
import { CreditCard } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { sdk } from "../../../lib/client"

type SettingsResponse = {
  settings: Record<string, string> | null
  is_configured: boolean
  is_verified: boolean
  verified_at: string | null
}

const QliroSettingsPage = () => {
  const queryClient = useQueryClient()

  const [apiKey, setApiKey] = useState("")
  const [merchantId, setMerchantId] = useState("")
  const [environment, setEnvironment] = useState("sandbox")
  const [showKey, setShowKey] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["plugin-settings", "qliro"],
    queryFn: () =>
      sdk.client.fetch<SettingsResponse>("/admin/plugin-settings/qliro"),
  })

  useEffect(() => {
    if (data?.settings) {
      setApiKey((data.settings.apiKey as string) || "")
      setMerchantId((data.settings.merchantId as string) || "")
      setEnvironment((data.settings.environment as string) || "sandbox")
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/plugin-settings/qliro`, {
        method: "POST",
        body: {
          category: "payment",
          display_name: "Qliro Checkout",
          settings: { apiKey, merchantId, environment },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "qliro"] })
      toast.success("Qliro settings saved")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save settings")
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/plugin-settings/qliro/verify`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "qliro"] })
      toast.success("Connection verified")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Connection test failed")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Text className="text-ui-fg-subtle">Loading...</Text>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Qliro Checkout</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Configure your Qliro payment provider credentials.
          </Text>
        </div>
        {data?.is_configured ? (
          data?.is_verified ? (
            <Badge color="green">Connected</Badge>
          ) : (
            <Badge color="orange">Configured (Unverified)</Badge>
          )
        ) : (
          <Badge color="grey">Not Configured</Badge>
        )}
      </div>

      <Container>
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-4 px-6 py-4">
          <div className="flex flex-col gap-y-1.5">
            <Label htmlFor="qliro-api-key" size="small" weight="plus">
              API Key
            </Label>
            <div className="flex items-center gap-x-1">
              <Input
                id="qliro-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Qliro API key"
                required
                className="flex-1"
              />
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-y-1.5">
            <Label htmlFor="qliro-merchant-id" size="small" weight="plus">
              Merchant ID
            </Label>
            <Input
              id="qliro-merchant-id"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="Enter Qliro merchant ID"
              required
            />
          </div>

          <div className="flex flex-col gap-y-1.5">
            <Label size="small" weight="plus">Environment</Label>
            <div className="flex items-center gap-x-2">
              <Switch
                checked={environment === "production"}
                onCheckedChange={(checked) =>
                  setEnvironment(checked ? "production" : "sandbox")
                }
              />
              <Text size="small">
                {environment === "production" ? "Production" : "Sandbox"}
              </Text>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-ui-border-base pt-4">
            <Button
              size="small"
              variant="secondary"
              type="button"
              onClick={() => verifyMutation.mutate()}
              disabled={!data?.is_configured || verifyMutation.isPending}
              isLoading={verifyMutation.isPending}
            >
              Test Connection
            </Button>
            <Button
              type="submit"
              size="small"
              disabled={saveMutation.isPending || !apiKey || !merchantId}
              isLoading={saveMutation.isPending}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Qliro",
  icon: CreditCard,
})

export default QliroSettingsPage
