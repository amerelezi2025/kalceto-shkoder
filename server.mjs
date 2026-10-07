import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import nodemailer from "nodemailer";

const root = process.cwd();
const dataDir = join(root, "data");
const types = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".html": "text/html",
  ".json": "application/json"
};

loadEnv();
mkdirSync(dataDir, { recursive: true });

const gmailUser = process.env.GMAIL_USER?.trim() || "";
const gmailPass = (process.env.GMAIL_APP_PASSWORD || "").replaceAll(" ", "");
const mailer = gmailUser && gmailPass
  ? nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } })
  : null;

function loadEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readJson(file, fallback) {
  const path = join(dataDir, file);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  writeFileSync(join(dataDir, file), `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashValue(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function users() {
  return readJson("users.json", []);
}

function saveUsers(list) {
  writeJson("users.json", list);
}

function findUser(email) {
  return users().find((user) => user.email === email) ?? null;
}

function codes() {
  return readJson("codes.json", {});
}

function saveCodes(map) {
  writeJson("codes.json", map);
}

const allowedOrigins = new Set([
  "https://amerelezi2025.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  ...(process.env.FRONTEND_ORIGIN || "").split(",").map((value) => value.trim()).filter(Boolean)
]);

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (!origin) return {};
  if (!allowedOrigins.has(origin) && !origin.endsWith(".onrender.com")) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };
}

function json(response, status, payload, extraHeaders = {}, request = null) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...(request ? corsHeaders(request) : {}),
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }));
}

function sessionSecret() {
  const path = join(dataDir, "secret.txt");
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (existsSync(path)) return readFileSync(path, "utf8").trim();
  const secret = randomBytes(32).toString("hex");
  writeFileSync(path, secret);
  return secret;
}

function signSession(email) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 })).toString("base64url");
  const signature = hashValue(`${payload}.${sessionSecret()}`);
  return `${payload}.${signature}`;
}

function readSession(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = hashValue(`${payload}.${sessionSecret()}`);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.email || data.exp < Date.now()) return null;
    return findUser(data.email);
  } catch {
    return null;
  }
}

function sessionCookie(token, clear = false) {
  const parts = [
    `kalceto_session=${clear ? "" : token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    clear ? "Max-Age=0" : "Max-Age=1209600"
  ];
  return parts.join("; ");
}

function sessionFromRequest(request) {
  const header = request.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return readSession(bearer || parseCookies(request).kalceto_session);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function tooManySends(entry) {
  const windowMs = 15 * 60 * 1000;
  const stamps = (entry?.sentAt || []).filter((time) => Date.now() - time < windowMs);
  return stamps.length >= 5;
}

async function sendCodeEmail(email, code, intent) {
  const subject = intent === "signup" ? "Your Kalceto signup code" : "Your Kalceto sign-in code";
  const text = `Your Kalceto confirmation code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`;
  if (!mailer) {
    console.log(`[kalceto] Gmail is not configured. Code for ${email}: ${code}`);
    throw new Error("Email sending is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to a .env file.");
  }
  await mailer.sendMail({
    from: `"Kalceto" <${gmailUser}>`,
    to: email,
    subject,
    text,
    html: `<p>Your Kalceto confirmation code is</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p><p>It expires in 10 minutes.</p>`
  });
}

async function issueCode(email, intent) {
  const map = codes();
  const current = map[email] || {};
  if (tooManySends(current)) {
    const error = new Error("Please wait a few minutes before requesting another code.");
    error.status = 429;
    throw error;
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  map[email] = {
    hash: hashValue(`${email}:${code}`),
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
    intent,
    sentAt: [...(current.sentAt || []).filter((time) => Date.now() - time < 15 * 60 * 1000), Date.now()]
  };
  saveCodes(map);
  await sendCodeEmail(email, code, intent);
}

async function handleAuth(request, response, pathname) {
  try {
    if (request.method === "GET" && pathname === "/api/auth/session") {
      const user = sessionFromRequest(request);
      return json(response, 200, { user: user ? publicUser(user) : null }, {}, request);
    }

    if (request.method === "POST" && pathname === "/api/auth/logout") {
      return json(response, 200, { ok: true }, { "Set-Cookie": sessionCookie("", true) }, request);
    }

    const body = await readBody(request);
    const email = normalizeEmail(body.email);

    if (request.method === "POST" && pathname === "/api/auth/lookup") {
      if (!isValidEmail(email)) return json(response, 400, { error: "Enter a valid email address." }, {}, request);
      const user = findUser(email);
      return json(response, 200, { exists: Boolean(user?.verified) }, {}, request);
    }

    if (request.method === "POST" && pathname === "/api/auth/send-code") {
      if (!isValidEmail(email)) return json(response, 400, { error: "Enter a valid email address." }, {}, request);
      const intent = body.intent === "signup" ? "signup" : "signin";
      const user = findUser(email);
      if (intent === "signin" && !user?.verified) {
        return json(response, 404, { error: "No Kalceto account exists for that email. Choose Create account instead." }, {}, request);
      }
      if (intent === "signup" && user?.verified) {
        return json(response, 409, { error: "That email already has a Kalceto account. Choose Sign in instead." }, {}, request);
      }
      await issueCode(email, intent);
      return json(response, 200, { sent: true }, {}, request);
    }

    if (request.method === "POST" && pathname === "/api/auth/verify") {
      const code = String(body.code || "").trim();
      const map = codes();
      const entry = map[email];
      if (!entry || entry.expiresAt < Date.now()) return json(response, 400, { error: "That code has expired. Request a new one." }, {}, request);
      if (entry.attempts >= 5) return json(response, 429, { error: "Too many attempts. Request a new code." }, {}, request);
      entry.attempts += 1;
      if (entry.hash !== hashValue(`${email}:${code}`)) {
        saveCodes(map);
        return json(response, 400, { error: "That code did not work. Check it and try again." }, {}, request);
      }
      delete map[email];
      saveCodes(map);
      const list = users();
      let user = list.find((item) => item.email === email);
      if (!user) {
        user = { email, verified: true, profile: {}, createdAt: new Date().toISOString() };
        list.push(user);
      } else {
        user.verified = true;
      }
      saveUsers(list);
      const token = signSession(email);
      return json(response, 200, { user: publicUser(user), token }, { "Set-Cookie": sessionCookie(token) }, request);
    }

    if (request.method === "POST" && pathname === "/api/auth/profile") {
      const user = sessionFromRequest(request);
      if (!user) return json(response, 401, { error: "Please sign in first." }, {}, request);
      const list = users();
      const current = list.find((item) => item.email === user.email);
      current.profile = {
        displayName: String(body.displayName || "").trim(),
        position: String(body.position || "").trim(),
        area: String(body.area || "").trim()
      };
      saveUsers(list);
      return json(response, 200, { user: publicUser(current) }, {}, request);
    }

    json(response, 404, { error: "Not found" }, {}, request);
  } catch (error) {
    const status = error.status || 500;
    json(response, status, { error: error.message || "Something went wrong." }, {}, request);
  }
}

function publicUser(user) {
  return { email: user.email, profile: user.profile || {} };
}

function serveFile(request, response) {
  const pathname = request.url.split("?")[0] === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = normalize(join(root, pathname));
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": `${types[extname(filePath)] || "application/octet-stream"}; charset=utf-8` });
  createReadStream(filePath).pipe(response);
}

const port = Number(process.env.PORT || 4173);

createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }
  const pathname = request.url.split("?")[0];
  if (pathname.startsWith("/api/auth/")) {
    await handleAuth(request, response, pathname);
    return;
  }
  serveFile(request, response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Kalceto preview: http://localhost:${port}`);
  if (!mailer) console.log("Add GMAIL_USER and GMAIL_APP_PASSWORD in .env so login codes can be emailed.");
});
