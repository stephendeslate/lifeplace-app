/**
 * Encryption Utility
 *
 * Provides AES-256 encryption for sensitive data stored in AsyncStorage.
 * The encryption key is stored securely in SecureStore (iOS Keychain / Android Keystore).
 *
 * Usage:
 *   const encrypted = await encryptedStorage.encrypt(sensitiveData);
 *   const decrypted = await encryptedStorage.decrypt(encrypted);
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import { logger } from './logger';

// Key storage configuration
const ENCRYPTION_KEY_NAME = '@lifeplace_encryption_key';

/**
 * Secure storage options for the encryption key.
 * WHEN_UNLOCKED_THIS_DEVICE_ONLY:
 * - Data is only accessible when device is unlocked
 * - Data cannot be transferred to other devices (iCloud backup excluded)
 * - Most secure option for encryption keys
 */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Generate a cryptographically secure 256-bit key
 * Uses expo-crypto for secure random byte generation
 */
async function generateEncryptionKey(): Promise<string> {
  // Generate 32 random bytes (256 bits) for AES-256
  const randomBytes = await Crypto.getRandomBytesAsync(32);

  // Convert to hex string for storage
  const hexKey = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hexKey;
}

/**
 * Get or create the encryption key
 * Key is stored in SecureStore (iOS Keychain / Android Keystore)
 */
async function getOrCreateKey(): Promise<string> {
  try {
    // Try to get existing key
    const existingKey = await SecureStore.getItemAsync(
      ENCRYPTION_KEY_NAME,
      SECURE_OPTIONS
    );

    if (existingKey) {
      return existingKey;
    }

    // Generate new key if none exists
    const newKey = await generateEncryptionKey();
    await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, newKey, SECURE_OPTIONS);

    logger.info('Generated new encryption key for offline storage');
    return newKey;
  } catch (error) {
    logger.error('Failed to get/create encryption key', { error });
    throw new Error('Encryption key unavailable');
  }
}

/**
 * Encrypt a string using AES-256
 * Returns base64-encoded ciphertext with IV prepended
 */
async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();

  // Generate random IV for each encryption
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const iv = CryptoJS.lib.WordArray.create(ivBytes as unknown as number[]);

  // Parse key from hex
  const keyWordArray = CryptoJS.enc.Hex.parse(key);

  // Encrypt with AES-256-CBC
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Prepend IV to ciphertext for decryption
  // Format: base64(IV) + ':' + base64(ciphertext)
  const ivBase64 = CryptoJS.enc.Base64.stringify(iv);
  const ciphertextBase64 = encrypted.toString();

  return `${ivBase64}:${ciphertextBase64}`;
}

/**
 * Decrypt a string encrypted with the encrypt() function
 */
async function decrypt(encryptedData: string): Promise<string> {
  const key = await getOrCreateKey();

  // Split IV and ciphertext
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivBase64, ciphertextBase64] = parts;

  // Parse IV and key
  const iv = CryptoJS.enc.Base64.parse(ivBase64);
  const keyWordArray = CryptoJS.enc.Hex.parse(key);

  // Decrypt
  const decrypted = CryptoJS.AES.decrypt(ciphertextBase64, keyWordArray, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Encrypt a JSON-serializable object
 */
async function encryptObject<T>(data: T): Promise<string> {
  const json = JSON.stringify(data);
  return encrypt(json);
}

/**
 * Decrypt and parse a JSON object
 */
async function decryptObject<T>(encryptedData: string): Promise<T> {
  const json = await decrypt(encryptedData);
  return JSON.parse(json) as T;
}

/**
 * Check if a string appears to be encrypted (has the IV:ciphertext format)
 */
function isEncrypted(data: string): boolean {
  if (!data || typeof data !== 'string') return false;

  const parts = data.split(':');
  if (parts.length !== 2) return false;

  // Check if first part looks like base64-encoded IV (should be ~24 chars for 16 bytes)
  const ivPart = parts[0];
  return ivPart.length >= 20 && ivPart.length <= 28;
}

/**
 * Clear the encryption key (use during logout to invalidate all encrypted data)
 */
async function clearEncryptionKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_NAME, SECURE_OPTIONS);
    logger.info('Encryption key cleared');
  } catch (error) {
    logger.error('Failed to clear encryption key', { error });
  }
}

export const encryptedStorage = {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  isEncrypted,
  clearEncryptionKey,
};
