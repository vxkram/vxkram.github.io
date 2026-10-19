// Mini version: GitHub activity drawn as hatched squares, plus a project carousel.

const GITHUB_USER = "vxkram";

const PROJECTS = [
  { name: "Résumé Quest", desc: "A pixel-art résumé analyser that only scores skills it can quote from the résumé.", source: "https://github.com/vxkram/resume-quest" },
  { name: "DEX", desc: "A small native Mac app for images, PDFs and audio, lossless where it can be.", source: "https://github.com/vxkram/DEX", site: "https://github.com/vxkram/DEX/releases", siteLabel: "download" },
  { name: "LLM Sentinel", desc: "A gateway in front of several LLM providers, with rate limits, budgets and automatic failover.", source: "https://github.com/vxkram/llm-sentinel" },
  { name: "Ad Template Generator", desc: "One product photo and a one-line brief become ads in six sizes, all on your machine.", source: "https://github.com/vxkram/ad_template" },
  { name: "Intelligent Tutoring System", desc: "A study app where your quiz scores decide what it recommends next.", source: "https://github.com/vxkram/intelligent-tutoring-system" },
  { name: "Face Mask Detector", desc: "Upload a photo and a MobileNetV2 classifier says mask, no mask, or worn incorrectly.", source: "https://github.com/vxkram/face-mask-detection" },
  { name: "Image Colorization", desc: "Upload a black-and-white photo and get it back in colour.", source: "https://github.com/vxkram/image-colorization" },
];

// Add an entry per Credly badge: { name, image, url }. Hidden while empty.
const BADGES = [];
const CREDLY_PROFILE = "";

const SVG_NS = "http://www.w3.org/2000/svg";

function el(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// More contributions = denser hatching, like shading with a pencil.
function hatch(group, x, y, s, level) {
  const strokes = [];
  if (level >= 1) strokes.push([x + 1, y + s - 1, x + s - 1, y + 1]);
  if (level >= 2) strokes.push([x + 1, y + s / 2, x + s / 2, y + 1], [x + s / 2, y + s - 1, x + s - 1, y + s / 2]);
  if (level >= 3) strokes.push([x + 1, y + 1, x + s - 1, y + s - 1]);
  if (level >= 4) strokes.push([x + 1, y + s / 2, x + s / 2, y + s - 1], [x + s / 2, y + 1, x + s - 1, y + s / 2]);
  for (const [x1, y1, x2, y2] of strokes) {
    group.append(el("line", { x1, y1, x2, y2, class: "hatch" }));
  }
}

function drawActivity(days) {
  const size = 10, gap = 3, step = size + gap;
  const firstDow = new Date(days[0].date + "T00:00:00Z").getUTCDay();
  const weeks = Math.ceil((days.length + firstDow) / 7);
  const svg = el("svg", {
    viewBox: `0 0 ${weeks * step - gap} ${7 * step - gap}`,
    role: "img",
    "aria-label": "GitHub contributions over the last year",
  });
  const cells = el("g", { class: "cells" });
  days.forEach((d, i) => {
    const slot = i + firstDow;
    const x = Math.floor(slot / 7) * step;
    const y = (slot % 7) * step;
    const rect = el("rect", { x, y, width: size, height: size, rx: 1.5, class: "cell" });
    const title = el("title", {});
    title.textContent = `${d.count} on ${d.date}`;
    rect.append(title);
    cells.append(rect);
    hatch(cells, x, y, size, d.level);
  });
  svg.append(cells);
  return svg;
}

async function loadActivity() {
  const grid = document.getElementById("activity-grid");
  const count = document.getElementById("activity-count");
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    grid.append(drawActivity(data.contributions));
    count.textContent = `${data.total.lastYear.toLocaleString("en-IN")} in the last year`;
  } catch {
    const p = document.createElement("p");
    p.className = "fallback";
    p.innerHTML = `Activity couldn't load. <a class="arrow" href="https://github.com/${GITHUB_USER}">See it on GitHub</a>.`;
    grid.append(p);
  }
}

function setupCarousel() {
  const slide = document.getElementById("slide");
  const pager = document.getElementById("pager");
  let i = 0;

  function link(href, label) {
    const a = document.createElement("a");
    a.className = "arrow";
    a.href = href;
    a.textContent = label;
    return a;
  }

  // Next slides the new project in moving right, previous moving left.
  function render(dir = 1) {
    const p = PROJECTS[i];
    const title = document.createElement("p");
    title.className = "title";
    const name = document.createElement("strong");
    name.textContent = p.name;
    title.append(name);
    if (p.site) title.append(link(p.site, p.siteLabel || "site"));
    title.append(link(p.source, "source"));
    const desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = p.desc;
    const inner = document.createElement("div");
    inner.className = dir < 0 ? "slide-inner from-right" : "slide-inner";
    inner.append(title, desc);
    slide.replaceChildren(inner);
    pager.textContent = `${i + 1} / ${PROJECTS.length}`;
  }

  function go(delta) {
    i = (i + delta + PROJECTS.length) % PROJECTS.length;
    render(delta);
  }

  document.querySelector(".nav.prev").addEventListener("click", () => go(-1));
  document.querySelector(".nav.next").addEventListener("click", () => go(1));
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });
  render();
}

function showBadges() {
  if (!BADGES.length) return;
  const list = document.getElementById("badge-list");
  for (const b of BADGES) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = b.url;
    const img = document.createElement("img");
    img.src = b.image;
    img.alt = b.name;
    a.append(img);
    li.append(a);
    list.append(li);
  }
  document.getElementById("credly-link").href = CREDLY_PROFILE;
  document.getElementById("badges").hidden = false;
}

loadActivity();
setupCarousel();
showBadges();
