import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const URLS_PATH = path.join(ROOT, "data", "linkedin_urls.txt");
const STATE_PATH = path.join(ROOT, "data", "linkedin_state.json");
const OUT_ROOT = path.join(ROOT, "src", "content", "blog");
const LINKEDIN_PROFILE_URL =
  process.env.LINKEDIN_PROFILE_URL ||
  "https://www.linkedin.com/in/nikolaj-fl%C3%B8jgaard-90a71b109/recent-activity/posts/";
const LINKEDIN_COOKIE_HEADER = (process.env.LINKEDIN_COOKIE_HEADER || "").trim();

function readTextIfExists(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function writeText(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf8");
}

function loadState() {
  const raw = readTextIfExists(STATE_PATH);
  if (!raw) return { importedCanonicalUrls: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { importedCanonicalUrls: [] };
    if (!Array.isArray(parsed.importedCanonicalUrls)) return { importedCanonicalUrls: [] };
    return parsed;
  } catch {
    return { importedCanonicalUrls: [] };
  }
}

function saveState(state) {
  // Stable ordering for diffs.
  const unique = Array.from(new Set(state.importedCanonicalUrls)).sort();
  writeText(STATE_PATH, JSON.stringify({ importedCanonicalUrls: unique }, null, 2) + "\n");
}

function stripBom(s) {
  return s.replace(/^\uFEFF/, "");
}

function readUrls() {
  const raw = readTextIfExists(URLS_PATH);
  if (!raw) return [];
  return stripBom(raw)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

function mergeAndWriteUrls(existingUrls, discoveredUrls) {
  const merged = Array.from(new Set([...existingUrls, ...discoveredUrls]));
  const header = [
    "# Add LinkedIn post URLs here (one per line).",
    "# The GitHub Action will run daily and import any new URLs into src/content/blog/.",
    "",
  ];
  writeText(URLS_PATH, header.concat(merged).join("\n") + "\n");
  return merged;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

function extractJsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch {
    return null;
  }
}

function extractCanonical(html) {
  const m = html.match(/<link rel="canonical" href="([^"]+)"/i);
  return m ? decodeEntities(m[1]) : null;
}

function extractMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byProperty = new RegExp(`<meta\\s+property="${escaped}"\\s+content="([^"]+)"`, "i");
  const byName = new RegExp(`<meta\\s+name="${escaped}"\\s+content="([^"]+)"`, "i");
  const m = html.match(byProperty) || html.match(byName);
  return m?.[1] ? decodeEntities(m[1]) : null;
}

function extractPulseUrl(html) {
  const m = html.match(/https:\/\/www\.linkedin\.com\/pulse\/[a-z0-9-_%]+/i);
  return m ? decodeEntities(m[0]) : null;
}

function extractRedirectUrl(href) {
  try {
    const u = new URL(href);
    if (u.pathname.includes("/redir/redirect") && u.searchParams.get("url")) {
      return decodeURIComponent(u.searchParams.get("url"));
    }
  } catch {
    // ignore
  }
  return href;
}

