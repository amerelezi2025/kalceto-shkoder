// EDITABLE SITE DATA: replace these examples with real local player and pitch details.
const players = [
  { name: "Ardit Rrjolli", initials: "AR", position: "Midfielder", level: "Regular", area: "Parruce", matches: 18, online: true },
  { name: "Klea Deda", initials: "KD", position: "Defender", level: "Strong", area: "Rus", matches: 31, online: true },
  { name: "Mikel Guri", initials: "MG", position: "Striker", level: "Regular", area: "Perash", matches: 14, online: true },
  { name: "Era Kola", initials: "EK", position: "Goalkeeper", level: "New", area: "Parruce", matches: 6, online: true },
  { name: "Nerti Hoxha", initials: "NH", position: "Defender", level: "Regular", area: "Bahcallek", matches: 22, online: true },
  { name: "Dorjan Bushati", initials: "DB", position: "Midfielder", level: "Strong", area: "Rus", matches: 39, online: true },
  { name: "Sara Dervishi", initials: "SD", position: "Striker", level: "Regular", area: "Perash", matches: 11, online: true },
  { name: "Ervin Pjetri", initials: "EP", position: "Goalkeeper", level: "Strong", area: "Parruce", matches: 26, online: true }
];

const pitches = [
  { name: "Kalceto Parruce", area: "Parruce", details: "Fushë moderne 5v5 e mbuluar, ndriçim profesional, dush dhe bar.", image: "images/kalceto-1.jpg", map: "#" },
  { name: "Kalceto Rus Arena", area: "Rus", details: "Bar synthetic cilësor, ambient komod, parkim i garantuar.", image: "images/kalceto-2.jpg", map: "#" },
  { name: "Kalceto Perash Sport", area: "Perash", details: "Fushë 6v6 dhe 5v5, e përshtatshme për ndeshje mes miqsh.", image: "images/kalceto-3.jpg", map: "#" }
];

const playerList = document.querySelector("#player-list");
const searchInput = document.querySelector("#player-search");
const positionFilter = document.querySelector("#position-filter");
const levelFilter = document.querySelector("#level-filter");
const showMore = document.querySelector("#show-more-players");
let visiblePlayers = 5;

function renderPlayers() {
  const search = searchInput.value.trim().toLowerCase();
  const position = positionFilter.value;
  const level = levelFilter.value;
  const filtered = players.filter((player) => (
    player.name.toLowerCase().includes(search) &&
    (position === "all" || player.position === position) &&
    (level === "all" || player.level === level)
  ));
  playerList.innerHTML = filtered.slice(0, visiblePlayers).map((player) => `
    <article class="player-row">
      <div class="avatar">${player.initials}</div>
      <div><div class="player-name">${player.name}</div><div class="player-sub">${player.area} · ${player.matches} lojëra të luajtura</div></div>
      <span>${player.position}</span><span class="level">${player.level}</span>
      <button class="text-button player-connect" type="button" data-name="${player.name}">Fto në lojë <span aria-hidden="true">→</span></button>
    </article>`).join("") || `<p class="empty-state">Nuk u gjet asnjë lojtar me këto kritere.</p>`;
  showMore.hidden = filtered.length <= visiblePlayers;
}

document.querySelector("#pitch-list").innerHTML = pitches.map((pitch) => `
  <article class="pitch-card">
    <img src="${pitch.image}" onerror="this.onerror=null;this.src='images/placeholder.svg'" alt="Foto për ${pitch.name}" />
    <span class="photo-tag">FUSHË: ${pitch.name.toUpperCase()}</span>
    <div class="pitch-info">
      <h3>${pitch.name}</h3>
      <p>${pitch.details}</p>
      <div class="pitch-footer">
        <span>${pitch.area}, Shkodër</span>
        <a href="${pitch.map}" target="_blank" rel="noopener">Google Maps ↗</a>
      </div>
    </div>
  </article>`).join("");

renderPlayers();
[searchInput, positionFilter, levelFilter].forEach((control) => control.addEventListener("input", () => { visiblePlayers = 5; renderPlayers(); }));
showMore.addEventListener("click", () => { visiblePlayers += 5; renderPlayers(); });

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".primary-nav");
menuToggle.addEventListener("click", () => { const open = nav.classList.toggle("open"); menuToggle.setAttribute("aria-expanded", String(open)); });
nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => { nav.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); }));
window.addEventListener("scroll", () => document.querySelector(".site-header").classList.toggle("scrolled", window.scrollY > 6));

