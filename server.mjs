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

// Normalizes Albanian phone number to +3556XXXXXXXX format
function normalizeAlbanianPhone(raw) {
  if (!raw) return null;
  let digits = String(raw).trim().replace(/[\s\-\(\)\.]/g, "");
  if (digits.startsWith("00355")) {
    digits = "+355" + digits.slice(5);
  } else if (digits.startsWith("355") && !digits.startsWith("+355")) {
    digits = "+355" + digits.slice(3);
  }
  // If someone entered +3550..., strip the erroneous 0
  if (digits.startsWith("+3550")) {
    digits = "+355" + digits.slice(5);
  }
  if (digits.startsWith("06")) {
    digits = "+355" + digits.slice(1);
  } else if (digits.startsWith("6") && (digits.length === 8 || digits.length === 9)) {
    digits = "+355" + digits;
  }
  // Albanian mobile numbers: +355 6[6-9]XXXXXXX (8 or 9 digits after +355)
  if (/^\+3556[6-9]\d{6,7}$/.test(digits)) {
    return digits;
  }
  return null;
}

function formatAlbanianPhone(phone) {
  if (!phone) return "";
  if (phone.startsWith("+355")) {
    const sub = phone.slice(4);
    if (sub.length <= 8) {
      return `+355 ${sub.slice(0, 2)} ${sub.slice(2, 5)} ${sub.slice(5)}`;
    }
  }
  return phone;
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

function findUser(identifier) {
  if (!identifier) return null;
  return users().find((user) => user.phone === identifier || user.email === identifier || user.id === identifier) ?? null;
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
  if (!allowedOrigins.has(origin) && !origin.endsWith(".github.io") && !origin.endsWith(".onrender.com")) return {};
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

function signSession(identifier) {
  const payload = Buffer.from(JSON.stringify({ id: identifier, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 })).toString("base64url");
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
    const identifier = data.id || data.email;
    if (!identifier || data.exp < Date.now()) return null;
    return findUser(identifier);
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
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function tooManySends(entry) {
  const windowMs = 15 * 60 * 1000;
  const stamps = (entry?.sentAt || []).filter((time) => Date.now() - time < windowMs);
  return stamps.length >= 5;
}

async function sendSms(phone, code) {
  const formatted = formatAlbanianPhone(phone);
  const text = `Kodi juaj i verifikimit per Kalceto Shkoder eshte: ${code}. Vlen per 10 minuta.`;

  // 1. Twilio SMS Integration
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM;

  if (accountSid && authToken && fromNumber) {
    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const params = new URLSearchParams({ To: phone, From: fromNumber, Body: text });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[kalceto] Twilio error:", resData);
        throw new Error(resData.message || "Twilio nuk mundi te dergoje SMS.");
      }
      console.log(`[kalceto] SMS u dergua me sukses me Twilio te ${formatted}`);
      return { sent: true };
    } catch (err) {
      console.error("[kalceto] Twilio exception:", err.message);
      throw new Error(`Dërgimi i SMS dështoi: ${err.message}`);
    }
  }

  // 2. Infobip SMS Integration
  const infobipKey = process.env.INFOBIP_API_KEY;
  const infobipBase = process.env.INFOBIP_BASE_URL;
  const infobipFrom = process.env.INFOBIP_SENDER || "Kalceto";

  if (infobipKey && infobipBase) {
    try {
      const cleanBase = infobipBase.replace(/\/+$/, "");
      const res = await fetch(`${cleanBase}/sms/2/text/advanced`, {
        method: "POST",
        headers: {
          "Authorization": `App ${infobipKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [{
            from: infobipFrom,
            destinations: [{ to: phone }],
            text
          }]
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.requestError?.serviceException?.text || "Infobip SMS dështoi.");
      }
      console.log(`[kalceto] SMS u dërgua me Infobip te ${formatted}`);
      return { sent: true };
    } catch (err) {
      throw new Error(`Dërgimi i SMS dështoi: ${err.message}`);
    }
  }

  // If no SMS provider is configured, do not pretend to succeed
  console.log(`\n=================================================`);
  console.log(`⚠️ [KALCETO SMS - OPERATORI NUK ESHTE I KONFIGURUAR]`);
  console.log(`Numri: ${formatted} (${phone})`);
  console.log(`Kodi i gjeneruar në server: ${code}`);
  console.log(`Per te derguar SMS reale ne telefon:`);
  console.log(`Shtoni TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER ne .env ose Render.`);
  console.log(`=================================================\n`);

  const error = new Error("Shërbimi SMS nuk është i konfiguruar në server. Për të marrë SMS në celular, shtoni kredencialet e Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) në skedarin .env ose në Render.");
  error.status = 503;
  throw error;
}

async function sendCodeEmail(email, code, intent) {
  const subject = intent === "signup" ? "Kodi i regjistrimit në Kalceto" : "Kodi i hyrjes në Kalceto";
  const text = `Kodi juaj i konfirmimit për Kalceto është: ${code}. Vlen për 10 minuta.`;
  if (!mailer) {
    console.log(`[kalceto] Email not configured. Code for ${email}: ${code}`);
    return { sent: true, previewCode: code };
  }
  await mailer.sendMail({
    from: `"Kalceto Shkodër" <${gmailUser}>`,
    to: email,
    subject,
    text,
    html: `<div style="font-family:sans-serif;padding:24px;background:#f6f4ed;color:#13221c;max-width:480px;border-radius:8px">
      <h2 style="margin-top:0;color:#1e5a3f">KALCETO SHKODËR</h2>
      <p>Kodi juaj i konfirmimit është:</p>
      <p style="font-size:32px;letter-spacing:6px;font-weight:700;color:#f46f43;margin:16px 0">${code}</p>
      <p style="color:#69736c;font-size:13px">Ky kod skadon pas 10 minutash.</p>
    </div>`
  });
  return { sent: true, previewCode: code };
}

async function issueCode(identifier, intent, isPhone = true) {
  const map = codes();
  const current = map[identifier] || {};
  if (tooManySends(current)) {
    const error = new Error("Ju lutem prisni pak para se të kërkoni një kod të ri.");
    error.status = 429;
    throw error;
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  map[identifier] = {
    hash: hashValue(`${identifier}:${code}`),
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
    intent,
    isPhone,
    sentAt: [...(current.sentAt || []).filter((time) => Date.now() - time < 15 * 60 * 1000), Date.now()]
  };
  saveCodes(map);

  if (isPhone) {
    return await sendSms(identifier, code);
  } else {
    return await sendCodeEmail(identifier, code, intent);
  }
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

    // Identify whether this request is using Phone or Email
    const isPhoneReq = Boolean(body.phone || (!body.email && body.identifier && !body.identifier.includes("@")));
    let identifier = "";
    let rawPhone = body.phone || (!body.email ? body.identifier : "");
    let rawEmail = body.email || (body.identifier?.includes("@") ? body.identifier : "");

    if (isPhoneReq || rawPhone) {
      identifier = normalizeAlbanianPhone(rawPhone);
      if (!identifier) {
        return json(response, 400, { error: "Vendosni një numër të vlefshëm celular shqiptar (p.sh. 069 123 4567 ose 068 / 067 / 066)." }, {}, request);
      }
    } else {
      identifier = normalizeEmail(rawEmail);
      if (!isValidEmail(identifier)) {
        return json(response, 400, { error: "Vendosni një adresë të vlefshme email-i." }, {}, request);
      }
    }

    if (request.method === "POST" && pathname === "/api/auth/lookup") {
      const user = findUser(identifier);
      return json(response, 200, {
        exists: Boolean(user?.verified),
        identifier,
        formattedPhone: isPhoneReq ? formatAlbanianPhone(identifier) : null
      }, {}, request);
    }

    if (request.method === "POST" && pathname === "/api/auth/send-code") {
      const intent = body.intent === "signup" ? "signup" : (body.intent || "signin");
      const user = findUser(identifier);
      if (intent === "signin_only" && !user?.verified) {
        return json(response, 404, { error: "Nuk ekziston llogari me këtë numër. Regjistrohuni fillimisht." }, {}, request);
      }
      await issueCode(identifier, intent, isPhoneReq);
      return json(response, 200, {
        sent: true,
        identifier,
        phone: isPhoneReq ? identifier : null,
        formattedPhone: isPhoneReq ? formatAlbanianPhone(identifier) : null
      }, {}, request);
    }

    if (request.method === "POST" && pathname === "/api/auth/verify") {
      const code = String(body.code || "").trim();
      const map = codes();
      const entry = map[identifier];
      if (!entry || entry.expiresAt < Date.now()) {
        return json(response, 400, { error: "Kodi ka skaduar ose nuk ekziston. Kërkoni një kod të ri." }, {}, request);
      }
      if (entry.attempts >= 5) {
        return json(response, 429, { error: "Shumë përpjekje të gabuara. Kërkoni një kod të ri." }, {}, request);
      }
      entry.attempts += 1;
      if (entry.hash !== hashValue(`${identifier}:${code}`)) {
        saveCodes(map);
        return json(response, 400, { error: "Kodi i verifikimit nuk është i saktë. Ju lutem provoni përsëri." }, {}, request);
      }
      delete map[identifier];
      saveCodes(map);

      const list = users();
      let user = list.find((item) => (isPhoneReq && item.phone === identifier) || (!isPhoneReq && item.email === identifier));
      const isNewUser = !user;

      if (!user) {
        user = {
          id: "usr_" + randomBytes(8).toString("hex"),
          phone: isPhoneReq ? identifier : null,
          email: !isPhoneReq ? identifier : null,
          verified: true,
          profile: {
            displayName: body.displayName ? String(body.displayName).trim() : "",
            position: body.position || "Mesfushë",
            area: body.area || "Parrucë",
            level: body.level || "Regular"
          },
          createdAt: new Date().toISOString()
        };
        list.push(user);
      } else {
        user.verified = true;
        if (isPhoneReq && !user.phone) user.phone = identifier;
        if (!isPhoneReq && !user.email) user.email = identifier;
      }
      saveUsers(list);

      const token = signSession(identifier);
      return json(response, 200, {
        user: publicUser(user),
        token,
        isNewUser
      }, { "Set-Cookie": sessionCookie(token) }, request);
    }

    if (request.method === "POST" && pathname === "/api/auth/profile") {
      const user = sessionFromRequest(request);
      if (!user) return json(response, 401, { error: "Ju lutem hyni në llogari fillimisht." }, {}, request);
      const list = users();
      const current = list.find((item) => item.id === user.id || item.phone === user.phone || item.email === user.email);
      if (current) {
        current.profile = {
          displayName: String(body.displayName || current.profile?.displayName || "").trim(),
          position: String(body.position || current.profile?.position || "Mesfushë").trim(),
          area: String(body.area || current.profile?.area || "Parrucë").trim(),
          level: String(body.level || current.profile?.level || "Regular").trim()
        };
        saveUsers(list);
        return json(response, 200, { user: publicUser(current) }, {}, request);
      }
      return json(response, 404, { error: "Përdoruesi nuk u gjet." }, {}, request);
    }

    json(response, 404, { error: "Not found" }, {}, request);
  } catch (error) {
    const status = error.status || 500;
    json(response, status, { error: error.message || "Ndodhi një gabim në server." }, {}, request);
  }
}

function publicUser(user) {
  return {
    id: user.id || null,
    phone: user.phone || null,
    formattedPhone: user.phone ? formatAlbanianPhone(user.phone) : null,
    email: user.email || null,
    profile: user.profile || {}
  };
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
});
