import sharp from "sharp";

/**
 * Validates magic bytes of an image buffer
 */
export function validateImageMagicBytes(buffer: Buffer): { isValid: boolean; format?: "jpeg" | "png" | "webp" } {
  if (!buffer || buffer.length < 12) {
    return { isValid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, format: "jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, format: "png" };
  }

  // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, format: "webp" };
  }

  return { isValid: false };
}

/**
 * Strips EXIF metadata, resizes to max 600px long edge, compresses to JPEG 65% quality (~20-30KB)
 * Returns a clean base64 data URI string or null if processing fails
 */
export async function processScreenshotBase64(base64OrDataUrl: string): Promise<string | null> {
  try {
    if (!base64OrDataUrl || typeof base64OrDataUrl !== "string") return null;

    // If it's already an HTTP URL (e.g. from seed or external host), return as is
    if (base64OrDataUrl.startsWith("http://") || base64OrDataUrl.startsWith("https://")) {
      return base64OrDataUrl;
    }

    // Extract raw base64 data
    const matches = base64OrDataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    const rawBase64 = matches ? matches[2] : base64OrDataUrl;
    const inputBuffer = Buffer.from(rawBase64, "base64");

    // Enforce hard raw input size limit before processing (e.g. 10MB)
    if (inputBuffer.length > 10 * 1024 * 1024) {
      console.warn("[ImageSecurity] Input image exceeds 10MB raw limit");
      return null;
    }

    // Validate magic bytes
    const magicCheck = validateImageMagicBytes(inputBuffer);
    if (!magicCheck.isValid) {
      console.warn("[ImageSecurity] Image failed magic bytes validation");
      return null;
    }

    // Process with Sharp: strip metadata (EXIF/ICC), resize, optimize JPEG
    const processedBuffer = await sharp(inputBuffer)
      .rotate() // Auto-orient based on EXIF before stripping
      .resize({
        width: 600,
        height: 600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 68,
        progressive: true,
        mozjpeg: true,
      })
      .withMetadata({
        // Strip EXIF, keep no author/location data
        exif: undefined,
        orientation: undefined,
      })
      .toBuffer();

    // Check processed size (Sheets cell cap is 50,000 chars, base64 length = ceil(bytes/3)*4)
    // 30KB buffer is ~40KB base64, well within the 50,000 char limit
    const outputBase64 = `data:image/jpeg;base64,${processedBuffer.toString("base64")}`;
    if (outputBase64.length > 48000) {
      // Emergency extra compression if somehow oversized
      const extraCompressed = await sharp(processedBuffer)
        .resize(450, 450, { fit: "inside" })
        .jpeg({ quality: 50 })
        .toBuffer();
      return `data:image/jpeg;base64,${extraCompressed.toString("base64")}`;
    }

    return outputBase64;
  } catch (error) {
    console.error("[ImageSecurity] Failed to process image:", error);
    return null;
  }
}
