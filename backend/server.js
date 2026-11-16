
import express from "express";
import cors from "cors";
import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import { openAdminAuthDatabase, saveAdminAuthDatabase, verifyPassword } from "./admin-auth-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = process.env.ORDERS_DATABASE_PATH || path.join(__dirname, "orders.sqlite");
const ADMIN_AUTH_DATABASE_PATH = process.env.ADMIN_AUTH_DATABASE_PATH || path.join(__dirname, "admin-auth.sqlite");
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const SESSION_COOKIE = IS_PRODUCTION ? "__Host-tcc_admin_session" : "tcc_admin_session";
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_CONCURRENT_PASSWORD_CHECKS = 4;

const app = express();

if (IS_PRODUCTION && !process.env.FRONTEND_ORIGIN) {
  throw new Error("Set FRONTEND_ORIGIN to the deployed storefront origin in production.");
}
if (IS_PRODUCTION && !process.env.TRUST_PROXY) {
  console.warn("Production mode: set TRUST_PROXY=true when TLS terminates at a trusted reverse proxy.");
}
try {
  if (new URL(FRONTEND_ORIGIN).origin !== FRONTEND_ORIGIN) throw new Error();
} catch {
  throw new Error("FRONTEND_ORIGIN must be an exact origin, without a path or trailing slash.");
}
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json({ limit: "1mb" }));
app.disable("x-powered-by");

let db;
let authDb;
const loginAttempts = new Map();
let activePasswordChecks = 0;
const fakePasswordSalt = randomBytes(16).toString("hex");
const fakePasswordHash = randomBytes(64).toString("hex");

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readSessionToken(req) {
  const prefix = `${SESSION_COOKIE}=`;
  const cookie = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!cookie) return "";
  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return "";
  }
}

function requireSameOrigin(req, res, next) {
  if (req.get("Origin") !== FRONTEND_ORIGIN) {
    return res.status(403).json({ success: false, message: "Request origin is not allowed." });
  }
  next();
}

function setAuthCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_LIFETIME_MS,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "strict",
    path: "/",
  });
}

function findAdministrator(username) {
  const statement = authDb.prepare("SELECT username, password_salt, password_hash FROM administrators WHERE username = ?");
  statement.bind([username]);
  const administrator = statement.step() ? statement.getAsObject() : null;
  statement.free();
  return administrator;
}

function findSession(token) {
  const statement = authDb.prepare(`
    SELECT s.username, s.expires_at FROM admin_sessions s
    INNER JOIN administrators a ON a.username = s.username
    WHERE s.token_hash = ?
  `);
  statement.bind([hashSessionToken(token)]);
  const session = statement.step() ? statement.getAsObject() : null;
  statement.free();
  return session;
}

function deleteSession(token) {
  const statement = authDb.prepare("DELETE FROM admin_sessions WHERE token_hash = ?");
  statement.run([hashSessionToken(token)]);
  statement.free();
  if (authDb.getRowsModified() > 0) saveAdminAuthDatabase(authDb, ADMIN_AUTH_DATABASE_PATH);
}

function requireAdmin(req, res, next) {
  res.set("Cache-Control", "no-store");
  const token = readSessionToken(req);
  if (!token || !authDb) {
    return res.status(401).json({ success: false, authRequired: true, message: "Administrator login required." });
  }

  const session = findSession(token);
  if (!session) {
    clearAuthCookie(res);
    return res.status(401).json({ success: false, authRequired: true, message: "Administrator login required." });
  }
  if (Date.parse(session.expires_at) <= Date.now()) {
    deleteSession(token);
    clearAuthCookie(res);
    return res.status(401).json({ success: false, authRequired: true, message: "Administrator session expired." });
  }

  req.admin = { username: session.username };
  next();
}

function getLoginAttemptState(ip) {
  if (loginAttempts.size > 10000) {
    const now = Date.now();
    for (const [attemptIp, record] of loginAttempts) {
      if (record.windowStartedAt + LOGIN_WINDOW_MS <= now) loginAttempts.delete(attemptIp);
    }
  }
  const current = loginAttempts.get(ip);
  if (!current || current.windowStartedAt + LOGIN_WINDOW_MS <= Date.now()) {
    return { count: 0, windowStartedAt: Date.now() };
  }
  return current;
}

function saveDatabase() {
  fs.writeFileSync(DATABASE_PATH, Buffer.from(db.export()));
}

function parseItems(value) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

function formatOrder(row) {
  return {
    id: row[0],
    customerName: row[1],
    customerPhone: row[2],
    customerEmail: row[3],
    items: parseItems(row[4]),
    subtotal: row[5],
    fulfillment: row[6],
    status: row[7],
    createdAt: row[8],
  };
}

function getOrder(id) {
  const result = db.exec(
    "SELECT id, customer_name, customer_phone, customer_email, items, subtotal, fulfillment, status, created_at FROM orders WHERE id = ?"
  );

  // Use a prepared statement for the requested ID.
  const statement = db.prepare(
    "SELECT id, customer_name, customer_phone, customer_email, items, subtotal, fulfillment, status, created_at FROM orders WHERE id = ?"
  );

  statement.bind([id]);
  let order = null;

  if (statement.step()) {
    order = formatOrder(statement.get());
  }

  statement.free();
  return order;
}

