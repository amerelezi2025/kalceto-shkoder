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
document.querySelectorAll(".profile-trigger").forEach((button) => button.addEventListener("click", () => dialog.showModal()));
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
document.querySelector("#profile-form").addEventListener("submit", (event) => { event.preventDefault(); dialog.close(); showToast("Profile saved for this demo. You can now look for games."); });
document.querySelectorAll(".team-trigger").forEach((button) => button.addEventListener("click", () => showToast("Team creation will be ready when player accounts are connected.")));
document.addEventListener("click", (event) => { const connect = event.target.closest(".player-connect"); if (connect) showToast(`Friend request sent to ${connect.dataset.name}.`); if (event.target.closest(".join-trigger")) showToast("You are marked as interested in this game."); });

let toastTimer;
function showToast(message) { const toast = document.querySelector("#toast"); toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3100); }
