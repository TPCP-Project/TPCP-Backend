const crypto = require("crypto");

class CryptoService {
  constructor() {
    this.algorithm = "aes-256-gcm";
    this.key = crypto
      .createHash("sha256")
      .update(String(process.env.ENCRYPTION_KEY || "dev-secret-key"))
      .digest();
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(plaintext), "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
  }

  decrypt(encryptedBase64) {
    const data = Buffer.from(encryptedBase64, "base64");
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }

  // Gracefully handle tokens that may already be plaintext or were
  // encrypted with a different key/format. If decryption fails, return input.
  safeDecryptOrPlain(possiblyEncrypted) {
    if (!possiblyEncrypted) return "";
    try {
      // Quick sanity check: base64 strings are typically longer and match regex
      const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(possiblyEncrypted);
      if (!looksBase64) return String(possiblyEncrypted);
      return this.decrypt(possiblyEncrypted);
    } catch (_err) {
      return String(possiblyEncrypted);
    }
  }
}

module.exports = new CryptoService();