async function startServer() {
  const SQL = await initSqlJs();

  db = fs.existsSync(DATABASE_PATH)
    ? new SQL.Database(fs.readFileSync(DATABASE_PATH))
    : new SQL.Database();
  authDb = await openAdminAuthDatabase(ADMIN_AUTH_DATABASE_PATH);
  authDb.run("DELETE FROM admin_sessions WHERE expires_at <= ?", [new Date().toISOString()]);
  if (authDb.getRowsModified() > 0) saveAdminAuthDatabase(authDb, ADMIN_AUTH_DATABASE_PATH);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      fulfillment TEXT,
      status TEXT NOT NULL DEFAULT 'New',
      created_at TEXT NOT NULL
    )
  `);

  app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "API is running." });
  });

  app.post("/api/auth/login", requireSameOrigin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    let attempt = getLoginAttemptState(ip);
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      const retryAfter = Math.max(1, Math.ceil((attempt.windowStartedAt + LOGIN_WINDOW_MS - Date.now()) / 1000));
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ success: false, message: "Too many sign-in attempts. Please try again later." });
    }

    const { username, password } = req.body ?? {};
    if (typeof username !== "string" || typeof password !== "string" || username.length > 64 || password.length > 1024) {
      return res.status(400).json({ success: false, message: "Enter a valid username and password." });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const administrator = authDb ? findAdministrator(normalizedUsername) : null;
    const salt = administrator?.password_salt || fakePasswordSalt;
    const expectedHash = administrator?.password_hash || fakePasswordHash;
    if (activePasswordChecks >= MAX_CONCURRENT_PASSWORD_CHECKS) {
      res.set("Retry-After", "2");
      return res.status(429).json({ success: false, message: "The sign-in service is busy. Please try again shortly." });
    }
    activePasswordChecks += 1;
    let passwordMatches;
    try {
      passwordMatches = await verifyPassword(password, salt, expectedHash);
    } finally {
      activePasswordChecks -= 1;
    }
    if (!administrator || !passwordMatches) {
      attempt = { ...attempt, count: attempt.count + 1 };
      loginAttempts.set(ip, attempt);
      return res.status(401).json({ success: false, message: "The username or password is incorrect." });
    }

    loginAttempts.delete(ip);
    const oldToken = readSessionToken(req);
    if (oldToken) deleteSession(oldToken);
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString();
    const insert = authDb.prepare("INSERT INTO admin_sessions (token_hash, username, expires_at, created_at) VALUES (?, ?, ?, ?)");
    insert.run([hashSessionToken(token), administrator.username, expiresAt, now.toISOString()]);
    insert.free();
    saveAdminAuthDatabase(authDb, ADMIN_AUTH_DATABASE_PATH);
    setAuthCookie(res, token);
    res.json({ success: true, administrator: { username: administrator.username }, expiresAt });
  });

  app.get("/api/auth/me", requireSameOrigin, requireAdmin, (req, res) => {
    res.json({ success: true, administrator: req.admin });
  });

  app.post("/api/auth/logout", requireSameOrigin, (req, res) => {
    res.set("Cache-Control", "no-store");
    const token = readSessionToken(req);
    if (token && authDb) deleteSession(token);
    clearAuthCookie(res);
    res.status(204).end();
  });

  app.post("/api/orders", (req, res) => {
    try {
      const {
        customerName,
        customerPhone,
        customerEmail = "",
        items,
        subtotal,
      } = req.body ?? {};

      if (
        typeof customerName !== "string" ||
        !customerName.trim() ||
        typeof customerPhone !== "string" ||
        !customerPhone.trim() ||
        !Array.isArray(items) ||
        items.length === 0 ||
        !Number.isFinite(Number(subtotal)) ||
        Number(subtotal) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide valid order information.",
        });
      }

      const statement = db.prepare(`
        INSERT INTO orders
        (customer_name, customer_phone, customer_email,
         items, subtotal, fulfillment, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'New', ?)
      `);

      statement.run([
        customerName.trim(),
        customerPhone.trim(),
        typeof customerEmail === "string" ? customerEmail.trim() : "",
        JSON.stringify(items),
        Number(subtotal),
        "Store Pickup",
        new Date().toISOString(),
      ]);

      statement.free();

      const orderId = db.exec(
        "SELECT last_insert_rowid()"
      )[0].values[0][0];

      saveDatabase();

      res.status(201).json({
        success: true,
        orderId,
        id: orderId,
        message: "Order submitted successfully.",
      });
    } catch (error) {
      console.error("Error saving order:", error);
      res.status(500).json({
        success: false,
        message: "Could not save order.",
      });
    }
  });

  app.get("/api/orders", requireSameOrigin, requireAdmin, (req, res) => {
    try {
      const statement = db.prepare(`
        SELECT id, customer_name, customer_phone, customer_email,
        items, subtotal, fulfillment, status, created_at
        FROM orders ORDER BY id DESC
      `);

      const orders = [];

      while (statement.step()) {
        orders.push(formatOrder(statement.get()));
      }

      statement.free();

      res.json({ success: true, orders });
    } catch (error) {
      console.error("Error retrieving orders:", error);
      res.status(500).json({
        success: false,
        message: "Could not retrieve orders.",
      });
    }
  });

  app.get("/api/orders/:id", requireSameOrigin, requireAdmin, (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid order number.",
      });
    }

    const order = getOrder(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    res.json({ success: true, order });
  });

  app.patch("/api/orders/:id/status", requireSameOrigin, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};

    const allowedStatuses = [
      "New",
      "Confirmed",
      "Ready for pickup",
      "Completed",
      "Cancelled",
    ];

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid order number.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    if (!getOrder(id)) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const statement = db.prepare(
      "UPDATE orders SET status = ? WHERE id = ?"
    );

    statement.run([status, id]);
    statement.free();

    saveDatabase();

    res.json({
      success: true,
      order: getOrder(id),
    });
  });

  app.listen(PORT, () => {
    console.log(`The Custom Corner backend running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exit(1);
});