function stripTags(s) {
  return decodeEntities(
    s
      .replace(/<\s*br\s*\/?\s*>/gi, "\n")
      .replace(/<\s*\/p\s*>/gi, "\n\n")
      .replace(/<\s*\/h\d\s*>/gi, "\n\n")
      .replace(/<\s*\/li\s*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractPulseArticleText(html) {
  // Keep URLs from links.
  let normalized = html.replace(
    /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, inner) => {
      const url = extractRedirectUrl(decodeEntities(href));
      const text = stripTags(inner);
      return text ? `${text} (${url})` : url;
    },
  );

  const blocks = [];
  const re = /<div class="article-main__content"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(normalized))) {
    const blockHtml = m[1];
    if (/<h3/i.test(blockHtml)) {
      const hm = blockHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const heading = hm ? stripTags(hm[1]) : stripTags(blockHtml);
      if (heading) blocks.push(`## ${heading}`);
      continue;
    }

    const liMatches = Array.from(blockHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
    if (liMatches.length) {
      for (const li of liMatches) {
        const t = stripTags(li[1]);
        if (t) blocks.push(`- ${t}`);
      }
      continue;
    }

    const text = stripTags(blockHtml);
    if (text) blocks.push(text);
  }

  // Collapse list items.
  let out = "";
  for (let i = 0; i < blocks.length; i++) {
    const cur = blocks[i];
    const prev = blocks[i - 1];
    const isList = cur.startsWith("- ");
    const prevIsList = prev && prev.startsWith("- ");
    if (i === 0) out += cur;
    else if (isList && prevIsList) out += `\n${cur}`;
    else out += `\n\n${cur}`;
  }

  return out.trim();
}

function extractHashtagTags(text) {
  const tags = (text.match(/#[A-Za-z][A-Za-z0-9]*/g) || [])
    .map((t) => t.slice(1))
    .map((t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase());
  return Array.from(new Set(tags));
}

function getRequestHeaders(includeCookie = false) {
  const headers = {
    // LinkedIn serves different HTML based on UA.
    "user-agent": "Mozilla/5.0 (compatible; nikolajflojgaard.me bot; +https://nikolajflojgaard.me)",
    "accept-language": "en-US,en;q=0.9,da;q=0.8",
  };
  if (includeCookie && LINKEDIN_COOKIE_HEADER) headers.cookie = LINKEDIN_COOKIE_HEADER;
  return headers;
}

function discoverUrlsFromHtml(html) {
  const urls = new Set();

  const direct = html.match(/https:\/\/www\.linkedin\.com\/(?:feed\/update\/urn:li:activity:\d+\/|pulse\/[^"'\s<]+)/g) || [];
  for (const u of direct) urls.add(decodeEntities(u));

  // LinkedIn often escapes URLs in JSON blobs.
  const escaped =
    html.match(/https:\\\/\\\/www\.linkedin\.com\\\/(?:feed\\\/update\\\/urn:li:activity:\d+\\\/|pulse\\\/[^"\\\s<]+)/g) ||
    [];
  for (const raw of escaped) {
    urls.add(
      decodeEntities(raw)
        .replace(/\\\//g, "/")
        .replace(/\\u002F/g, "/")
        .replace(/\\u003A/g, ":"),
    );
  }

  return Array.from(urls);
}

async function fetchText(url, { includeCookie = false } = {}) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: getRequestHeaders(includeCookie),
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

function parseLinkedInCookieHeader(cookieHeader) {
  const cookies = [];
  for (const part of cookieHeader.split(";")) {
    const p = part.trim();
    if (!p || !p.includes("=")) continue;
    const [name, ...rest] = p.split("=");
    const value = rest.join("=").trim();
    if (!name || !value) continue;
    cookies.push({ name: name.trim(), value });
  }
  return cookies;
}

async function discoverUrlsFromProfileWithPlaywright() {
  if (!LINKEDIN_COOKIE_HEADER) return [];

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
    });

    const cookieItems = parseLinkedInCookieHeader(LINKEDIN_COOKIE_HEADER)
      .map((c) => ({
        ...c,
        domain: ".linkedin.com",
        path: "/",
        secure: true,
        httpOnly: false,
      }));

    if (cookieItems.length) await context.addCookies(cookieItems);

    const page = await context.newPage();
    await page.goto(LINKEDIN_PROFILE_URL, { waitUntil: "networkidle", timeout: 45000 });

    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 2200);
      await page.waitForTimeout(700);
    }

    const urls = new Set(discoverUrlsFromHtml(await page.content()));
    let hrefs = [];
    try {
      hrefs = await page.$$eval("a[href]", (els) =>
        Array.from(new Set(els.map((el) => el.getAttribute("href") || "").filter(Boolean))),
      );
    } catch {
      // LinkedIn can auto-navigate and reset execution context; ignore and keep HTML-based extraction.
    }

    for (const href of hrefs) {
      const full = href.startsWith("http") ? href : `https://www.linkedin.com${href}`;
      if (
        /^https:\/\/www\.linkedin\.com\/feed\/update\/urn:li:activity:\d+\/?/.test(full) ||
        /^https:\/\/www\.linkedin\.com\/pulse\//.test(full)
      ) {
        urls.add(full);
      }
    }

    await context.close();
    return Array.from(urls);
  } finally {
    await browser.close();
  }
}

async function discoverUrlsFromProfile() {
  let staticUrls = [];
  try {
    const html = await fetchText(LINKEDIN_PROFILE_URL, { includeCookie: !!LINKEDIN_COOKIE_HEADER });
    staticUrls = discoverUrlsFromHtml(html);
  } catch (e) {
    console.warn(`Static profile fetch failed: ${e.message}`);
  }

  if (staticUrls.length) return staticUrls;

  try {
    return await discoverUrlsFromProfileWithPlaywright();
  } catch (e) {
    console.warn(`Could not auto-discover profile URLs: ${e.message}`);
    return [];
  }
}

function buildMdx({ title, description, pubDatetime, tags, canonicalURL, ogImage, sourceUrl, body }) {
  const lines = [];
  lines.push("---");
  lines.push(`title: ${JSON.stringify(title)}`);
  lines.push(`description: ${JSON.stringify(description)}`);
  lines.push(`pubDatetime: ${pubDatetime}`);
  if (tags?.length) {
    lines.push("tags:");
    for (const t of tags) lines.push(`  - ${t}`);
  }
  lines.push(`canonicalURL: ${JSON.stringify(canonicalURL)}`);
  if (ogImage) lines.push(`ogImage: ${JSON.stringify(ogImage)}`);
  lines.push(`source: "LinkedIn"`);
  lines.push("---");
  lines.push("");
  lines.push("Originally published on LinkedIn:");
  lines.push("`" + sourceUrl + "`");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(body.trim());
  lines.push("");
  return lines.join("\n");
}

function findExistingCanonicalSet() {
  const canonicals = new Set();
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (p.endsWith(".md") || p.endsWith(".mdx")) {
        const c = readTextIfExists(p);
        if (!c) continue;
        const m = c.match(/canonicalURL:\s*["']([^"']+)["']/);
        if (m?.[1]) canonicals.add(m[1]);
      }
    }
  };
  if (fs.existsSync(OUT_ROOT)) walk(OUT_ROOT);
  return canonicals;
}

async function main() {
  const fileUrls = readUrls();
  const discoveredUrls = await discoverUrlsFromProfile();
  const urls = mergeAndWriteUrls(fileUrls, discoveredUrls);

  if (discoveredUrls.length) {
    console.log(`Auto-discovered ${discoveredUrls.length} URL(s) from profile page.`);
  } else {
    console.log("No URLs auto-discovered from profile page.");
  }

  if (!urls.length) {
    console.log(`No URLs found in ${path.relative(ROOT, URLS_PATH)}. Nothing to do.`);
    return;
  }

  const state = loadState();
  const already = new Set(state.importedCanonicalUrls);
  const existingCanonicals = findExistingCanonicalSet();

  let imported = 0;
  let skipped = 0;

  for (const url of urls) {
    let html;
    try {
      html = await fetchText(url);
    } catch (e) {
      console.warn(`Skipping (fetch failed): ${url}\n  ${e.message}`);
      skipped++;
      continue;
    }

    let canonical = extractCanonical(html);
    let json = extractJsonLd(html);

    if ((!canonical || !json) && LINKEDIN_COOKIE_HEADER) {
      try {
        const htmlWithCookie = await fetchText(url, { includeCookie: true });
        canonical = canonical || extractCanonical(htmlWithCookie);
        json = json || extractJsonLd(htmlWithCookie);
        if (!canonical && !json) html = htmlWithCookie;
      } catch {
        // Ignore cookie fallback failures.
      }
    }
    const isPulseUrl = /linkedin\.com\/pulse\//i.test(url);
    const pulseTitle = isPulseUrl ? extractMetaContent(html, "og:title") : null;
    const pulseDescription = isPulseUrl ? extractMetaContent(html, "description") : null;
    const pulseBody = isPulseUrl ? extractPulseArticleText(html) : "";

    if (!canonical) canonical = url.split("?")[0];
    if (!json && !isPulseUrl) {
      console.warn(`Skipping (missing canonical/jsonld): ${url}`);
      skipped++;
      continue;
    }

    if (already.has(canonical) || existingCanonicals.has(canonical)) {
      skipped++;
      continue;
    }

    const pub = json?.datePublished || new Date().toISOString();
    const dt = pub ? new Date(pub) : null;
    if (!dt || Number.isNaN(dt.getTime())) {
      console.warn(`Skipping (bad datePublished): ${url}`);
      skipped++;
      continue;
    }

    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");

    // Prefer a richer title if present (common for article shares).
    const headline = (json?.headline || "").trim();
    const textTitle = (json?.text || "").trim();
    const title = isPulseUrl
      ? (pulseTitle || headline || textTitle || "LinkedIn post")
      : (textTitle && textTitle !== headline && textTitle.length <= 120)
        ? textTitle
        : (headline || "LinkedIn post");
    const baseSlug = slugify(title || headline) || `linkedin-${yyyy}-${mm}-${dd}`;

    let body = isPulseUrl ? pulseBody : (json?.articleBody || "").trim();

    // If the post is just a short headline but contains a linked Pulse article, import that instead.
    if (body && headline && body === headline) {
      const pulseUrl = extractPulseUrl(html);
      if (pulseUrl) {
        try {
          const pulseHtml = await fetchText(pulseUrl);
          const pulseText = extractPulseArticleText(pulseHtml);
          if (pulseText && pulseText.length > body.length) {
            body = `This LinkedIn post links to the full article:\n\`${pulseUrl}\`\n\n---\n\n${pulseText}`;
          }
        } catch (e) {
          // Ignore and keep the short body.
        }
      }
    }

    if (!body) body = headline || title;

    const tags = extractHashtagTags(body);
    const ogImage =
      extractMetaContent(html, "og:image") ||
      (json?.image?.url || (json?.image?.["@type"] === "ImageObject" ? json?.image?.url : undefined));
    const description = ((isPulseUrl ? pulseDescription : headline) || title).slice(0, 160);

    const mdx = buildMdx({
      title,
      description,
      pubDatetime: dt.toISOString(),
      tags,
      canonicalURL: canonical,
      ogImage,
      sourceUrl: url,
      body,
    });

    const outDir = path.join(OUT_ROOT, String(yyyy));
    const outPath = path.join(outDir, `${yyyy}-${mm}-${dd}-${baseSlug}.mdx`);
    if (fs.existsSync(outPath)) {
      skipped++;
      continue;
    }

    writeText(outPath, mdx);
    state.importedCanonicalUrls.push(canonical);
    imported++;
    console.log(`Imported: ${path.relative(ROOT, outPath)}`);
  }

  saveState(state);
  console.log(`Done. imported=${imported} skipped=${skipped}`);
}

await main();