const levelNames = ["Fillestar", "Mesatar", "I rregullt", "I fortë", "Shumë i fortë"];
const skillRange = document.querySelector("#skill-range");
skillRange.addEventListener("input", () => document.querySelector("#skill-label").textContent = levelNames[skillRange.value - 1]);
document.querySelectorAll(".filter-chip").forEach((chip) => chip.addEventListener("click", () => { document.querySelectorAll(".filter-chip").forEach((item) => item.classList.remove("active")); chip.classList.add("active"); }));
document.querySelectorAll(".mode-tab").forEach((tab) => tab.addEventListener("click", () => { document.querySelectorAll(".mode-tab").forEach((item) => { item.classList.remove("active"); item.setAttribute("aria-selected", "false"); }); tab.classList.add("active"); tab.setAttribute("aria-selected", "true"); }));

document.querySelector("#match-button").addEventListener("click", () => {
  const score = 76 + Number(skillRange.value) * 4;
  const mode = document.querySelector(".mode-tab.active").dataset.mode;
  document.querySelector("#match-score").textContent = score;
  document.querySelector("#match-title").textContent = mode === "My team" ? "Ekip i balancuar po pret" : `Ndeshje ${mode}, 5v5 e ekuilibruar`;
  document.querySelector("#match-description").textContent = `Përshtatje ideale për ${document.querySelector("#match-time").value.toLowerCase()}. Fusha e rekomanduar: Kalceto Parrucë.`;
  showToast("Ndeshja më e përshtatshme u përditësua.");
});

// ==========================================
// AUTHENTICATION & ALBANIAN PHONE SMS LOGIC
// ==========================================

const dialog = document.querySelector("#account-dialog");
const authApiBase = window.KALCETO_AUTH?.apiBase ?? "";
let signedInUser = null;
let currentIdentifier = "";
let currentFormattedIdentifier = "";
let countdownTimerInterval = null;

// Normalization & Formatting Helpers
function normalizeAlbanianPhone(raw) {
  if (!raw) return null;
  let cleaned = String(raw).trim().replace(/[\s\-\(\)\.]/g, "");

  if (cleaned.startsWith("00355")) {
    cleaned = "+355" + cleaned.slice(5);
  } else if (cleaned.startsWith("355") && !cleaned.startsWith("+355")) {
    cleaned = "+355" + cleaned.slice(3);
  }

  // Strip 0 if someone entered +3550...
  if (cleaned.startsWith("+3550")) {
    cleaned = "+355" + cleaned.slice(5);
  }

  // Domestic format: 06[6-9]XXXXXXX
  if (/^06[6-9]\d{6,7}$/.test(cleaned)) {
    return "+355" + cleaned.slice(1);
  }

  // International format: +355 6[6-9]XXXXXXX
  if (/^\+3556[6-9]\d{6,7}$/.test(cleaned)) {
    return cleaned;
  }

  // Raw: 6[6-9]XXXXXXX
  if (/^6[6-9]\d{6,7}$/.test(cleaned)) {
    return "+355" + cleaned;
  }

  return null;
}

function formatAlbanianPhoneDisplay(phone) {
  if (!phone) return "";
  let p = phone.trim();
  if (p.startsWith("+355")) {
    let sub = p.slice(4);
    if (sub.length <= 8) {
      return `+355 ${sub.slice(0, 2)} ${sub.slice(2, 5)} ${sub.slice(5)}`;
    }
  }
  return p;
}

function formatPhoneInput(value) {
  let val = value.trim();
  if (val.startsWith("+")) {
    let digits = val.replace(/[^\d]/g, "");
    if (!digits.startsWith("355") && digits.length >= 1) {
      digits = "355" + digits;
    }
    let rest = digits.slice(3);
    // If user writes 0 after +355, remove 0 immediately so it never starts with 0
    if (rest.startsWith("0")) {
      rest = rest.slice(1);
    }
    rest = rest.slice(0, 9);
    if (!rest) return "+355 ";
    if (rest.length <= 2) return `+355 ${rest}`;
    if (rest.length <= 5) return `+355 ${rest.slice(0, 2)} ${rest.slice(2)}`;
    return `+355 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
  } else {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("355")) {
      let rest = digits.slice(3);
      if (rest.startsWith("0")) rest = rest.slice(1);
      rest = rest.slice(0, 9);
      if (rest.length <= 2) return `+355 ${rest}`;
      if (rest.length <= 5) return `+355 ${rest.slice(0, 2)} ${rest.slice(2)}`;
      return `+355 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
    }
    digits = digits.slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
}

