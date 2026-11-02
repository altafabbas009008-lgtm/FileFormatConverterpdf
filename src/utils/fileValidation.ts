export interface ValidationResult {
  isValid: boolean;
  isEncrypted: boolean;
  error?: string;
}

/**
 * Validates whether the byte array starts with the standard PDF magic header '%PDF-'
 * and checks for password-protection flags.
 */
export function validatePdfBytes(bytes: Uint8Array): ValidationResult {
  if (!bytes || bytes.length < 5) {
    return {
      isValid: false,
      isEncrypted: false,
      error: 'File is empty or too small to be a valid PDF.',
    };
  }

  // Check magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  const isPdfHeader =
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d;   // -

  if (!isPdfHeader) {
    return {
      isValid: false,
      isEncrypted: false,
      error: 'Invalid PDF format: Missing %PDF- signature in header.',
    };
  }

  // Fast scan of the first 2048 bytes and trailer to detect obvious /Encrypt dictionary
  const headerSample = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 2048)));
  const trailerSample = new TextDecoder('latin1').decode(
    bytes.slice(Math.max(0, bytes.length - 2048))
  );

  const hasEncryptToken =
    headerSample.includes('/Encrypt') || trailerSample.includes('/Encrypt');

  return {
    isValid: true,
    isEncrypted: hasEncryptToken,
  };
}
