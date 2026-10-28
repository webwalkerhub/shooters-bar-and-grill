// Builds the Shooter's Bar & Grill site from the editable files in /content.
// No outside packages: Netlify runs `node build.js` and publishes /dist.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const IMG = path.join(ROOT, 'src', 'img');
const TIME_ZONE = 'America/Chicago';
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));

const biz = read('business.json');
const seo = read('seo.json');
const tourn = read('tournaments.json');
const favFile = read('favorites.json');
const homeMenu = read('home-menu.json');
const menuFile = read('menu.json');
const revFile = read('reviews.json');

// ---------- helpers ----------
const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => String(s).toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
const siteUrl = String(seo.siteUrl || '').replace(/\/+$/, '');
const abs = (p) => siteUrl + '/' + String(p).replace(/^\/+/, '');
const imgSrc = (p) => String(p || '').replace(/^\/+/, ''); // page uses relative img paths
const digits = String(biz.phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
const list = (a) => (a || []).map((x) => (x && typeof x === 'object' ? x.text : x)).filter(Boolean);

function fail(msg) { console.error('\nBUILD STOPPED: ' + msg + '\n'); process.exit(1); }

// "21:00" -> {h:21,m:0}; validates the editor's input
function parseTime(t, where) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
  if (!m || +m[1] > 24 || +m[2] > 59) fail(`${where}: time "${t}" should look like 10:00 or 21:30 (24-hour clock).`);
  return { h: +m[1], m: +m[2] };
}
const label = ({ h, m }) => {
  const ap = h % 24 < 12 ? 'AM' : 'PM';
  return ((h % 12) || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + ap;
};

// Photo srcset: uses every size of the same photo in src/img (name-480.webp, name-800.webp...).
// A newly uploaded photo with no size variants just gets a plain src.
const imgFiles = fs.readdirSync(IMG);
function srcset(p) {
  const file = path.basename(imgSrc(p));
  const m = /^(.*)-(\d+)\.(webp|jpe?g|png)$/i.exec(file);
  if (!m) return '';
  const sizes = imgFiles
    .map((f) => { const x = new RegExp('^' + m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-(\\d+)\\.' + m[3] + '$', 'i').exec(f); return x ? +x[1] : 0; })
    .filter(Boolean).sort((a, b) => a - b);
  return sizes.length > 1 ? sizes.map((w) => `img/${m[1]}-${w}.${m[3]} ${w}w`).join(', ') : '';
}
function checkImg(p, where) {
  if (!p) fail(`${where}: photo is missing.`);
  if (!fs.existsSync(path.join(IMG, path.basename(imgSrc(p))))) fail(`${where}: photo "${p}" isn't in src/img.`);
}

// ---------- hours ----------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayIndex = (d, where) => {
  const i = DAYS.findIndex((x) => x.toLowerCase() === String(d || '').trim().toLowerCase());
  if (i < 0) fail(`${where}: "${d}" isn't a day of the week.`);
  return i;
};
const hours = (biz.hours || []).map((h) => {
  const i = dayIndex(h.day, 'Hours');
  if (h.closed) return { day: DAYS[i], i, closed: true };
  const o = parseTime(h.opens, `Hours (${h.day}) opens`);
  const c = parseTime(h.closes, `Hours (${h.day}) closes`);
  return { day: DAYS[i], i, closed: false, o, c, opens: h.opens.trim(), closes: h.closes.trim() };
});
DAYS.forEach((d) => { if (!hours.find((h) => h.day === d)) fail(`Hours: "${d}" is missing.`); });

// ---------- full menu sections ----------
const usedIds = new Set();
const cats = (menuFile.categories || []).map((c) => {
  let id = slug(c.name); while (usedIds.has(id)) id += '-2'; usedIds.add(id);
  return { ...c, id };
});
if (!cats.length) fail('Full menu: add at least one section.');
const catId = (name) => {
  const c = cats.find((x) => x.name.trim().toLowerCase() === String(name || '').trim().toLowerCase());
  return c ? c.id : cats[0].id;
};

// ---------- blocks ----------
const blocks = {};

blocks.ticker = (() => {
  const items = list(biz.ticker).map((t) => `<span>${esc(t)} <i>&#9679;</i></span>`).join('');
  return items.repeat(4); // repeated for the seamless scroll
})();

const rating = parseFloat(biz.googleRating) || 0;
blocks.ratingstars = '&#9733;'.repeat(Math.max(1, Math.min(5, Math.round(rating))));
blocks.firstcat = cats[0].id;

blocks.tournaments = (tourn.items || []).map((t) => {
  const d = dayIndex(t.day, `Tournaments (${t.title})`);
  const li = (t.details || []).map((x) => `<li><b>${esc(x.big)}</b><span>${esc(x.small)}</span></li>`).join('');
  return `<div class="tday rv" data-d="${d}"><small>${esc(DAYS[d])}</small><h3>${esc(t.title)}</h3>${t.starts ? `<p class="when">${esc(t.starts)}</p>` : ''}<ul>${li}</ul></div>`;
}).join('\n');

blocks.favorites = (favFile.items || []).map((f, n) => {
  checkImg(f.image, `Fan favorites (${f.title || n + 1})`);
  const ss = srcset(f.image);
  return `<figure class="fav rv"><img${f.showTop ? ' style="object-position:50% 0"' : ''} src="${esc(imgSrc(f.image))}"${ss ? ` srcset="${ss}" sizes="(max-width:520px) 100vw, (max-width:1000px) 50vw, 290px"` : ''} width="896" height="1120" alt="${esc(f.alt || f.title)}" loading="lazy" decoding="async"><figcaption><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></figcaption></figure>`;
}).join('\n');

blocks.banner = `<h2>${esc(biz.bannerTitle)}${biz.bannerHighlight ? ` <span>${esc(biz.bannerHighlight)}</span>` : ''}${esc(biz.bannerTitleEnd)}</h2>${biz.bannerText ? `<p>${esc(biz.bannerText)}</p>` : ''}`;

blocks.homemenu = (homeMenu.columns || []).map((col, n) =>
  `<h3${n ? ' style="margin-top:22px"' : ''}>${esc(col.title)}</h3><ul class="pv">` +
  (col.items || []).map((it) => `<li>${esc(it.name)}<i></i><b>${esc(it.price)}</b></li>`).join('') +
  `</ul><button type="button" class="mp-more" data-open="${catId(col.menuSection)}">See all &rarr;</button>`
).join('\n');
blocks.special = `${homeMenu.specialLabel ? `<b>${esc(homeMenu.specialLabel)}</b> ` : ''}${esc(homeMenu.specialText)}`;

blocks.reviews = (revFile.items || []).map((r) => {
  const n = Math.max(1, Math.min(5, parseInt(r.stars, 10) || 5));
  const who = [r.author, r.source].filter(Boolean).map(esc).join(' &middot; ');
  return `<figure class="q rv"><span class="st" aria-label="${n} stars">${'&#9733;'.repeat(n)}</span><blockquote>&ldquo;${esc(r.quote)}&rdquo;</blockquote><figcaption>${who}</figcaption></figure>`;
}).join('\n');
const mentions = (revFile.mentions || []).filter((m) => m && m.label);
blocks.mentions = mentions.length
  ? `<div class="mention rv">Most mentioned in reviews: ${mentions.map((m) => `<span><b>${esc(m.label)}</b>${m.count ? ' &middot; ' + esc(m.count) : ''}</span>`).join('')}</div>`
  : '';

blocks.facebook = biz.facebookUrl ? `<a class="btn o" href="${esc(biz.facebookUrl)}" target="_blank" rel="noopener">Facebook</a>` : '';
blocks.services = list(biz.services).map((s) => `<span>${esc(s)}</span>`).join('');

blocks.hours = hours.map((h) =>
  `<div class="hr" data-d="${h.i}"><span>${h.day}</span><span>${h.closed ? 'Closed' : `${label(h.o)} &ndash; ${label(h.c)}`}</span></div>`
).join('');
// [opens, closes] in hours for the "open now" chip, Sunday first; past midnight = over 24
blocks.hoursjs = JSON.stringify(DAYS.map((d) => {
  const h = hours.find((x) => x.day === d);
  if (h.closed) return null;
  const o = h.o.h + h.o.m / 60;
  let c = h.c.h + h.c.m / 60;
  if (c <= o) c += 24;
  return [o, c];
}));

blocks.tabs = cats.map((c) => `<a href="#m-${c.id}" data-cat="${c.id}">${esc(c.name)}</a>`).join('');
blocks.fullmenu = cats.map((c) => {
  const items = (c.items || []).map((it) =>
    `<li><div class="mi-h"><h4>${esc(it.name)}</h4><i></i><b>${esc(it.price)}</b></div>${it.description ? `<p>${esc(it.description)}</p>` : ''}</li>`).join('');
  const notes = (c.notes || []).filter((x) => x && (x.bold || x.text))
    .map((x) => `<p>${x.bold ? `<b>${esc(x.bold)}</b> ` : ''}${esc(x.text)}</p>`).join('');
  return `<div class="mcat" id="m-${c.id}"><h3>${esc(c.name)}</h3><ul>${items}</ul>${notes ? `<div class="mnotes">${notes}</div>` : ''}</div>`;
}).join('\n');
blocks.menufoot = menuFile.footNote ? `<p class="fm-foot">${esc(menuFile.footNote)}</p>` : '';
blocks.footernote = biz.footerNote ? `<span>${esc(biz.footerNote)}</span>` : '';

// ---------- head + structured data ----------
const schema = {
  '@context': 'https://schema.org',
  '@type': 'BarOrPub',
  name: biz.name,
  servesCuisine: String(seo.cuisine || '').split(',').map((s) => s.trim()).filter(Boolean),
  priceRange: seo.priceRange,
  hasMenu: siteUrl + '/#menu',
  url: siteUrl + '/',
  telephone: `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`,
  image: abs('img/og.jpg'),
  ...(biz.facebookUrl ? { sameAs: [biz.facebookUrl] } : {}),
  address: { '@type': 'PostalAddress', streetAddress: biz.street, addressLocality: biz.city, addressRegion: biz.state, postalCode: biz.zip, addressCountry: 'US' },
  geo: { '@type': 'GeoCoordinates', latitude: biz.latitude, longitude: biz.longitude },
  hasMap: biz.mapsUrl,
  openingHoursSpecification: DAYS.map((d) => hours.find((h) => h.day === d)).filter((h) => !h.closed)
    .map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.day, opens: h.opens.padStart(5, '0'), closes: h.closes.padStart(5, '0') })),
};
if (biz.googleRating && biz.googleReviewCount) {
  schema.aggregateRating = { '@type': 'AggregateRating', ratingValue: String(biz.googleRating), reviewCount: String(biz.googleReviewCount) };
}