// Live formatting on Phone Input
const phoneInput = document.querySelector("#auth-phone");
if (phoneInput) {
  phoneInput.addEventListener("input", (e) => {
    const cursor = e.target.selectionStart;
    const prevLen = e.target.value.length;
    e.target.value = formatPhoneInput(e.target.value);
    const newLen = e.target.value.length;
    if (cursor !== null && cursor < prevLen) {
      e.target.setSelectionRange(cursor + (newLen - prevLen), cursor + (newLen - prevLen));
    }
  });
}

function setAuthView(view) {
  document.querySelectorAll(".auth-panel").forEach((panel) => {
    panel.hidden = panel.id !== `${view}-step`;
  });
}

function setAuthStatus(id, message, isError = false) {
  const element = document.querySelector(id);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function authHeaders(hasBody) {
  const headers = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  const token = localStorage.getItem("kalceto_session");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function authRequest(path, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${authApiBase}/api/auth/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: authHeaders(body !== undefined),
      credentials: "include",
      signal: controller.signal,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    clearTimeout(timeoutId);
    let data = {};
    try { data = await response.json(); } catch { data = {}; }
    if (data.token) localStorage.setItem("kalceto_session", data.token);
    if (!response.ok) {
      throw new Error(data.error || "Ndodhi një gabim gjatë komunikimit me serverin.");
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Serveri vonoi të përgjigjej. Ju lutem provoni përsëri.");
    }
    throw error;
  }
}

// 6-Digit OTP Box Management
const otpDigits = document.querySelectorAll(".otp-digit");
const authCodeHidden = document.querySelector("#auth-code");

function getEnteredOtp() {
  return Array.from(otpDigits).map((input) => input.value).join("");
}

function setEnteredOtp(code) {
  const digits = String(code).replace(/\D/g, "").slice(0, 6).split("");
  otpDigits.forEach((input, index) => {
    input.value = digits[index] || "";
    input.classList.toggle("filled", Boolean(input.value));
  });
  if (authCodeHidden) authCodeHidden.value = getEnteredOtp();
}

function clearOtpInputs() {
  otpDigits.forEach((input) => {
    input.value = "";
    input.classList.remove("filled");
  });
  if (authCodeHidden) authCodeHidden.value = "";
}

otpDigits.forEach((input, index) => {
  input.addEventListener("input", (e) => {
    const val = e.target.value.replace(/\D/g, "");
    e.target.value = val ? val[val.length - 1] : "";
    e.target.classList.toggle("filled", Boolean(e.target.value));
    if (authCodeHidden) authCodeHidden.value = getEnteredOtp();

    if (e.target.value && index < otpDigits.length - 1) {
      otpDigits[index + 1].focus();
    }
    if (getEnteredOtp().length === 6) {
      document.querySelector("#code-form").requestSubmit();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      otpDigits[index - 1].focus();
      otpDigits[index - 1].value = "";
      otpDigits[index - 1].classList.remove("filled");
      if (authCodeHidden) authCodeHidden.value = getEnteredOtp();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpDigits[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < otpDigits.length - 1) {
      otpDigits[index + 1].focus();
    }
  });

  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const digits = pasted.replace(/\D/g, "").slice(0, 6);
    if (digits) {
      setEnteredOtp(digits);
      const nextIdx = Math.min(digits.length, 5);
      otpDigits[nextIdx].focus();
      if (digits.length === 6) {
        document.querySelector("#code-form").requestSubmit();
      }
    }
  });
});

// Countdown Timer for SMS Code Resend
function startResendCountdown(seconds = 60) {
  clearInterval(countdownTimerInterval);
  const countdownWrap = document.querySelector("#countdown-wrap");
  const countdownTimer = document.querySelector("#countdown-timer");
  const resendBtn = document.querySelector("#resend-code");
  if (!countdownWrap || !countdownTimer || !resendBtn) return;

  countdownWrap.style.display = "block";
  resendBtn.style.display = "none";
  let remaining = seconds;
  countdownTimer.textContent = `${remaining}s`;

  countdownTimerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(countdownTimerInterval);
      countdownWrap.style.display = "none";
      resendBtn.style.display = "inline-block";
    } else {
      countdownTimer.textContent = `${remaining}s`;
    }
  }, 1000);
}

