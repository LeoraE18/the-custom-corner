import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import initSqlJs from "sql.js";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function openAdminAuthDatabase(databasePath) {
  const SQL = await initSqlJs();
  const database = fs.existsSync(databasePath)
    ? new SQL.Database(fs.readFileSync(databasePath))
    : new SQL.Database();

  database.run(`
    CREATE TABLE IF NOT EXISTS administrators (
      username TEXT PRIMARY KEY COLLATE NOCASE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (username) REFERENCES administrators(username) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires_at);
  `);

  return database;
}

export function saveAdminAuthDatabase(database, databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.writeFileSync(databasePath, Buffer.from(database.export()), { mode: 0o600 });
  try {
    fs.chmodSync(databasePath, 0o600);
  } catch {
    // Windows does not support POSIX file modes; the file remains protected by its ACL.
  }
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return { salt: salt.toString("hex"), hash: derivedKey.toString("hex") };
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  const salt = Buffer.from(saltHex, "hex");
  const expectedHash = Buffer.from(expectedHashHex, "hex");
  if (salt.length !== 16 || expectedHash.length !== KEY_LENGTH) return false;
  const actualHash = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return timingSafeEqual(actualHash, expectedHash);
}
