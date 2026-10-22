/* =====================================================
   KAFE MISHKA — shared behavior for every page
   You shouldn't need to edit this file.

   How photos are found: the page asks GitHub ONCE for the
   list of files in the repository, then shows whatever is
   in each folder. No renaming needed. Upload a photo and it
   appears; delete it on GitHub and it disappears.
   ===================================================== */

const REPO = "kafemishka/kafemishka";
const BRANCH = "main";
const IMG = /\.(jpe?g|png|webp|gif)$/i;

/* ---------- Get the list of files (one request, cached a few minutes) ---------- */
let filesPromise = null;
function getFiles() {
  if (filesPromise) return filesPromise;
  filesPromise = (async () => {
    try {
      const c = JSON.parse(sessionStorage.getItem("km-files") || "null");
      if (c && Date.now() - c.t < 3 * 60 * 1000) return c.paths;
    } catch (e) {}
    try {
      const r = await fetch("https://api.github.com/repos/" + REPO +
                            "/git/trees/" + BRANCH + "?recursive=1");
      if (!r.ok) return [];
      const data = await r.json();
      const paths = data.tree.filter(x => x.type === "blob").map(x => x.path);
      try { sessionStorage.setItem("km-files", JSON.stringify({ t: Date.now(), paths })); } catch (e) {}
      return paths;
    } catch (e) { return []; }
  })();
  return filesPromise;
}

const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const baseName = p => p.split("/").pop().replace(/\.[^.]+$/, "");
const url = p => encodeURI(p);

/* All images directly inside a folder (any capitalization), sorted. */
async function imagesIn(folder) {
  const paths = await getFiles();
  const f = folder.toLowerCase() + "/";
  return paths.filter(p => p.toLowerCase().startsWith(f) &&
                           !p.slice(f.length).includes("/") && IMG.test(p))
              .sort(byName);
}
/* Images anywhere whose name matches a pattern, sorted. */
async function imagesMatching(regex) {
  const paths = await getFiles();
  return paths.filter(p => IMG.test(p) && regex.test(baseName(p))).sort(byName);
}

/* ---------- Lightbox (big dark photo viewer) ---------- */
const lb = document.createElement("div");
lb.className = "lightbox";
lb.innerHTML =
  '<button class="lb-btn lb-close" aria-label="Close">×</button>' +
  '<button class="lb-btn lb-prev" aria-label="Previous">‹</button>' +
  '<img alt="">' +
  '<button class="lb-btn lb-next" aria-label="Next">›</button>';
document.body.appendChild(lb);
const lbImg = lb.querySelector("img");
let lbSet = [], lbIndex = 0;

function openLb(set, i) {
  lbSet = set;
  lbIndex = (i + set.length) % set.length;
  lbImg.src = url(lbSet[lbIndex]);
  lb.classList.add("on");
}
function closeLb() { lb.classList.remove("on"); }
lb.querySelector(".lb-close").onclick = closeLb;
lb.querySelector(".lb-prev").onclick = e => { e.stopPropagation(); openLb(lbSet, lbIndex - 1); };
lb.querySelector(".lb-next").onclick = e => { e.stopPropagation(); openLb(lbSet, lbIndex + 1); };
lb.onclick = e => { if (e.target === lb) closeLb(); };
document.addEventListener("keydown", e => {
  if (!lb.classList.contains("on")) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") openLb(lbSet, lbIndex - 1);
  if (e.key === "ArrowRight") openLb(lbSet, lbIndex + 1);
});

function makeImg(path, set, i) {
  const img = new Image();
  img.src = url(path); img.alt = ""; img.loading = "lazy";
  img.onerror = () => img.remove();          // just-uploaded files can lag a minute
  if (set) img.onclick = () => openLb(set, i);
  return img;
}
function dropSoon(el) {
  const s = el && el.parentElement && el.parentElement.querySelector(".soon");
  if (s) s.remove();
}

/* ---------- Full photo grid from a folder ---------- */
async function loadGallery(gridId, folder) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const list = await imagesIn(folder);
  if (!list.length) return;
  dropSoon(grid);
  list.forEach((p, i) => grid.appendChild(reveal(makeImg(p, list, i))));
}

/* ---------- Tile: one cover photo that opens the whole folder ---------- */
async function loadTile(tileId, folder) {
  const tile = document.getElementById(tileId);
  if (!tile) return;
  const list = await imagesIn(folder);
  if (!list.length) return;
  const cover = tile.querySelector(".cover");
  cover.innerHTML = "";
  cover.appendChild(makeImg(list[0]));
  tile.classList.add("ready");
  tile.querySelector(".count").textContent =
    list.length + (list.length === 1 ? " image" : " images") + " · view";
  tile.onclick = () => openLb(list, 0);
}

/* ---------- Use an uploaded image (by name) as a cover ---------- */
async function useCover(imgId, name) {
  const img = document.getElementById(imgId);
  if (!img) return;
  const found = await imagesMatching(new RegExp("^" + name + "$", "i"));
  if (found.length) img.src = url(found[0]);
}

/* ---------- Scroll-in animation ---------- */
const revealer = ("IntersectionObserver" in window) ? new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); revealer.unobserve(e.target); } });
}, { rootMargin: "0px 0px -8% 0px" }) : null;
function reveal(el) {
  if (!revealer) return el;
  el.classList.add("reveal");
  revealer.observe(el);
  return el;
}
document.addEventListener("DOMContentLoaded", () =>
  document.querySelectorAll("[data-reveal]").forEach(reveal));

/* ---------- Sticky section menu that highlights where you are ---------- */
function scrollSpy(navId) {
  const nav = document.getElementById(navId);
  if (!nav || !("IntersectionObserver" in window)) return;
  const links = [...nav.querySelectorAll("a[href^='#']")];
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      const on = nav.querySelector(".active");
      if (on) nav.scrollTo({ left: on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2, behavior: "smooth" });
    });
  }, { rootMargin: "-35% 0px -60% 0px" });
  links.forEach(a => { const s = document.querySelector(a.getAttribute("href")); if (s) spy.observe(s); });
}
