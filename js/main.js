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
