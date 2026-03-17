import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container, Heading, Text, Button, Label, Input, Switch, toast, Badge,
} from "@medusajs/ui"
import { BuildingStorefront } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { sdk } from "../../../lib/client"

type SettingsResponse = {
  settings: {
    apiKey?: string
    customerNumber?: string
    environment?: string
    senderName?: string
    senderStreet?: string
    senderPostalCode?: string
    senderCity?: string
    senderCountryCode?: string
  } | null
  is_configured: boolean
  is_verified: boolean
  verified_at: string | null
}

const PostNordSettingsPage = () => {
  const queryClient = useQueryClient()

  const [apiKey, setApiKey] = useState("")
  const [customerNumber, setCustomerNumber] = useState("")
  const [environment, setEnvironment] = useState("test")
  const [showKey, setShowKey] = useState(false)

  const [senderName, setSenderName] = useState("")
  const [senderStreet, setSenderStreet] = useState("")
  const [senderPostalCode, setSenderPostalCode] = useState("")
  const [senderCity, setSenderCity] = useState("")
  const [senderCountryCode, setSenderCountryCode] = useState("SE")

  const { data, isLoading } = useQuery({
    queryKey: ["plugin-settings", "postnord"],
    queryFn: () =>
      sdk.client.fetch<SettingsResponse>("/admin/plugin-settings/postnord"),
  })

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings
      setApiKey(s.apiKey || "")
      setCustomerNumber(s.customerNumber || "")
      setEnvironment(s.environment || "test")
      setSenderName(s.senderName || "")
      setSenderStreet(s.senderStreet || "")
      setSenderPostalCode(s.senderPostalCode || "")
      setSenderCity(s.senderCity || "")
      setSenderCountryCode(s.senderCountryCode || "SE")
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/plugin-settings/postnord`, {
        method: "POST",
        body: {
          category: "fulfillment",
          display_name: "PostNord",
          settings: {
            apiKey,
            customerNumber,
            environment,
            senderName,
            senderStreet,
            senderPostalCode,
            senderCity,
            senderCountryCode,
            senderAddress: {
              name: senderName,
              street: senderStreet,
              postalCode: senderPostalCode,
              city: senderCity,
              countryCode: senderCountryCode,
            },
          },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "postnord"] })
      toast.success("PostNord settings saved")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save settings")
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/plugin-settings/postnord/verify`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "postnord"] })
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
          <Heading level="h1">PostNord Fulfillment</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Configure your PostNord shipping integration.
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
          <Text size="small" weight="plus" leading="compact">
            API Credentials
          </Text>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-y-1.5">
              <Label htmlFor="pn-api-key" size="small" weight="plus">
                API Key
              </Label>
              <div className="flex items-center gap-x-1">
                <Input
                  id="pn-api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter PostNord API key"
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
              <Label htmlFor="pn-customer-number" size="small" weight="plus">
                Customer Number
              </Label>
              <Input
                id="pn-customer-number"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                placeholder="Agreement number"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-1.5">
            <Label size="small" weight="plus">Environment</Label>
            <div className="flex items-center gap-x-2">
              <Switch
                checked={environment === "production"}
                onCheckedChange={(checked) =>
                  setEnvironment(checked ? "production" : "test")
                }
              />
              <Text size="small">
                {environment === "production" ? "Production" : "Test"}
              </Text>
            </div>
          </div>

          <div className="border-t border-ui-border-base pt-4">
            <Text size="small" weight="plus" leading="compact" className="mb-3">
              Sender Address
            </Text>

            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1.5">
                <Label htmlFor="pn-sender-name" size="small" weight="plus">
                  Company Name
                </Label>
                <Input
                  id="pn-sender-name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Your Company AB"
                  required
                />
              </div>

              <div className="flex flex-col gap-y-1.5">
                <Label htmlFor="pn-sender-street" size="small" weight="plus">
                  Street Address
                </Label>
                <Input
                  id="pn-sender-street"
                  value={senderStreet}
                  onChange={(e) => setSenderStreet(e.target.value)}
                  placeholder="Storgatan 1"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-y-1.5">
                  <Label htmlFor="pn-sender-postal" size="small" weight="plus">
                    Postal Code
                  </Label>
                  <Input
                    id="pn-sender-postal"
                    value={senderPostalCode}
                    onChange={(e) => setSenderPostalCode(e.target.value)}
                    placeholder="111 22"
                    required
                  />
                </div>

                <div className="flex flex-col gap-y-1.5">
                  <Label htmlFor="pn-sender-city" size="small" weight="plus">
                    City
                  </Label>
                  <Input
                    id="pn-sender-city"
                    value={senderCity}
                    onChange={(e) => setSenderCity(e.target.value)}
                    placeholder="Stockholm"
                    required
                  />
                </div>

                <div className="flex flex-col gap-y-1.5">
                  <Label htmlFor="pn-sender-country" size="small" weight="plus">
                    Country Code
                  </Label>
                  <Input
                    id="pn-sender-country"
                    value={senderCountryCode}
                    onChange={(e) => setSenderCountryCode(e.target.value.toUpperCase())}
                    placeholder="SE"
                    maxLength={2}
                    required
                  />
                </div>
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
              disabled={
                saveMutation.isPending || !apiKey || !customerNumber || !senderName
              }
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
  label: "PostNord",
  icon: BuildingStorefront,
})

export default PostNordSettingsPage
