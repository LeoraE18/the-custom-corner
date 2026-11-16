import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { openAdminAuthDatabase } from "./admin-auth-store.js";

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ORIGIN = "http://localhost:5173";

async function getUnusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function readFirstOrder(databasePath) {
  const SQL = await initSqlJs();
  const database = new SQL.Database(fs.readFileSync(databasePath));
  const result = database.exec(`
    SELECT id, customer_name, customer_phone, customer_email, items, subtotal, fulfillment, status, created_at
    FROM orders WHERE id = 1
  `);
  database.close();
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  return {
    id: row[0], customerName: row[1], customerPhone: row[2], customerEmail: row[3],
    items: JSON.parse(row[4] || "[]"), subtotal: row[5], fulfillment: row[6], status: row[7], createdAt: row[8],
  };
}

test("admin sessions protect order management while public checkout remains available", async (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "custom-corner-auth-"));
  const ordersPath = path.join(temporaryDirectory, "orders.sqlite");
  const authPath = path.join(temporaryDirectory, "admin-auth.sqlite");
  const sourceOrdersBytes = fs.readFileSync(path.join(backendDirectory, "orders.sqlite"));
  const sourceOrdersHash = createHash("sha256").update(sourceOrdersBytes).digest("hex");
  fs.writeFileSync(ordersPath, sourceOrdersBytes);

  const username = `test-${randomBytes(5).toString("hex")}`;
  const password = randomBytes(24).toString("base64url");
  const provisioned = spawnSync(process.execPath, ["create-admin.js"], {
    cwd: backendDirectory,
    encoding: "utf8",
    env: { ...process.env, ADMIN_AUTH_DATABASE_PATH: authPath, TCC_ADMIN_USERNAME: username, TCC_ADMIN_PASSWORD: password },
  });
  assert.equal(provisioned.status, 0, `first-admin provisioning should succeed: ${provisioned.stderr}`);
  const authDb = await openAdminAuthDatabase(authPath);
  const credentialQuery = authDb.prepare("SELECT password_salt, password_hash FROM administrators WHERE username = ?");
  credentialQuery.bind([username]);
  assert.equal(credentialQuery.step(), true);
  const storedCredential = credentialQuery.getAsObject();
  credentialQuery.free();
  assert.notEqual(storedCredential.password_hash, password, "the password is stored only as a derived hash");
  authDb.close();

  const duplicateProvision = spawnSync(process.execPath, ["create-admin.js"], {
    cwd: backendDirectory,
    encoding: "utf8",
    env: { ...process.env, ADMIN_AUTH_DATABASE_PATH: authPath, TCC_ADMIN_USERNAME: username, TCC_ADMIN_PASSWORD: password },
  });
  assert.notEqual(duplicateProvision.status, 0, "provisioning does not silently overwrite an existing administrator");
  authDb.close();

  const port = await getUnusedPort();
  const server = spawn(process.execPath, ["server.js"], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      TRUST_PROXY: "true",
      FRONTEND_ORIGIN,
      ORDERS_DATABASE_PATH: ordersPath,
      ADMIN_AUTH_DATABASE_PATH: authPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });
  t.after(async () => {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    assert.equal(createHash("sha256").update(fs.readFileSync(path.join(backendDirectory, "orders.sqlite"))).digest("hex"), sourceOrdersHash, "the real orders database was not changed");
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const waitUntilReady = async () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (server.exitCode !== null) throw new Error(`Backend exited before ready:\n${serverOutput}`);
      try {
        const response = await fetch(`${baseUrl}/api/health`);
        if (response.ok) return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error(`Backend did not become ready:\n${serverOutput}`);
  };
  await waitUntilReady();

  const sameOrigin = { Origin: FRONTEND_ORIGIN };
  const unauthenticatedHeaders = { ...sameOrigin, "Content-Type": "application/json" };
  assert.equal((await fetch(`${baseUrl}/api/orders`, { headers: sameOrigin })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/orders/1`, { headers: sameOrigin })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/orders`, { headers: { Origin: "https://attacker.example" } })).status, 403);
  assert.equal((await fetch(`${baseUrl}/api/orders/1/status`, {
    method: "PATCH", headers: unauthenticatedHeaders, body: JSON.stringify({ status: "Completed" }),
  })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })).status, 403);

  const originalOrderOne = await readFirstOrder(ordersPath);
  const persistedOrderOne = await readFirstOrder(path.join(backendDirectory, "orders.sqlite"));
  assert.deepEqual(originalOrderOne, persistedOrderOne, "order #1 starts identical in the isolated test copy");

  const failedLogin = () => fetch(`${baseUrl}/api/auth/login`, {
    method: "POST", headers: { ...sameOrigin, "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.40" },
    body: JSON.stringify({ username, password: "incorrect-passphrase" }),
  });
  assert.equal((await failedLogin()).status, 401);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST", headers: { ...sameOrigin, "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.41" },
      body: JSON.stringify({ username, password: "incorrect-passphrase" }),
    });
  }
  const rateLimited = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST", headers: { ...sameOrigin, "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.41" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(rateLimited.status, 429, "repeated password guesses are throttled");

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST", headers: { ...sameOrigin, "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.42" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(loginResponse.status, 200);
  const setCookie = loginResponse.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  const cookie = setCookie.split(";")[0];
  const authenticatedHeaders = { ...sameOrigin, Cookie: cookie };

  const sessionResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: authenticatedHeaders });
  assert.equal(sessionResponse.status, 200);
  assert.equal((await sessionResponse.json()).administrator.username, username);

  const listResponse = await fetch(`${baseUrl}/api/orders`, { headers: authenticatedHeaders });
  assert.equal(listResponse.status, 200);
  const orderList = await listResponse.json();
  if (originalOrderOne) assert.deepEqual(orderList.orders.find((order) => order.id === 1), originalOrderOne);
  const orderOneResponse = await fetch(`${baseUrl}/api/orders/1`, { headers: authenticatedHeaders });
  if (originalOrderOne) {
    assert.equal(orderOneResponse.status, 200);
    assert.deepEqual((await orderOneResponse.json()).order, originalOrderOne);
  } else {
    assert.equal(orderOneResponse.status, 404);
  }

  const customerOrderResponse = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "Integration Test Customer", customerPhone: "0500000000", customerEmail: "customer@example.test",
      items: [{ productId: 1, name: "Personalized Sweatshirt", price: 145, quantity: 1, size: "M", color: "Blue", font: "Classic", vinylColor: "White", personalization: "Test" }],
      subtotal: 145,
    }),
  });
  assert.equal(customerOrderResponse.status, 201, "checkout remains public");
  const customerOrder = await customerOrderResponse.json();
  const statusResponse = await fetch(`${baseUrl}/api/orders/${customerOrder.orderId}/status`, {
    method: "PATCH", headers: { ...authenticatedHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ status: "Confirmed" }),
  });
  assert.equal(statusResponse.status, 200);
  assert.equal((await statusResponse.json()).order.status, "Confirmed");
  assert.deepEqual(await readFirstOrder(ordersPath), originalOrderOne, "testing status changes leaves order #1 unchanged");

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: authenticatedHeaders });
  assert.equal(logoutResponse.status, 204);
  assert.equal((await fetch(`${baseUrl}/api/auth/me`, { headers: authenticatedHeaders })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/orders`, { headers: authenticatedHeaders })).status, 401);
  assert.deepEqual(await readFirstOrder(ordersPath), originalOrderOne, "order #1 remains unchanged after logout");
});
