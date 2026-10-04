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
  { name: "Kalceto name here", area: "Parruce", details: "Add pitch description, opening hours, and price here.", image: "images/kalceto-1.jpg", map: "#" },
  { name: "Kalceto name here", area: "Rus", details: "Add pitch description, opening hours, and price here.", image: "images/kalceto-2.jpg", map: "#" },
  { name: "Kalceto name here", area: "Perash", details: "Add pitch description, opening hours, and price here.", image: "images/kalceto-3.jpg", map: "#" }
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
      <div><div class="player-name">${player.name}</div><div class="player-sub">${player.area} · ${player.matches} games played</div></div>
      <span>${player.position}</span><span class="level">${player.level}</span>
      <button class="text-button player-connect" type="button" data-name="${player.name}">Connect <span aria-hidden="true">→</span></button>
    </article>`).join("") || `<p class="empty-state">No players match these filters yet.</p>`;
  showMore.hidden = filtered.length <= visiblePlayers;
}

document.querySelector("#pitch-list").innerHTML = pitches.map((pitch) => `
  <article class="pitch-card">
    <img src="${pitch.image}" onerror="this.onerror=null;this.src='images/placeholder.svg'" alt="Photo placeholder for ${pitch.name}" />
    <span class="photo-tag">PHOTO: ${pitch.name.toUpperCase()}</span>
    <div class="pitch-info"><h3>${pitch.name}</h3><p>${pitch.details}</p><div class="pitch-footer"><span>${pitch.area}, Shkoder</span><a href="${pitch.map}" target="_blank" rel="noopener">Google Maps ↗</a></div></div>
  </article>`).join("");

renderPlayers();
[searchInput, positionFilter, levelFilter].forEach((control) => control.addEventListener("input", () => { visiblePlayers = 5; renderPlayers(); }));
showMore.addEventListener("click", () => { visiblePlayers += 5; renderPlayers(); });

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".primary-nav");
menuToggle.addEventListener("click", () => { const open = nav.classList.toggle("open"); menuToggle.setAttribute("aria-expanded", String(open)); });
nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => { nav.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); }));
window.addEventListener("scroll", () => document.querySelector(".site-header").classList.toggle("scrolled", window.scrollY > 6));

const levelNames = ["New", "Getting started", "Regular", "Strong", "Very strong"];
const skillRange = document.querySelector("#skill-range");
skillRange.addEventListener("input", () => document.querySelector("#skill-label").textContent = levelNames[skillRange.value - 1]);
document.querySelectorAll(".filter-chip").forEach((chip) => chip.addEventListener("click", () => { document.querySelectorAll(".filter-chip").forEach((item) => item.classList.remove("active")); chip.classList.add("active"); }));
document.querySelectorAll(".mode-tab").forEach((tab) => tab.addEventListener("click", () => { document.querySelectorAll(".mode-tab").forEach((item) => { item.classList.remove("active"); item.setAttribute("aria-selected", "false"); }); tab.classList.add("active"); tab.setAttribute("aria-selected", "true"); }));

document.querySelector("#match-button").addEventListener("click", () => {
  const score = 76 + Number(skillRange.value) * 4;
  const mode = document.querySelector(".mode-tab.active").dataset.mode;
  document.querySelector("#match-score").textContent = score;
  document.querySelector("#match-title").textContent = mode === "My team" ? "A balanced team is waiting" : `${mode} game, balanced 5v5`;
  document.querySelector("#match-description").textContent = `Closest fit for ${document.querySelector("#match-time").value.toLowerCase()}. Suggested pitch: Kalceto name here.`;
  showToast("Your best match has been refreshed.");
});

const dialog = document.querySelector("#account-dialog");
const supabaseSettings = window.KALCETO_SUPABASE;
const supabaseClient = window.supabase && supabaseSettings
  ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.publishableKey)
  : null;
let signedInUser = null;
let pendingEmail = "";
let authIntent = "signin";

function setAuthView(view) {
  document.querySelectorAll(".auth-panel").forEach((panel) => { panel.hidden = panel.id !== `${view}-step`; });
}

function setAuthStatus(id, message, isError = false) {
  const element = document.querySelector(id);
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function updateAccountUi(user) {
  signedInUser = user;
  document.querySelectorAll(".profile-trigger").forEach((button) => { button.textContent = user ? "My profile" : button.closest(".hero-actions") ? "Create profile" : "Sign in"; });
}

document.querySelectorAll(".profile-trigger").forEach((button) => button.addEventListener("click", () => {
  if (!supabaseClient) {
    showToast("Authentication is still being configured. Please refresh in a moment.");
    return;
  }
  setAuthView(signedInUser ? "profile" : "email");
  dialog.showModal();
}));
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());

document.querySelector("#email-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  pendingEmail = document.querySelector("#auth-email").value.trim();
  if (!event.currentTarget.reportValidity()) return;
  authIntent = event.submitter?.dataset.authIntent ?? "signin";
  const buttons = event.currentTarget.querySelectorAll("button");
  buttons.forEach((button) => { button.disabled = true; });
  setAuthStatus("#auth-status", "Sending your code...");
  const { error } = await supabaseClient.auth.signInWithOtp({
    email: pendingEmail,
    options: { shouldCreateUser: authIntent === "signup" }
  });
  buttons.forEach((button) => { button.disabled = false; });
  if (error) {
    const message = authIntent === "signin" && /sign.?up|not.*found|user/i.test(error.message)
      ? "No Kalceto account exists for that email. Choose Create account instead."
      : error.message;
    setAuthStatus("#auth-status", message, true);
    return;
  }
  document.querySelector("#code-email").textContent = pendingEmail;
  document.querySelector("#auth-code").value = "";
  setAuthStatus("#code-status", "");
  setAuthView("code");
  document.querySelector("#auth-code").focus();
});

document.querySelector("#code-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  setAuthStatus("#code-status", "Verifying your code...");
  const { data, error } = await supabaseClient.auth.verifyOtp({ email: pendingEmail, token: document.querySelector("#auth-code").value.trim(), type: "email" });
  button.disabled = false;
  if (error) {
    setAuthStatus("#code-status", "That code did not work. Check it and try again.", true);
    return;
  }
  updateAccountUi(data.user);
  setAuthView("profile");
  setAuthStatus("#profile-status", "Signed in successfully.");
});

document.querySelector("#change-email").addEventListener("click", () => setAuthView("email"));
document.querySelector("#profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  const { error } = await supabaseClient.auth.updateUser({ data: {
    display_name: document.querySelector("#profile-name").value.trim(),
    position: document.querySelector("#profile-position").value,
    area: document.querySelector("#profile-area").value,
    profile_complete: true
  } });
  button.disabled = false;
  if (error) {
    setAuthStatus("#profile-status", error.message, true);
    return;
  }
  dialog.close();
  showToast("Your player profile is saved.");
});

document.querySelector(".sign-out").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  updateAccountUi(null);
  dialog.close();
  showToast("You are signed out.");
});

document.querySelectorAll(".social-login").forEach((button) => button.addEventListener("click", async () => {
  const provider = button.dataset.provider;
  if (!supabaseSettings.providers?.[provider]) {
    setAuthStatus("#auth-status", `${button.textContent} login is not connected yet. It needs to be enabled in Supabase first.`, true);
    return;
  }
  setAuthStatus("#auth-status", `Opening ${button.textContent} sign-in...`);
  const options = { redirectTo: window.location.href };
  if (provider === "azure") options.scopes = "email";
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider, options });
  if (error) setAuthStatus("#auth-status", error.message, true);
}));

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => updateAccountUi(data.session?.user ?? null));
  supabaseClient.auth.onAuthStateChange((_event, session) => updateAccountUi(session?.user ?? null));
}
document.querySelectorAll(".team-trigger").forEach((button) => button.addEventListener("click", () => showToast("Team creation will be ready when player accounts are connected.")));
document.addEventListener("click", (event) => { const connect = event.target.closest(".player-connect"); if (connect) showToast(`Friend request sent to ${connect.dataset.name}.`); if (event.target.closest(".join-trigger")) showToast("You are marked as interested in this game."); });

let toastTimer;
function showToast(message) { const toast = document.querySelector("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3100); }