blocks.head = [
  `<title>${esc(seo.title)}</title>`,
  `<meta name="description" content="${esc(seo.description)}">`,
  seo.hideFromGoogle ? '<meta name="robots" content="noindex, nofollow">' : '',
  `<link rel="canonical" href="${esc(siteUrl)}/">`,
  '<meta property="og:type" content="restaurant">',
  `<meta property="og:title" content="${esc(seo.shareTitle || seo.title)}">`,
  `<meta property="og:description" content="${esc(seo.shareDescription || seo.description)}">`,
  `<meta property="og:image" content="${esc(abs('img/og.jpg'))}">`,
  `<meta property="og:url" content="${esc(siteUrl)}/">`,
  '<meta name="twitter:card" content="summary_large_image">',
  '<meta name="theme-color" content="#14432d">',
  '<link rel="icon" type="image/png" sizes="32x32" href="img/favicon-32.png">',
  '<link rel="icon" type="image/png" sizes="192x192" href="img/favicon-192.png">',
  '<link rel="apple-touch-icon" href="img/apple-touch-icon.png">',
  `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`,
].filter(Boolean).join('\n');

// ---------- render ----------
if (digits.length !== 10) fail(`Phone "${biz.phone}" doesn't look like a full phone number.`);
const address = `${biz.name}, ${biz.street}, ${biz.city}, ${biz.state} ${biz.zip}`;
const tokens = {
  name: biz.name, kicker: biz.kicker, tagline: biz.tagline, phone: biz.phone, tel: digits,
  street: biz.street, city: biz.city, state: biz.state, zip: biz.zip,
  mapsUrl: biz.mapsUrl, directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address).replace(/'/g, '%27').replace(/%20/g, '+'),
  googleRating: biz.googleRating, googleReviewCount: biz.googleReviewCount, nearNote: biz.nearNote,
  tournIntro: tourn.intro, tournNote: tourn.note, favIntro: favFile.intro, menuIntro: homeMenu.intro,
  timeZone: TIME_ZONE,
};

let page = fs.readFileSync(path.join(ROOT, 'src', 'page.html'), 'utf8');
page = page.replace(/<!--@(\w+)-->/g, (m, k) => {
  if (!(k in blocks)) fail(`Template block "${k}" has no content.`);
  return blocks[k];
});
page = page.replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in tokens)) fail(`Template field "${k}" is unknown.`);
  return esc(tokens[k]);
});

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), page);
fs.cpSync(IMG, path.join(OUT, 'img'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'robots.txt'),
  seo.hideFromGoogle ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(siteUrl)}/</loc></url></urlset>\n`);
console.log('Built dist/index.html');