// Request real carrier SMS from server
async function requestOtp(phone) {
  return await authRequest("send-code", {
    phone,
    intent: "signin"
  });
}

// Verify SMS OTP on server
async function verifyOtp(phone, code) {
  return await authRequest("verify", {
    phone,
    code
  });
}

function fillProfileForm(user) {
  if (!user) return;
  const nameInput = document.querySelector("#profile-name");
  const posInput = document.querySelector("#profile-position");
  const areaInput = document.querySelector("#profile-area");
  const levelInput = document.querySelector("#profile-level");

  if (nameInput) nameInput.value = user.profile?.displayName || "";
  if (posInput && user.profile?.position) posInput.value = user.profile.position;
  if (areaInput && user.profile?.area) areaInput.value = user.profile.area;
  if (levelInput && user.profile?.level) levelInput.value = user.profile.level;
}

function updateAccountUi(user) {
  signedInUser = user;
  if (user) {
    localStorage.setItem("kalceto_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("kalceto_user");
    localStorage.removeItem("kalceto_session");
  }

  fillProfileForm(user);

  // Update navigation button
  document.querySelectorAll(".profile-trigger").forEach((button) => {
    if (user) {
      const name = user.profile?.displayName || "Lojtar";
      const firstName = name.split(" ")[0];
      button.innerHTML = `<span style="display:inline-flex;align-items:center;gap:.45rem;"><span class="live-dot"></span> ${firstName}</span>`;
    } else {
      button.textContent = button.closest(".hero-actions") ? "Create profile" : "Sign in";
    }
  });

  // Populate view card
  if (user) {
    const name = user.profile?.displayName || "Lojtar Kalceto";
    const initials = name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "LK";
    const phoneDisplay = user.formattedPhone || formatAlbanianPhone(user.phone) || user.email || "+355 69 ...";
    const pos = user.profile?.position || "Mesfushë";
    const area = user.profile?.area || "Parrucë";

    const viewAvatar = document.querySelector("#view-avatar");
    if (viewAvatar) viewAvatar.textContent = initials;
    const viewName = document.querySelector("#view-name");
    if (viewName) viewName.textContent = name;
    const viewPhone = document.querySelector("#view-phone");
    if (viewPhone) viewPhone.textContent = phoneDisplay;
    const viewMeta = document.querySelector("#view-meta");
    if (viewMeta) viewMeta.textContent = `${pos} · ${area}, Shkodër`;
  }
}

// Dialog Triggers
document.querySelectorAll(".profile-trigger").forEach((button) => {
  button.addEventListener("click", () => {
    if (signedInUser) {
      setAuthView("account-view");
    } else {
      setAuthView("phone");
    }
    dialog.showModal();
  });
});

document.querySelector(".dialog-close")?.addEventListener("click", () => dialog.close());

// Phone Form Submit
document.querySelector("#phone-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const raw = document.querySelector("#auth-phone").value.trim();
  const normalized = normalizeAlbanianPhone(raw);

  if (!normalized) {
    setAuthStatus("#phone-status", "Vendosni një numër të saktë celular: 06x xxx xxxx ose +355 6x xxx xxxx (pa 0 pas +355).", true);
    return;
  }

  currentIdentifier = normalized;
  currentFormattedIdentifier = formatAlbanianPhoneDisplay(normalized);

  const btn = document.querySelector("#phone-submit-btn");
  if (btn) btn.disabled = true;
  setAuthStatus("#phone-status", "Duke dërguar kodin me SMS në celular...");

  try {
    await requestOtp(normalized);
    document.querySelector("#code-target").textContent = currentFormattedIdentifier;
    clearOtpInputs();
    setAuthView("code");
    startResendCountdown(60);
    setAuthStatus("#code-status", `Kodi 6-shifror u dërgua me SMS në celularin tuaj (${currentFormattedIdentifier}).`);
    setTimeout(() => {
      otpDigits[0]?.focus();
    }, 100);
  } catch (error) {
    setAuthStatus("#phone-status", error.message || "Ndodhi një problem me dërgimin e SMS.", true);
  } finally {
    if (btn) btn.disabled = false;
  }
});

