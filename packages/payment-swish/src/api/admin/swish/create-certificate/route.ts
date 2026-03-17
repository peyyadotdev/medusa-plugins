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
  const { signedCertificatePem, password } = req.body as {
    signedCertificatePem?: string
    password?: string
  }

  if (!signedCertificatePem) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Signed certificate PEM content is required."
    )
  }

  const settingsService = req.scope.resolve("pluginSettings")
  const existingSettings = await settingsService.getDecryptedSettings("swish")

  if (!existingSettings?.privateKeyPem) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No private key found. Generate a key pair first."
    )
  }

  const privateKey = forge.pki.privateKeyFromPem(
    existingSettings.privateKeyPem as string
  )
  const certificate = forge.pki.certificateFromPem(signedCertificatePem)

  const certDetails = {
    commonName: certificate.subject.getField("CN")?.value || "",
    issuer: certificate.issuer.getField("CN")?.value || "",
    validFrom: certificate.validity.notBefore.toISOString(),
    validTo: certificate.validity.notAfter.toISOString(),
    serialNumber: certificate.serialNumber,
  }

  const p12Password = password || ""
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    privateKey,
    [certificate],
    p12Password,
    { algorithm: "3des" }
  )
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes()
  const p12Base64 = forge.util.encode64(p12Der)

  await settingsService.saveSettings("swish", "payment", "Swish", {
    ...existingSettings,
    certificateBase64: p12Base64,
    certificatePassword: p12Password,
    certificateStep: "certificate_created",
    certificateDetails: certDetails,
  })

  return res.json({
    success: true,
    certificate: certDetails,
    message: "P12 certificate bundle created and stored.",
  })
}
