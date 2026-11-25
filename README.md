# Portfolio

Personal site of Ajit Soni: https://ajitsoni05.github.io/portfolio/

Plain HTML, CSS and a little JavaScript, served by GitHub Pages. No build step.

- `index.html` — the whole page
- `css/styles.css` — styles; colour tokens at the top, light and dark themes
- `js/main.js` — theme toggle, live FocalReader reader count, copy-email button, live Medium posts
- Medium posts are written into `index.html` (Writing section) and refreshed in the browser from the
  Medium feed via rss2json, so new posts appear on their own. Update the static list now and then so
  it stays current for visitors without JavaScript.
- `images/og.png` — 1200×630 link preview
- `sitemap.xml` — this page's sitemap, listed from the domain's `robots.txt`

When the page changes, bump `lastmod` in `sitemap.xml` and `dateModified` in the structured data
(the `application/ld+json` block in `index.html`), and keep that block in step with the page.
`robots.txt`, `llms.txt` and the Labyrinth sitemap live at the domain root, in the
`ajitsoni05/ajitsoni05.github.io` repo.