// Change Target (back to phone entry)
document.querySelector("#change-target")?.addEventListener("click", () => {
  setAuthView("phone");
});

// Code Verification Form Submit
document.querySelector("#code-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = getEnteredOtp() || document.querySelector("#auth-code").value.trim();
  if (code.length !== 6) {
    setAuthStatus("#code-status", "Ju lutem plotësoni të gjitha 6 shifrat e kodit nga SMS.", true);
    return;
  }

  const btn = document.querySelector("#code-submit-btn");
  if (btn) btn.disabled = true;
  setAuthStatus("#code-status", "Duke verifikuar kodin...");

  try {
    const data = await verifyOtp(currentIdentifier, code);
    updateAccountUi(data.user);

    if (data.user.profile?.displayName) {
      setAuthView("account-view");
      showToast(`Mirëseerdhe përsëri, ${data.user.profile.displayName}!`);
    } else {
      setAuthView("profile");
      setAuthStatus("#profile-status", "Numri u verifikua me sukses! Plotësoni profilin tuaj.");
    }
  } catch (error) {
    setAuthStatus("#code-status", error.message || "Kodi i verifikimit nuk është i saktë.", true);
  } finally {
    if (btn) btn.disabled = false;
  }
});

// Resend Code Action
document.querySelector("#resend-code")?.addEventListener("click", async () => {
  setAuthStatus("#code-status", "Duke ridërguar kodin me SMS...");
  try {
    await requestOtp(currentIdentifier);
    clearOtpInputs();
    startResendCountdown(60);
    setAuthStatus("#code-status", `Një kod i ri u dërgua me SMS te ${currentFormattedIdentifier}.`);
  } catch (error) {
    setAuthStatus("#code-status", error.message, true);
  }
});

// Profile Form Submit (Save Profile)
document.querySelector("#profile-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const btn = event.currentTarget.querySelector("button[type='submit']");
  if (btn) btn.disabled = true;
  const name = document.querySelector("#profile-name").value.trim();
  const position = document.querySelector("#profile-position").value;
  const area = document.querySelector("#profile-area").value;
  const level = document.querySelector("#profile-level")?.value || "Regular";

  try {
    await authRequest("profile", { displayName: name, position, area, level });
    if (signedInUser) {
      signedInUser.profile = { displayName: name, position, area, level };
      updateAccountUi(signedInUser);
    }
    dialog.close();
    showToast(`Profili u ruajt! Mirëseerdhe te Kalceto, ${name}! ⚽`);
  } catch (error) {
    // If offline/fallback mode, still save locally
    if (signedInUser) {
      signedInUser.profile = { displayName: name, position, area, level };
      updateAccountUi(signedInUser);
      dialog.close();
      showToast(`Profili u ruajt! Mirëseerdhe te Kalceto, ${name}! ⚽`);
    } else {
      setAuthStatus("#profile-status", error.message, true);
    }
  } finally {
    if (btn) btn.disabled = false;
  }
});

// Edit Profile Button (from Account Card View)
document.querySelector("#edit-profile-btn")?.addEventListener("click", () => {
  setAuthView("profile");
});

// Sign Out Action
document.querySelectorAll(".sign-out").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try { await authRequest("logout", {}); } catch {}
    localStorage.removeItem("kalceto_session");
    localStorage.removeItem("kalceto_user");
    updateAccountUi(null);
    dialog.close();
    showToast("Keni dalë me sukses nga llogaria.");
  });
});

// Restore Cached Session or check server
const savedLocalUser = localStorage.getItem("kalceto_user");
if (savedLocalUser) {
  try {
    updateAccountUi(JSON.parse(savedLocalUser));
  } catch {}
}

authRequest("session")
  .then((data) => {
    if (data.user) updateAccountUi(data.user);
  })
  .catch(() => {
    if (!savedLocalUser) updateAccountUi(null);
  });

document.querySelectorAll(".team-trigger").forEach((button) => {
  button.addEventListener("click", () => showToast("Krijimi i ekipeve do të hapet së shpejti për të gjithë lojtarët në Shkodër."));
});

document.addEventListener("click", (event) => {
  const connect = event.target.closest(".player-connect");
  if (connect) showToast(`Kërkesa për lojë iu dërgua ${connect.dataset.name}-s.`);
  if (event.target.closest(".join-trigger")) showToast("Ju u regjistruat si i interesuar për këtë lojë.");
});

let toastTimer;
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3300);
}
