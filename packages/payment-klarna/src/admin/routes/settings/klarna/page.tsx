import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Label, Input, Select, Switch, toast, Badge } from "@medusajs/ui"
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

const KlarnaSettingsPage = () => {
  const queryClient = useQueryClient()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [region, setRegion] = useState("eu")
  const [environment, setEnvironment] = useState("playground")
  const [showPassword, setShowPassword] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["plugin-settings", "klarna"],
    queryFn: () =>
      sdk.client.fetch<SettingsResponse>(
        "/admin/plugin-settings/klarna"
      ),
  })

  useEffect(() => {
    if (data?.settings) {
      setUsername((data.settings.username as string) || "")
      setPassword((data.settings.password as string) || "")
      setRegion((data.settings.region as string) || "eu")
      setEnvironment((data.settings.environment as string) || "playground")
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/plugin-settings/klarna`, {
        method: "POST",
        body: {
          category: "payment",
          display_name: "Klarna Checkout",
          settings: { username, password, region, environment },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "klarna"] })
      toast.success("Klarna settings saved")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save settings")
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/plugin-settings/klarna/verify`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "klarna"] })
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
          <Heading level="h1">Klarna Checkout</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Configure your Klarna payment provider credentials and region.
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
            <Label htmlFor="klarna-username" size="small" weight="plus">
              API Username
            </Label>
            <Input
              id="klarna-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="PK12345_abcdef"
              required
            />
            <Text size="xsmall" className="text-ui-fg-muted">
              Found in the Klarna Merchant Portal under API Credentials.
            </Text>
          </div>

          <div className="flex flex-col gap-y-1.5">
            <Label htmlFor="klarna-password" size="small" weight="plus">
              API Password
            </Label>
            <div className="flex items-center gap-x-1">
              <Input
                id="klarna-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter API password"
                required
                className="flex-1"
              />
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-y-1.5">
              <Label size="small" weight="plus">Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <Select.Trigger>
                  <Select.Value placeholder="Select region" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="eu">Europe (EU)</Select.Item>
                  <Select.Item value="na">North America (NA)</Select.Item>
                  <Select.Item value="oc">Oceania (OC)</Select.Item>
                </Select.Content>
              </Select>
            </div>

            <div className="flex flex-col gap-y-1.5">
              <Label size="small" weight="plus">Environment</Label>
              <div className="flex items-center gap-x-2 pt-1">
                <Switch
                  checked={environment === "production"}
                  onCheckedChange={(checked) =>
                    setEnvironment(checked ? "production" : "playground")
                  }
                />
                <Text size="small">
                  {environment === "production" ? "Production" : "Playground"}
                </Text>
              </div>
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
              disabled={saveMutation.isPending || !username || !password}
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
  label: "Klarna",
  icon: CreditCard,
})

export default KlarnaSettingsPage
