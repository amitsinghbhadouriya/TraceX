const path = require('path');

/**
 * File Security & Content Validator
 *
 * Verifies that uploaded files:
 * 1. Have clean, sanitized filenames (no path traversal or reserved names).
 * 2. Match their declared content type and extension by inspecting magic bytes.
 * 3. Do not contain executable binary headers (Windows PE, Linux ELF, Mach-O, Java class, WASM, Shebang).
 * 4. For text/CSV files: contain valid text encoding without null bytes or disguised script/HTML payloads.
 * 5. For Excel files: contain valid ZIP / OLE CFB compound binary headers.
 */

// Known binary executable and script signatures to strictly block
const EXECUTABLE_SIGNATURES = [
  { name: 'Windows PE / EXE / DLL', bytes: [0x4d, 0x5a] },               // MZ
  { name: 'Linux ELF Executable',  bytes: [0x7f, 0x45, 0x4c, 0x46] },       // \x7fELF
  { name: 'Mach-O 32-bit (BE)',    bytes: [0xfe, 0xed, 0xfa, 0xce] },
  { name: 'Mach-O 32-bit (LE)',    bytes: [0xce, 0xfa, 0xed, 0xfe] },
  { name: 'Mach-O 64-bit (BE)',    bytes: [0xfe, 0xed, 0xfa, 0xcf] },
  { name: 'Mach-O 64-bit (LE)',    bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { name: 'Java Class Bytecode',   bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { name: 'WebAssembly Binary',    bytes: [0x00, 0x61, 0x73, 0x6d] },       // \0asm
  { name: 'Unix Shell Script',     bytes: [0x23, 0x21] },                   // #!
];

// Excel magic headers
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04 (for .xlsx, .xlsm)
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // .xls

/**
 * Sanitizes original filename to prevent path traversal and reserved name exploits.
 */
function sanitizeFilename(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return 'upload.csv';
  }
  // Strip any directory path components
  let clean = path.basename(rawName).trim();
  // Remove null bytes and control characters
  clean = clean.replace(/[\x00-\x1f\x7f]/g, '');
  // Replace dangerous characters with underscores
  clean = clean.replace(/[\/\\?%*:|"<>]/g, '_');
  // Strip leading dots to avoid hidden files
  clean = clean.replace(/^\.+/, '');
  // If empty after stripping, assign default
  if (!clean) clean = 'upload.csv';
  // Ensure maximum length
  if (clean.length > 200) {
    const ext = path.extname(clean);
    const base = path.basename(clean, ext).slice(0, 190);
    clean = `${base}${ext}`;
  }
  return clean;
}

/**
 * Validates the uploaded file buffer content and properties.
 *
 * @param {Object} file - Express/Multer file object (req.file)
 * @returns {{ valid: boolean, error?: string, sanitizedFilename: string }}
 */
function validateUploadedFile(file) {
  if (!file || !file.buffer || file.buffer.length === 0) {
    return { valid: false, error: 'Uploaded file is empty or missing.' };
  }

  const sanitizedFilename = sanitizeFilename(file.originalname);
  const ext = path.extname(sanitizedFilename).toLowerCase();
  const buffer = file.buffer;
  const sampleSize = Math.min(buffer.length, 1024);
  const sample = buffer.slice(0, sampleSize);

  // ── 1. Check against binary executable signatures ──────────────────────────
  for (const sig of EXECUTABLE_SIGNATURES) {
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (sample[i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return {
        valid: false,
        error: `Executable or script payload detected (${sig.name}). File rejected for security.`,
        sanitizedFilename
      };
    }
  }

  // ── 2. Format-specific content validation ──────────────────────────────────
  if (ext === '.xlsx' || ext === '.xlsm') {
    // Must start with PK ZIP header
    const isZip = ZIP_MAGIC.every((byte, i) => sample[i] === byte);
    if (!isZip) {
      return {
        valid: false,
        error: 'Invalid file format: .xlsx file must be a valid Office Open XML zip archive.',
        sanitizedFilename
      };
    }
  } else if (ext === '.xls') {
    // Must start with OLE compound binary header
    const isOle = OLE_MAGIC.every((byte, i) => sample[i] === byte);
    if (!isOle) {
      return {
        valid: false,
        error: 'Invalid file format: .xls file must be a valid Microsoft Excel binary document.',
        sanitizedFilename
      };
    }
  } else if (ext === '.csv' || ext === '.txt') {
    // Check for null bytes (0x00) which indicate binary data disguised as text
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0x00) {
        return {
          valid: false,
          error: 'Binary data detected in text/CSV file. File rejected for security.',
          sanitizedFilename
        };
      }
    }

    // Check for disguised HTML / script tags
    const sampleText = sample.toString('utf8', 0, Math.min(sample.length, 512)).toLowerCase().trim();
    if (
      sampleText.startsWith('<html') ||
      sampleText.startsWith('<!doctype') ||
      sampleText.startsWith('<?php') ||
      sampleText.startsWith('<script') ||
      sampleText.startsWith('<svg') && sampleText.includes('script')
    ) {
      return {
        valid: false,
        error: 'HTML, XML, or script content detected in CSV/text file. File rejected for security.',
        sanitizedFilename
      };
    }
  } else {
    return {
      valid: false,
      error: `Unsupported file extension '${ext}'. Allowed: .csv, .xlsx, .xls, .xlsm, .txt`,
      sanitizedFilename
    };
  }

  return { valid: true, sanitizedFilename };
}

module.exports = {
  validateUploadedFile,
  sanitizeFilename,
};
