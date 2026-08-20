/**
 * Formula Injection Protection for Google Sheets & CSV export
 * Prevents formula execution when user input begins with =, +, -, @, \t, \r, etc.
 */
export function sanitizeForSheet(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value).trim();
  if (!str) return "";

  // Check if string starts with formula characters
  const unsafeFirstChars = ["=", "+", "-", "@", "\t", "\r", "|", "%"];
  if (unsafeFirstChars.some((char) => str.startsWith(char))) {
    // Prefix with single quote to force Sheets/Excel to treat as literal string
    return `'${str}`;
  }

  return str;
}

/**
 * Strips leading formula escape apostrophe when reading from sheet
 */
export function unescapeFromSheet(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.startsWith("'") && str.length > 1) {
    const nextChar = str.charAt(1);
    if (["=", "+", "-", "@", "\t", "\r", "|", "%"].includes(nextChar)) {
      return str.substring(1);
    }
  }
  return str;
}

export function sanitizeRow<T extends Record<string, unknown>>(row: T): Record<keyof T, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    result[key] = sanitizeForSheet(val);
  }
  return result as Record<keyof T, string>;
}
