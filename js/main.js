// Theme toggle: flips between light and dark and remembers the choice.
const root = document.documentElement;
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function currentTheme() {
  return root.dataset.theme || (darkQuery.matches ? "dark" : "light");
}

document.querySelector(".theme-toggle")?.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) {}
});

// Live FocalReader reader count, from the same Worker that powers focalreader.com.
// The page ships with "200+" so it still reads fine if this fails.
(async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch("https://focalreader-pricing.ajitsoni000005.workers.dev/stats", { signal: controller.signal });
    if (!res.ok) return;
    const { total } = await res.json();
    if (!Number.isFinite(total) || total <= 0) return;
    const text = total.toLocaleString("en-US");
    document.querySelectorAll("[data-readers]").forEach((el) => { el.textContent = text; });
  } catch (e) {
    // Keep the static fallback.
  } finally {
    clearTimeout(timer);
  }
})();

// Copy email.
document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = "Copied";
    } catch (e) {
      btn.textContent = "Copy failed";
    }
    setTimeout(() => { btn.textContent = "Copy"; }, 1600);
  });
});

document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

// Labyrinth's promo plays muted while it's on screen, unless the visitor prefers less motion.
// Its controls stay, so it can be played or unmuted by hand.
const promo = document.querySelector("[data-promo]");
if (promo && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) promo.play().catch(() => {});
    else promo.pause();
  }, { threshold: 0.4 }).observe(promo);
}

// Medium posts. The page ships with the posts as they were at the last edit, so it reads fine
// without JavaScript or if this fails. This checks the live feed and redraws the list only when
// it differs, so a new post shows up here without touching the code.
// Medium's feed has no CORS headers, so it comes through rss2json, which converts it to JSON.
const MEDIUM_FEED = "https://api.rss2json.com/v1/api.json?rss_url=" +
  encodeURIComponent("https://medium.com/feed/@ajitsoni000005");
const POST_CARDS = 3; // the newest few get a card with a picture; the rest go in a list

const writing = document.querySelector("[data-writing]");
if (writing) refreshPosts(writing);

async function refreshPosts(section) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(MEDIUM_FEED, { signal: controller.signal });
    if (!res.ok) return;
    const data = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.items)) return;
    const live = data.items.map(postFromFeed).filter(Boolean);
    if (!live.length) return;

    const shown = [...section.querySelectorAll("[data-post]")].map(postFromPage);
    // The feed only carries the latest ten posts. Keep the older ones the page already lists;
    // a listed post newer than that window but missing from the feed has been taken down.
    const oldestLive = Math.min(...live.map((p) => p.date));
    const fellOff = shown.filter((p) => p.date < oldestLive && !live.some((l) => l.id === p.id));
    const posts = [...live, ...fellOff].sort((a, b) => b.date - a.date);

    const key = (list) => list.map((p) => `${p.id} ${p.title}`).join("\n");
    if (key(posts) === key(shown)) return;
    drawPosts(section, posts);
  } catch (e) {
    // Keep the static list.
  } finally {
    clearTimeout(timer);
  }
}

function postFromFeed(item) {
  const id = String(item.guid || "").split("/").pop();
  const date = new Date(String(item.pubDate).replace(" ", "T") + "Z"); // rss2json gives UTC
  const href = String(item.link || "").split("?")[0];
  if (!id || isNaN(date) || !href.startsWith("https://")) return null;

  // A parsed document is inert: nothing in it runs or loads. Only its text is used.
  const doc = new DOMParser().parseFromString(item.content || "", "text/html");
  const title = cleanTitle(item.title || "");
  const images = [...doc.images].map((img) => img.getAttribute("src") || "").filter((src) => !src.includes("/_/stat"));
  const dek = [...doc.querySelectorAll("p, h3, h4")]
    .map((el) => el.textContent.replace(/\s+/g, " ").trim())
    .find((text) => text && cleanTitle(text) !== title) || "";
  return { id, date, href, title, minutes: readMinutes(doc, images.length), image: resizedImage(images[0] || ""), dek: clip(dek, 180) };
}

function postFromPage(el) {
  const link = el.querySelector("a");
  return {
    id: el.dataset.post,
    date: new Date(el.querySelector("time").dateTime),
    href: link.href,
    title: link.textContent.trim(),
    minutes: Number(el.querySelector("[data-min]").textContent),
    image: el.querySelector("img")?.src || "",
    dek: el.querySelector(".post-dek")?.textContent.trim() || "",
  };
}

// Medium's titles sometimes carry stray spaces, like "Networking :  Physical Layer".
function cleanTitle(text) {
  return text.replace(/\s+/g, " ").replace(/\s+([:,.;!?])/g, "$1").trim();
}

// Medium's own estimate: 265 words a minute, plus 12 seconds for the first picture,
// 11 for the next, and so on down to 3.
function readMinutes(doc, imageCount) {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let words = 0;
  while (walker.nextNode()) words += (walker.currentNode.nodeValue.match(/\S+/g) || []).length;
  let seconds = (words / 265) * 60;
  for (let i = 0; i < imageCount; i++) seconds += Math.max(12 - i, 3);
  return Math.max(1, Math.ceil(seconds / 60));
}

// Medium's CDN serves any of its pictures at a chosen width, as WebP.
function resizedImage(src) {
  const m = src.match(/^https:\/\/(?:cdn-images-\d+|miro)\.medium\.com\/.*\/([^/?#]+)$/);
  return m ? `https://miro.medium.com/v2/resize:fit:800/format:webp/${m[1]}` : "";
}

function clip(text, max) {
  if (text.length <= max) return text.replace(/:$/, "…"); // a lead-in to a list reads as cut off

  return text.slice(0, text.lastIndexOf(" ", max)).replace(/[\s,;:.—–-]+$/, "") + "…";
}

function drawPosts(section, posts) {
  const monthYear = (d) => d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  const fill = (templateId, post) => {
    const el = document.getElementById(templateId).content.firstElementChild.cloneNode(true);
    el.dataset.post = post.id;
    const link = el.querySelector("a");
    link.href = post.href;
    link.textContent = post.title;
    const time = el.querySelector("time");
    time.dateTime = post.date.toISOString();
    time.textContent = monthYear(post.date);
    el.querySelector("[data-min]").textContent = post.minutes;
    const img = el.querySelector("img");
    if (img) post.image ? (img.src = post.image) : img.parentElement.remove();
    const dek = el.querySelector(".post-dek");
    if (dek) post.dek ? (dek.textContent = post.dek) : dek.remove();
    return el;
  };
  section.querySelector("[data-post-cards]").replaceChildren(...posts.slice(0, POST_CARDS).map((p) => fill("post-card-tpl", p)));
  section.querySelector("[data-post-list]").replaceChildren(...posts.slice(POST_CARDS).map((p) => fill("post-row-tpl", p)));
  section.querySelector("[data-post-earlier]").hidden = posts.length <= POST_CARDS;
}
