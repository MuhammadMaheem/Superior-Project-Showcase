import { google } from "googleapis";

let sheetsClientInstance: ReturnType<typeof google.sheets> | null = null;

export function getGoogleSheetsClient() {
  if (sheetsClientInstance) return sheetsClientInstance;

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    return null;
  }

  // Handle newlines in environment variable
  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClientInstance = google.sheets({ version: "v4", auth });
    return sheetsClientInstance;
  } catch (error) {
    console.error("[GoogleSheets] Failed to initialize JWT auth:", error);
    return null;
  }
}

export function getSpreadsheetId(): string | null {
  const raw = process.env.GOOGLE_SHEET_ID;
  if (!raw) return null;
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return raw.trim() || null;
}
