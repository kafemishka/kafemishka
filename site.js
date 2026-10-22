/* =====================================================
   KAFE MISHKA — shared behavior for every page
   (photo galleries, collapsible spreads, lightbox)
   You shouldn't need to edit this file.
   ===================================================== */

const ENDINGS = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG"];

/* Try a file name in several folders and spellings.
   Calls done(src) with the first one that exists, or done(null). */
function findImage(name, folders, done) {
  const tries = [];
  folders.forEach(f => ENDINGS.forEach(e => tries.push(f + name + e)));
  let t = 0;
  const probe = new Image();
  probe.onload = () => done(tries[t]);
  probe.onerror = () => { t++; t < tries.length ? (probe.src = tries[t]) : done(null); };
  probe.src = tries[0];
}

/* ---------- Lightbox ---------- */
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
  lbImg.src = lbSet[lbIndex];
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

/* Find 01, 02, 03 ... in the given folders. Calls done(list). */
function collectImages(folders, max, done) {
  const found = [];
  let pending = max;
  for (let i = 1; i <= max; i++) {
    findImage(String(i).padStart(2, "0"), folders, src => {
      if (src) found[i] = src;
      if (--pending === 0) done(found.filter(Boolean));
    });
  }
}

/* ---------- Numbered photo gallery (full grid) ----------
   Fills a grid with 01, 02, 03 ... from the given folders.
   If nothing is found, the "coming soon" note stays.       */
function loadGallery(gridId, folders, max) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  collectImages(folders, max, list => {
    if (!list.length) return;
    const soon = grid.parentElement.querySelector(".soon");
    if (soon) soon.remove();
    list.forEach((s, n) => {
      const img = new Image();
      img.src = s; img.alt = ""; img.loading = "lazy";
      img.onclick = () => openLb(list, n);
      grid.appendChild(img);
    });
  });
}

/* ---------- Gallery tile (one cover photo) ----------
   Shows photo 01 as the cover. Clicking it opens the
   whole set in the big viewer.                            */
function loadTile(tileId, folders, max) {
  const tile = document.getElementById(tileId);
  if (!tile) return;
  collectImages(folders, max, list => {
    if (!list.length) return;
    const cover = tile.querySelector(".cover");
    cover.innerHTML = "";
    const img = new Image();
    img.src = list[0]; img.alt = "";
    cover.appendChild(img);
    tile.classList.add("ready");
    tile.querySelector(".count").textContent =
      list.length + (list.length === 1 ? " image" : " images") + " · view";
    tile.onclick = () => openLb(list, 0);
  });
}

/* ---------- Collapsible stories (spreads) ----------
   stories = [{ title: "...", file: "spread01", open: true }, ...]
   A story only appears once its image has been uploaded.   */
function loadStories(boxId, stories, folders) {
  const box = document.getElementById(boxId);
  if (!box) return;
  const slots = stories.map(() => null);
  let pending = stories.length;
  stories.forEach((s, i) => {
    findImage(s.file, folders, src => {
      if (src) slots[i] = { ...s, src };
      if (--pending === 0) {
        const ready = slots.filter(Boolean);
        if (!ready.length) return;
        const soon = box.parentElement.querySelector(".soon");
        if (soon) soon.remove();
        const all = ready.map(r => r.src);
        ready.forEach((r, n) => {
          const d = document.createElement("details");
          d.className = "story";
          if (r.open) d.open = true;
          d.innerHTML = "<summary></summary>";
          d.querySelector("summary").textContent = r.title;
          const img = new Image();
          img.src = r.src; img.alt = r.title;
          img.onclick = () => openLb(all, n);
          d.appendChild(img);
          box.appendChild(d);
        });
      }
    });
  });
}
