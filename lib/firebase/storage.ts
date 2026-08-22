import { getStorageBucket } from "./client";
import crypto from "crypto";

/**
 * Uploads an image buffer or base64 string to Firebase Cloud Storage.
 * If Firebase Storage bucket is not enabled/available, it gracefully returns
 * the compressed base64 image data URL so the project still saves completely in Firestore.
 */
export async function uploadScreenshotToFirebaseStorage(
  imageSource: string | Buffer,
  projectId: string,
  index: number
): Promise<string> {
  if (typeof imageSource === "string" && (imageSource.startsWith("http://") || imageSource.startsWith("https://"))) {
    // Already a remote URL
    return imageSource;
  }

  try {
    const bucket = getStorageBucket();
    if (!bucket) {
      // Fallback: return raw string for direct Firestore storage
      return typeof imageSource === "string" ? imageSource : `data:image/jpeg;base64,${imageSource.toString("base64")}`;
    }

    let buffer: Buffer;
    let contentType = "image/jpeg";

    if (Buffer.isBuffer(imageSource)) {
      buffer = imageSource;
    } else if (typeof imageSource === "string" && imageSource.startsWith("data:")) {
      const parts = imageSource.split(",");
      const meta = parts[0];
      const base64Data = parts[1] || "";
      buffer = Buffer.from(base64Data, "base64");

      if (meta.includes("image/png")) contentType = "image/png";
      else if (meta.includes("image/webp")) contentType = "image/webp";
      else contentType = "image/jpeg";
    } else {
      buffer = Buffer.from(String(imageSource), "base64");
    }

    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const filename = `projects/${projectId}/screenshot_${index}_${Date.now()}.${extension}`;
    const file = bucket.file(filename);
    const downloadToken = crypto.randomUUID();

    await file.save(buffer, {
      contentType,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    const encodedPath = encodeURIComponent(filename);
    const bucketName = bucket.name;
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
  } catch (err) {
    console.warn("[FirebaseStorage] Cloud storage upload warning (falling back to direct Firestore storage):", err);
    // Graceful fallback to direct string
    return typeof imageSource === "string" ? imageSource : `data:image/jpeg;base64,${imageSource.toString("base64")}`;
  }
}
