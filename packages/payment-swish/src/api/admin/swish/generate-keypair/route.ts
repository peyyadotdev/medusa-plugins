import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import * as forge from "node-forge"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { payeeAlias } = req.body as { payeeAlias?: string }

  if (!payeeAlias || !/^\d{10}$/.test(payeeAlias)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A valid Swish number (10 digits) is required to generate a CSR."
    )
  }

  const keypair = forge.pki.rsa.generateKeyPair({ bits: 4096 })

  const csr = forge.pki.createCertificationRequest()
  csr.publicKey = keypair.publicKey
  csr.setSubject([
    { name: "commonName", value: payeeAlias },
    { name: "organizationName", value: payeeAlias },
    { name: "countryName", value: "SE" },
  ])
  csr.sign(keypair.privateKey, forge.md.sha256.create())

  const csrPem = forge.pki.certificationRequestToPem(csr)
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey)

  const settingsService = req.scope.resolve("pluginSettings")

  const existingSettings =
    (await settingsService.getDecryptedSettings("swish")) || {}

  await settingsService.saveSettings("swish", "payment", "Swish", {
    ...existingSettings,
    payeeAlias,
    privateKeyPem,
    csrPem,
    certificateStep: "csr_generated",
  })

  return res.json({
    csr: csrPem,
    payeeAlias,
    message:
      "RSA key pair generated. Upload the CSR to the Swish Certificate Portal (portal.swish.nu).",
  })
}
