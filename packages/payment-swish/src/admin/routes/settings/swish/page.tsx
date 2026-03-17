import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container, Heading, Text, Button, Label, Input, Switch, toast, Badge,
  Textarea, Copy,
} from "@medusajs/ui"
import {
  CreditCard, ArrowRight, ArrowLeft, CheckCircleSolid, XCircleSolid,
  ExclamationCircle, ArrowUpTray, Link as LinkIcon,
} from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect, useCallback, useRef } from "react"
import { sdk } from "../../../lib/client"

type SettingsResponse = {
  settings: {
    payeeAlias?: string
    callbackUrl?: string
    environment?: string
    certificateStep?: string
    csrPem?: string
    certificateBase64?: string
    certificateDetails?: {
      commonName: string
      issuer: string
      validFrom: string
      validTo: string
      serialNumber: string
    }
  } | null
  is_configured: boolean
  is_verified: boolean
  verified_at: string | null
}

const SWISH_PORTAL_URL = "https://portal.swish.nu"

const SwishSettingsPage = () => {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [payeeAlias, setPayeeAlias] = useState("")
  const [callbackUrl, setCallbackUrl] = useState("")
  const [environment, setEnvironment] = useState("test")
  const [csrPem, setCsrPem] = useState("")
  const [certFileContent, setCertFileContent] = useState("")
  const [certPassword, setCertPassword] = useState("")
  const [useTestCert, setUseTestCert] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["plugin-settings", "swish"],
    queryFn: () =>
      sdk.client.fetch<SettingsResponse>("/admin/plugin-settings/swish"),
  })

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings
      if (s.payeeAlias) setPayeeAlias(s.payeeAlias)
      if (s.callbackUrl) setCallbackUrl(s.callbackUrl)
      if (s.environment) setEnvironment(s.environment)
      if (s.csrPem) setCsrPem(s.csrPem)

      if (s.certificateStep === "certificate_created" || data.is_verified) {
        setStep(4)
      } else if (s.certificateStep === "csr_generated") {
        setStep(2)
      } else if (s.payeeAlias) {
        setStep(1)
      }
    }
  }, [data])

  useEffect(() => {
    if (!callbackUrl) {
      const host = typeof window !== "undefined" ? window.location.origin : ""
      setCallbackUrl(`${host}/hooks/payment/swish_swish`)
    }
  }, [callbackUrl])

  const generateKeypairMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ csr: string }>(`/admin/swish/generate-keypair`, {
        method: "POST",
        body: { payeeAlias },
      }),
    onSuccess: (resp) => {
      setCsrPem(resp.csr)
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "swish"] })
      toast.success("RSA key pair and CSR generated")
      setStep(2)
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate key pair")
    },
  })

  const createCertMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/swish/create-certificate`, {
        method: "POST",
        body: {
          signedCertificatePem: certFileContent,
          password: certPassword,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "swish"] })
      toast.success("Certificate bundle created")
      setStep(3)
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create certificate bundle")
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/swish/verify`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "swish"] })
      toast.success("Swish connection verified")
      setStep(4)
    },
    onError: (err: Error) => {
      toast.error(err.message || "Connection test failed")
    },
  })

  const saveFinalMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/plugin-settings/swish`, {
        method: "POST",
        body: {
          category: "payment",
          display_name: "Swish",
          settings: {
            ...(data?.settings || {}),
            payeeAlias,
            callbackUrl,
            environment,
          },
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "swish"] })
      toast.success("Swish settings saved and activated")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save settings")
    },
  })

  const loadTestCertMutation = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/plugin-settings/swish`, {
        method: "POST",
        body: {
          category: "payment",
          display_name: "Swish",
          settings: {
            payeeAlias: payeeAlias || "1231181189",
            callbackUrl,
            environment: "test",
            certificateStep: "certificate_created",
            useTestCertificate: true,
          },
        },
      }),
    onSuccess: () => {
      setEnvironment("test")
      queryClient.invalidateQueries({ queryKey: ["plugin-settings", "swish"] })
      toast.success("Swish test certificate loaded")
      setStep(3)
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to load test certificate")
    },
  })

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (evt) => {
        const content = evt.target?.result as string
        setCertFileContent(content)
      }
      reader.readAsText(file)
    },
    []
  )

  const handleCopyCSR = useCallback(() => {
    navigator.clipboard.writeText(csrPem)
    toast.success("CSR copied to clipboard")
  }, [csrPem])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Text className="text-ui-fg-subtle">Loading...</Text>
      </div>
    )
  }

  const steps = [
    { id: "basic", label: "Basic Info" },
    { id: "generate", label: "Generate CSR" },
    { id: "upload", label: "Upload Certificate" },
    { id: "verify", label: "Verify" },
    { id: "summary", label: "Summary" },
  ]

  const certDetails = data?.settings?.certificateDetails

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Swish Payment</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Configure Swish with mTLS certificate authentication.
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
        <div className="px-6 py-4">
          {/* Step indicator */}
          <div className="flex items-center gap-x-1 mb-6 overflow-x-auto">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => idx <= step && setStep(idx)}
                disabled={idx > step}
                className={`flex items-center gap-x-1.5 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  idx === step
                    ? "bg-ui-bg-base-pressed text-ui-fg-base"
                    : idx < step
                      ? "text-ui-fg-subtle cursor-pointer hover:bg-ui-bg-base-hover"
                      : "text-ui-fg-disabled cursor-default"
                }`}
              >
                {idx < step ? (
                  <CheckCircleSolid className="text-ui-fg-interactive w-4 h-4" />
                ) : (
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                      idx === step
                        ? "bg-ui-fg-base text-ui-bg-base"
                        : "bg-ui-bg-switch-off text-ui-fg-on-color"
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
                <Text size="small" weight={idx === step ? "plus" : "regular"}>
                  {s.label}
                </Text>
              </button>
            ))}
          </div>

          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="flex flex-col gap-y-4">
              <div className="flex flex-col gap-y-1.5">
                <Label htmlFor="swish-payee-alias" size="small" weight="plus">
                  Swish Number (Payee Alias)
                </Label>
                <Input
                  id="swish-payee-alias"
                  value={payeeAlias}
                  onChange={(e) => setPayeeAlias(e.target.value.replace(/\D/g, ""))}
                  placeholder="1234567890"
                  maxLength={10}
                  required
                />
                <Text size="xsmall" className="text-ui-fg-muted">
                  Your 10-digit Swish merchant number from your bank agreement.
                </Text>
              </div>

              <div className="flex flex-col gap-y-1.5">
                <Label htmlFor="swish-callback" size="small" weight="plus">
                  Callback URL
                </Label>
                <Input
                  id="swish-callback"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="https://your-store.com/hooks/payment/swish_swish"
                  required
                />
                <Text size="xsmall" className="text-ui-fg-muted">
                  Webhook URL where Swish will send payment status updates.
                </Text>
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

              <div className="flex justify-end pt-4 border-t border-ui-border-base">
                <Button
                  size="small"
                  onClick={() => setStep(1)}
                  disabled={!payeeAlias || payeeAlias.length !== 10 || !callbackUrl}
                >
                  Next <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Generate CSR */}
          {step === 1 && (
            <div className="flex flex-col gap-y-4">
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                <Text size="small" weight="plus" className="mb-2">
                  Certificate Setup
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Swish requires mTLS (mutual TLS) authentication. You need a client
                  certificate signed by Swish. Click below to generate an RSA key
                  pair and Certificate Signing Request (CSR).
                </Text>
              </div>

              <div className="flex flex-col gap-y-3">
                <Button
                  size="small"
                  onClick={() => generateKeypairMutation.mutate()}
                  disabled={generateKeypairMutation.isPending}
                  isLoading={generateKeypairMutation.isPending}
                >
                  Generate RSA Key & CSR
                </Button>

                <div className="flex items-center gap-x-2">
                  <div className="h-px flex-1 bg-ui-border-base" />
                  <Text size="xsmall" className="text-ui-fg-muted">or</Text>
                  <div className="h-px flex-1 bg-ui-border-base" />
                </div>

                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    setUseTestCert(true)
                    loadTestCertMutation.mutate()
                  }}
                  disabled={loadTestCertMutation.isPending}
                  isLoading={loadTestCertMutation.isPending}
                >
                  Use Swish Test Certificate (Sandbox)
                </Button>
                <Text size="xsmall" className="text-ui-fg-muted">
                  Loads pre-made test credentials for development. Skips certificate steps.
                </Text>
              </div>

              {csrPem && (
                <div className="flex flex-col gap-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <Label size="small" weight="plus">
                      Generated CSR
                    </Label>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={handleCopyCSR}
                      type="button"
                    >
                      Copy to Clipboard
                    </Button>
                  </div>
                  <Textarea
                    value={csrPem}
                    readOnly
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-ui-border-base">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setStep(0)}
                >
                  <ArrowLeft /> Back
                </Button>
                <Button
                  size="small"
                  onClick={() => setStep(2)}
                  disabled={!csrPem}
                >
                  Next <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Upload Signed Certificate */}
          {step === 2 && (
            <div className="flex flex-col gap-y-4">
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                <div className="flex items-start gap-x-2">
                  <ExclamationCircle className="text-ui-fg-interactive mt-0.5" />
                  <div>
                    <Text size="small" weight="plus" className="mb-1">
                      Upload your signed certificate from Swish
                    </Text>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>
                        <Text size="small" className="text-ui-fg-subtle inline">
                          Log in to the{" "}
                          <a
                            href={SWISH_PORTAL_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ui-fg-interactive underline"
                          >
                            Swish Certificate Portal
                          </a>
                        </Text>
                      </li>
                      <li>
                        <Text size="small" className="text-ui-fg-subtle inline">
                          Upload the CSR from the previous step
                        </Text>
                      </li>
                      <li>
                        <Text size="small" className="text-ui-fg-subtle inline">
                          Download the signed certificate (client.pem)
                        </Text>
                      </li>
                      <li>
                        <Text size="small" className="text-ui-fg-subtle inline">
                          Upload it below
                        </Text>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <a
                href={SWISH_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="small" variant="secondary" type="button">
                  <LinkIcon /> Open Swish Certificate Portal
                </Button>
              </a>

              <div className="flex flex-col gap-y-1.5">
                <Label size="small" weight="plus">
                  Signed Certificate (.pem)
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pem,.crt,.cer"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-x-2">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <ArrowUpTray /> Choose File
                  </Button>
                  <Text size="small" className="text-ui-fg-muted">
                    {certFileContent ? "File loaded" : "No file selected"}
                  </Text>
                </div>
              </div>

              {certFileContent && (
                <div className="flex flex-col gap-y-1.5">
                  <Label htmlFor="cert-password" size="small" weight="plus">
                    Certificate Password (optional)
                  </Label>
                  <Input
                    id="cert-password"
                    type="password"
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                    placeholder="Leave empty for no password"
                  />
                </div>
              )}

              <Button
                size="small"
                onClick={() => createCertMutation.mutate()}
                disabled={!certFileContent || createCertMutation.isPending}
                isLoading={createCertMutation.isPending}
              >
                Create Certificate Bundle
              </Button>

              <div className="flex items-center justify-between pt-4 border-t border-ui-border-base">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft /> Back
                </Button>
                <Button
                  size="small"
                  onClick={() => setStep(3)}
                  disabled={!data?.settings?.certificateBase64}
                >
                  Next <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Verify Connection */}
          {step === 3 && (
            <div className="flex flex-col gap-y-4">
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                <Text size="small" weight="plus" className="mb-2">
                  Test your Swish connection
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  This will make an mTLS request to the Swish{" "}
                  {environment === "production" ? "production" : "test"} API to
                  verify your certificate is working correctly.
                </Text>
              </div>

              {certDetails && (
                <div className="rounded-lg border border-ui-border-base p-4">
                  <Text size="small" weight="plus" className="mb-2">
                    Certificate Details
                  </Text>
                  <div className="grid grid-cols-2 gap-2">
                    <Text size="xsmall" className="text-ui-fg-muted">CN:</Text>
                    <Text size="xsmall">{certDetails.commonName}</Text>
                    <Text size="xsmall" className="text-ui-fg-muted">Issuer:</Text>
                    <Text size="xsmall">{certDetails.issuer}</Text>
                    <Text size="xsmall" className="text-ui-fg-muted">Valid From:</Text>
                    <Text size="xsmall">
                      {new Date(certDetails.validFrom).toLocaleDateString()}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted">Valid To:</Text>
                    <Text size="xsmall">
                      {new Date(certDetails.validTo).toLocaleDateString()}
                    </Text>
                  </div>
                </div>
              )}

              <Button
                size="small"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                isLoading={verifyMutation.isPending}
              >
                Test Connection to Swish
              </Button>

              <div className="flex items-center justify-between pt-4 border-t border-ui-border-base">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft /> Back
                </Button>
                <Button size="small" onClick={() => setStep(4)}>
                  Next <ArrowRight />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div className="flex flex-col gap-y-4">
              <Text size="small" weight="plus" leading="compact">
                Configuration Summary
              </Text>

              <div className="rounded-lg border border-ui-border-base p-4">
                <div className="grid grid-cols-[120px,1fr] gap-y-2 gap-x-4">
                  <Text size="xsmall" className="text-ui-fg-muted">Swish Number:</Text>
                  <Text size="xsmall">{payeeAlias || data?.settings?.payeeAlias || "—"}</Text>

                  <Text size="xsmall" className="text-ui-fg-muted">Callback URL:</Text>
                  <Text size="xsmall" className="break-all">
                    {callbackUrl || data?.settings?.callbackUrl || "—"}
                  </Text>

                  <Text size="xsmall" className="text-ui-fg-muted">Environment:</Text>
                  <Text size="xsmall">
                    {(environment || data?.settings?.environment || "test") === "production"
                      ? "Production"
                      : "Test"}
                  </Text>

                  <Text size="xsmall" className="text-ui-fg-muted">Certificate:</Text>
                  <Text size="xsmall">
                    {data?.settings?.certificateBase64
                      ? "Configured"
                      : "Not configured"}
                  </Text>

                  <Text size="xsmall" className="text-ui-fg-muted">Status:</Text>
                  <div>
                    {data?.is_verified ? (
                      <div className="flex items-center gap-x-1">
                        <CheckCircleSolid className="text-ui-fg-interactive w-3 h-3" />
                        <Text size="xsmall">Verified</Text>
                      </div>
                    ) : (
                      <div className="flex items-center gap-x-1">
                        <XCircleSolid className="text-ui-tag-orange-icon w-3 h-3" />
                        <Text size="xsmall">Unverified</Text>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {certDetails &&
                new Date(certDetails.validTo).getTime() - Date.now() <
                  30 * 24 * 60 * 60 * 1000 && (
                <div className="rounded-lg border border-ui-tag-orange-border bg-ui-tag-orange-bg p-3">
                  <div className="flex items-center gap-x-2">
                    <ExclamationCircle className="text-ui-tag-orange-icon" />
                    <Text size="small" weight="plus">
                      Certificate expires on{" "}
                      {new Date(certDetails.validTo).toLocaleDateString()}
                    </Text>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-ui-border-base">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setStep(3)}
                >
                  <ArrowLeft /> Back
                </Button>
                <Button
                  size="small"
                  onClick={() => saveFinalMutation.mutate()}
                  disabled={saveFinalMutation.isPending}
                  isLoading={saveFinalMutation.isPending}
                >
                  Save & Activate
                </Button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Swish",
  icon: CreditCard,
})

export default SwishSettingsPage
