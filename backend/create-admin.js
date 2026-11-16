import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword, openAdminAuthDatabase, saveAdminAuthDatabase } from "./admin-auth-store.js";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const authDatabasePath = process.env.ADMIN_AUTH_DATABASE_PATH || path.join(backendDirectory, "admin-auth.sqlite");

async function askHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal, or set TCC_ADMIN_USERNAME and TCC_ADMIN_PASSWORD.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const finish = (error) => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") return finish(new Error("Setup cancelled."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          stdout.write("\b \b");
        } else if (character >= " ") {
          value += character;
          stdout.write("*");
        }
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  let username;
  let password;

  if (process.env.TCC_ADMIN_USERNAME || process.env.TCC_ADMIN_PASSWORD) {
    if (!process.env.TCC_ADMIN_USERNAME || !process.env.TCC_ADMIN_PASSWORD) {
      throw new Error("Set both TCC_ADMIN_USERNAME and TCC_ADMIN_PASSWORD, or set neither and use the interactive prompts.");
    }
    username = process.env.TCC_ADMIN_USERNAME;
    password = process.env.TCC_ADMIN_PASSWORD;
  } else {
    const terminal = readline.createInterface({ input: stdin, output: stdout });
    username = await terminal.question("Administrator username: ");
    terminal.close();
    password = await askHidden("Administrator password (input hidden): ");
    const confirmation = await askHidden("Confirm password: ");
    if (password !== confirmation) throw new Error("Passwords do not match.");
  }

  username = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
    throw new Error("Use a username with 3–64 letters, numbers, dots, underscores, or hyphens.");
  }
  if (password.length < 14 || password.length > 1024) {
    throw new Error("Choose a password between 14 and 1024 characters. A long passphrase works well.");
  }

  const database = await openAdminAuthDatabase(authDatabasePath);
  const statement = database.prepare("SELECT username FROM administrators WHERE username = ?");
  statement.bind([username]);
  const exists = statement.step();
  statement.free();
  if (exists) {
    database.close();
    throw new Error(`Administrator “${username}” already exists; no account was changed.`);
  }

  const { salt, hash } = await hashPassword(password);
  const insert = database.prepare("INSERT INTO administrators (username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?)");
  insert.run([username, salt, hash, new Date().toISOString()]);
  insert.free();
  saveAdminAuthDatabase(database, authDatabasePath);
  database.close();

  console.log(`Administrator “${username}” created in ${authDatabasePath}.`);
  console.log("The password was stored as a scrypt hash. Keep this auth database backed up and private.");
}

main().catch((error) => {
  console.error(`Could not create administrator: ${error.message}`);
  process.exitCode = 1;
});
