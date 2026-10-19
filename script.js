// Theme toggle, live IST clock with timezone note, scroll progress,
// the sliding stack row and (once there are any) Credly badges.

// Add an entry per Credly badge: { name, image, url }. The section stays
// hidden while this is empty.
const BADGES = [];
const CREDLY_PROFILE = "";

const IST_OFFSET_MIN = 330;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Theme */
const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");

function syncToggle() {
  const light = root.dataset.theme === "light";
  toggle.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
  document.querySelector('meta[name="theme-color"]').content = light ? "#ffffff" : "#000000";
}
toggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  syncToggle();
});
syncToggle();

/* Clock: ticks on each real second boundary, the dot blinks with it */
const clock = document.getElementById("clock");
const dot = document.getElementById("clock-dot");
const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function tick() {
  const now = new Date();
  clock.textContent = fmt.format(now);
  dot.classList.toggle("off", now.getSeconds() % 2 === 1);
}
tick();
setTimeout(() => {
  tick();
  setInterval(tick, 1000);
}, 1000 - (Date.now() % 1000));

function timezoneNote() {
  const visitorOffset = -new Date().getTimezoneOffset();
  const diff = IST_OFFSET_MIN - visitorOffset;
  if (diff === 0) return "We're in the same timezone";
  const h = Math.floor(Math.abs(diff) / 60);
  const m = Math.abs(diff) % 60;
  const span = [h && `${h} h`, m && `${m} m`].filter(Boolean).join(" ");
  return `${span} ${diff > 0 ? "ahead of" : "behind"} you`;
}
document.getElementById("tz-note").textContent = timezoneNote();

/* Scroll progress */
const bar = document.getElementById("progress");
let ticking = false;
function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
  ticking = false;
}
window.addEventListener("scroll", () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(updateProgress);
  }
}, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

/* Stack: a sliding row of the logo chips; click it to see everything */
const stack = document.getElementById("stack");
if (!reduceMotion) {
  const marquee = document.getElementById("marquee");
  const groups = document.getElementById("stack-groups");
  const stackToggle = document.getElementById("stack-toggle");
  const track = document.createElement("div");
  track.className = "track";
  const list = document.createElement("ul");
  groups.querySelectorAll(".chip:not(.chip-text)").forEach((chip) => list.append(chip.cloneNode(true)));
  // Two copies so the loop is seamless at -50%.
  track.append(list, list.cloneNode(true));
  marquee.append(track);
  stack.classList.add("js");
  stackToggle.hidden = false;

  function setOpen(open) {
    stack.classList.toggle("open", open);
    stackToggle.setAttribute("aria-expanded", String(open));
    stackToggle.textContent = open ? "Show less" : "Show all";
  }
  marquee.addEventListener("click", () => setOpen(true));
  stackToggle.addEventListener("click", () => setOpen(!stack.classList.contains("open")));
}

/* Badges */
if (BADGES.length) {
  const list = document.getElementById("badge-list");
  for (const b of BADGES) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = b.url;
    const img = document.createElement("img");
    img.src = b.image;
    img.alt = b.name;
    img.width = img.height = 96;
    a.append(img);
    li.append(a);
    list.append(li);
  }
  document.getElementById("credly-link").href = CREDLY_PROFILE;
  document.getElementById("badges").hidden = false;
}
