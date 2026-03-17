import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function deriveKey(passphrase: string): Buffer {
  return createHash("sha256").update(passphrase).digest()
}

export function encrypt(plaintext: string, passphrase: string): string {
  const key = deriveKey(passphrase)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag()

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

export function decrypt(encrypted: string, passphrase: string): string {
  const parts = encrypted.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format")
  }

  const [ivHex, authTagHex, ciphertext] = parts as [string, string, string]
  const key = deriveKey(passphrase)
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}
