// Shifara Health - static page generator.
//
//   node tools/build.js            build / update every page folder
//   node tools/build.js --force    also overwrite pages you edited by hand
//   node tools/build.js --only=doctor/dr-punit-singla/   write only the pages under that path (a preview);
//                                  filter folders, the homepage and the sitemap are left as they are
//
// Output (one folder per URL, each with its own index.html you can edit directly):
//   hospitals/  doctors/  treatments/            listing pages (filters run in assets/js/listing.js)
//   hospital/<id>/  doctor/<id>/  treatment/<id>/ detail pages (full content in the HTML)
//   privacy-policy/  medical-disclaimer/           legal pages (content in tools/pages/<slug>.html)
//   services/<slug>/                              service pages (content in tools/services.js)
//   blog/  blog/<slug>/                           blog listing and posts (one file per post in tools/blog/<slug>.html)
//   about-us/  concierge/  country-comparison/  partner-with-us/  book-consultation/   company pages (content in tools/pages/<slug>.html)
//   hospitals/cardiology/delhi/ …                 a listing page with its own title and results for every filter URL some page links to
//   404.html                                      not-found page; sends unknown filter URLs on to the listing page
//   sitemap.xml  robots.txt                       every indexable page folder (tools/sitemap.js)
//
// All links are saved relative to each page's folder, so the site runs at a domain root, in a subfolder,
// on any static server (Apache, Nginx, Netlify, VS Code Live Server…) and from disk.
//
// Inputs: index.html (header + footer), assets/data/catalog.js, assets/data/details/<kind>/<id>.js
// Every generated page carries a "shifara:generated" marker with a hash of its content. If the file was
// changed by hand since the last build, the hash no longer matches and the page is skipped (unless --force).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FORCE = process.argv.includes('--force');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice('--only='.length).replace(/^\//, '');
// canonical, social and schema.org URLs are absolute; the page links themselves stay relative
const SITE = (process.env.SITE_URL || 'https://shifarahealth.com').replace(/\/$/, '');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------- Data ----------
global.window = {};
require(path.join(ROOT, 'assets/data/catalog.js'));
require(path.join(ROOT, 'assets/js/cards.js'));
const UI = window.ShifaraUI;
// Blog posts: one file per post in tools/blog/<slug>.html. A post starts with a comment holding its details as JSON
// (title, description, excerpt, category, date as YYYY-MM-DD, image, imageAlt, treatments as a list of treatment ids).
const POSTS = fs.readdirSync(path.join(ROOT, 'tools/blog')).filter(f => f.endsWith('.html')).map(f => {
    const raw = read(`tools/blog/${f}`).replace(/\r\n/g, '\n');
    const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\n?/);
    if (!m) throw new Error(`tools/blog/${f}: a post must start with a <!-- { details } --> comment`);
    return { slug: f.slice(0, -5), ...JSON.parse(m[1]), body: raw.slice(m[0].length).trim() };
}).sort((a, b) => b.date.localeCompare(a.date));
const T = require('./detail-templates.js')(UI, SITE, detailData, POSTS);
const { D, esc } = UI;

function detailData(kind, id) {
    const p = path.join(ROOT, 'assets/data/details', kind, id + '.js');
    if (!fs.existsSync(p)) return {};
    const s = fs.readFileSync(p, 'utf8');
    return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
}

// ---------- Site-root links ----------
// Templates write links from the site root ("/hospitals/", "/assets/…"). Every page is saved with them made
// relative to its own folder ("../../hospitals/"), so the site works at a domain root, in a subfolder, on any
// static server and from disk.
const ROOT_LINK = /(\s(?:href|src|data-href)=")\/(?!\/)([^"]*)"/g;
const relative = (html, rel) => {
    const up = '../'.repeat(rel.split('/').length - 1);
    return html.replace(ROOT_LINK, (m, attr, p) => `${attr}${up + p || './'}"`);
};
// …and back, for reading the homepage (which sits at the root) as the layout source
const fromRoot = html => html.replace(/(\s(?:href|src|data-href)=")(?![\/#?]|[a-z][a-z\d+.-]*:)(?:\.\/)?([^"]*)"/gi,
    (m, attr, p) => `${attr}/${p}"`);

// ---------- Layout from the homepage ----------
const home = fromRoot(read('index.html').replace(/\r\n/g, '\n'));
const HERO = '    <!-- ================= HERO ================= -->';
const FOOTER = '    <!-- ================= FOOTER ================= -->';
if (!home.includes(HERO) || !home.includes(FOOTER)) throw new Error('index.html is missing the HERO / FOOTER markers');
// homepage section links (#quote, #cost…) must point back to the homepage from other pages
const siteAnchors = s => s.replace(/(<a\b[^>]*?\bhref=")#([a-z][\w-]*)"/g, '$1/#$2"');
// assets the homepage hospital finder needs; other pages add their own through layout({ css, js })
const homeOnly = s => s
    .replace(/[ \t]*<link rel="stylesheet" href="\/assets\/css\/listing\.css">\n/g, '')
    .replace(/[ \t]*<script src="\/assets\/(data\/catalog|js\/cards|js\/home-search)\.js"><\/script>\n/g, '');
// the homepage's own SEO tags stay on the homepage; other pages add theirs through layout({ extraHead })
const HEAD = homeOnly(siteAnchors(home.slice(0, home.indexOf(HERO))))
    .replace(/[ \t]*<(?:meta name="(?:author|robots|twitter:card)"|meta property="og:|link rel="canonical"|script type="application\/ld\+json").*\n/g, '');
const FOOT = homeOnly(siteAnchors(home.slice(home.indexOf(FOOTER))));

// extraHead: whole lines (canonical, social and schema.org tags) placed just before </head>
function layout({ title, description, css, js, main, extraHead = '' }) {
    let head = HEAD
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)} | Shifara Health</title>`)
        .replace(/<meta name="description"\s+content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
        .replace(/(<link rel="stylesheet" href="\/assets\/css\/style.css">)/,
            '$1' + css.map(c => `\n    <link rel="stylesheet" href="/assets/css/${c}">`).join(''))
        .replace('</head>', extraHead + '</head>');
    const foot = FOOT.replace(/(    <script src="\/assets\/js\/main.js"><\/script>\n)/,
        '$1' + js.map(j => `    <script src="${j}"></script>\n`).join(''));
    if (!js.every(j => foot.includes(j)) || !css.every(c => head.includes(c))) {
        throw new Error('Could not add page CSS/JS: index.html must keep the style.css <link> and main.js <script> tags');
    }
    return head + main + '\n' + foot;
}

// ---------- Writing with edit protection ----------
const MARK = /<!-- shifara:generated hash=([0-9a-f]{12}) -->\r?\n/;
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const stats = { written: 0, unchanged: 0, skipped: [] };

const norm = s => s.replace(/\r\n/g, '\n');

// Listing URLs with filters (/hospitals/cardiology/delhi/) that pages link to; each gets a real folder below
const linkedListings = new Set();
function collectListings(html, rel) {
    const page = new URL(rel.replace(/[^/]*$/, ''), 'http://site/');
    for (const m of html.matchAll(/\s(?:href|data-href)="([^"#?]*)/g)) {
        const p = new URL(m[1], page).pathname;
        const type = p.split('/')[1];
        if (!LISTINGS[type] || p === `/${type}/`) continue;
        // only valid filter paths, written the way listUrl writes them
        const f = UI.readFilters(p);
        const { page: n, ...filters } = f;
        if (UI.listUrl(type, filters, { page: n }) === p) linkedListings.add(p);
    }
}

// asIs: save the links exactly as given (already relative, or site-root on purpose)
// seo: the page's SEO tags, added to a hand-edited page that does not have them yet
function write(rel, html, { asIs = false, seo = '' } = {}) {
    collectListings(html, rel);
    if (ONLY && !rel.startsWith(ONLY)) return;
    // marker goes on its own line right after <!doctype html>; editors may switch the file to CRLF,
    // so the hash is taken over LF-normalised content
    const body = norm(asIs ? html : relative(html, rel)).replace(/^(<!doctype html>)\n?/i, '$1\n');
    const withMark = h => body.replace(/^(<!doctype html>\n)/i, `$1<!-- shifara:generated hash=${h} -->\n`);
    const file = path.join(ROOT, rel);
    if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const old = norm(raw);
        const m = old.match(MARK);
        const edited = !m || hash(old.replace(MARK, '')) !== m[1];
        if (edited && !FORCE) {
            // keep the hand edits, but still make its site-root links relative
            collectListings(old, rel);
            let fixed = relative(raw, rel);
            if (seo && !raw.includes('rel="canonical"')) fixed = fixed.replace('</head>', seo + '</head>');
            if (fixed !== raw) fs.writeFileSync(file, fixed);
            stats.skipped.push(rel);
            return;
        }
        if (!edited && old.replace(MARK, '') === body) { stats.unchanged++; return; }
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, withMark(hash(body)));
    stats.written++;
}

// ---------- Listing pages ----------
const LISTINGS = {
    hospitals: {
        title: 'Partner Hospitals in India', crumb: 'Hospitals',
        desc: `Compare ${D.hospitals.length} JCI and NABH accredited partner hospitals in India by city, department and treatment. Free quotes and coordination from Shifara Health.`,
        cols: 'row-cols-1 row-cols-md-2 row-cols-xl-3',
        cta: ['Not sure which hospital is right for you?', "Send your reports. We'll compare up to 3 hospitals and share written estimates within 48 hours, free."],
    },
    doctors: {
        title: 'Specialist Doctors in India', crumb: 'Doctors',
        desc: `Find the right specialist among ${D.doctors.length} senior doctors at accredited hospitals in India. Filter by department, city and hospital.`,
        cols: 'row-cols-1 row-cols-md-2 row-cols-xl-3',
        cta: ['Want a second opinion first?', 'Share your reports and get a free opinion from a senior specialist before you travel.'],
    },
    treatments: {
        title: 'Treatments in India', crumb: 'Treatments',
        desc: `Explore ${D.treatments.length} treatments available at accredited hospitals in India. Get a free treatment plan and cost estimate.`,
        cols: 'row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4',
        cta: ["Can't find your treatment?", "Tell us your diagnosis and we'll suggest the right treatment, hospital and cost, free."],
    },
};

const LISTING_MAIN = {};
for (const [page, c] of Object.entries(LISTINGS)) {
    LISTING_MAIN[page] = `    <!-- ================= LISTING (${page}) ================= -->
    <main data-listing="${page}">
        <section class="lp-hero">
            <div class="container">
                <nav class="lp-crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a
                        href="/${page}/">${c.crumb}</a><span>/</span><span id="lrCrumb">${c.title}</span></nav>
                <h1 id="lrTitle">${c.title}</h1>
                <p id="lrIntro"></p>
            </div>
        </section>

        <div class="container">
            <div class="lf" id="lfBar">
                <div class="lf-top">
                    <span class="lf-title-wrap"><svg>
                            <use href="#search" />
                        </svg><span class="lf-title"></span></span>
                    <span class="lf-count d-none"></span>
                </div>
                <div class="lf-body">
                    <div class="row g-3" id="lfFields"></div>
                    <div class="lf-foot">
                        <button type="button" class="lf-clear invisible">× Clear filters</button>
                        <button type="button" class="btn btn-coral lf-search"><svg>
                                <use href="#search" />
                            </svg><span></span></button>
                    </div>
                </div>
            </div>
        </div>

        <section class="lr" id="lrTop">
            <div class="container">
                <div class="lr-chips" id="lrChips"></div>
                <div class="lr-bar">
                    <p class="lr-count mb-0" id="lrCount"></p>
                    <label class="lr-sort">Sort by <select class="form-select" id="lrSort"></select></label>
                </div>
                <div class="row ${c.cols} g-3 g-lg-4" id="lrGrid"></div>
                <nav class="lr-pager" id="lrPager" aria-label="Pagination"></nav>

                <div class="lp-cta mt-5 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div>
                        <h2>${c.cta[0]}</h2>
                        <p>${c.cta[1]}</p>
                    </div>
                    <div class="d-flex flex-wrap gap-2 flex-none">
                        <a href="/book-consultation/" class="btn btn-coral">Get free quote</a>
                        <a href="https://wa.me/919971316164" target="_blank" rel="noopener" class="btn btn-wa"><svg class="i">
                                <use href="#wa" />
                            </svg> WhatsApp</a>
                    </div>
                </div>
            </div>
        </section>
    </main>
`;
}

// One listing page: /<type>/ or a filter URL such as /hospitals/cardiology/delhi/
function listingPage(type, p) {
    const c = LISTINGS[type];
    const { page: _page, ...f } = UI.readFilters(p);
    // a treatment moved to another department: its old filter URL stays and points search engines at the new one
    const moved = f.treatment && f.department !== UI.treatBy[f.treatment]?.department;
    if (moved) f.department = UI.treatBy[f.treatment]?.department;
    const items = UI.listingItems(type, f);
    // a hospital + department page with 0 or 1 doctors repeats the hospital's own page: the URL stays, search engines get the hospital
    const thin = type === 'doctors' && f.hospital && f.department && items.length < 2;
    const heading = UI.listingTitle(type, f);
    const title = UI.listingDocTitle(type, f);
    const description = T.listingDescription(type, f, items);
    const about = thin || !items.length ? null : T.listingAbout(type, f, items);
    const url = SITE + p;
    const extraHead = T.seoHead({
        url, canonical: moved ? SITE + UI.listUrl(type, f) : thin ? `${SITE}/hospital/${f.hospital}/` : url, title, description, pageType: 'CollectionPage', faqs: about?.faqs,
        crumbs: [['Home', '/'], [c.crumb, `/${type}/`], ...(p === `/${type}/` ? [] : [[heading, p]])],
        nodes: items.length ? [{
            '@type': 'ItemList', '@id': url + '#results', numberOfItems: items.length,
            itemListElement: items.slice(0, 12).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: `${SITE}/${type.slice(0, -1)}/${it.id}/` })),
        }] : [],
    });
    // the first page of results as listing.js shows it, then more cards (hidden, up to 60) so search engines can follow them
    const card = { hospitals: UI.hospitalCard, doctors: UI.doctorCard, treatments: UI.treatmentCard }[type];
    const cards = items.slice(0, 60).map((it, i) => i < 12 ? card(it) : card(it).replace('<div class="col">', '<div class="col d-none">')).join('\n');
    const main = LISTING_MAIN[type]
        .replace(`<span id="lrCrumb">${c.title}</span>`, () => `<span id="lrCrumb">${esc(heading)}</span>`)
        .replace(`<h1 id="lrTitle">${c.title}</h1>`, () => `<h1 id="lrTitle">${esc(heading)}</h1>`)
        .replace('<p id="lrIntro"></p>', () => `<p id="lrIntro">${esc(UI.listingIntro(type, items.length, f))}</p>`)
        .replace('id="lrGrid"></div>', () => `id="lrGrid">${cards}</div>`)
        .replace('id="lrPager" aria-label="Pagination"></nav>', m => m + (about ? about.html : ''));
    return layout({
        title, description, css: about ? ['listing.css', 'detail.css'] : ['listing.css'],
        js: ['/assets/data/catalog.js', '/assets/js/cards.js', '/assets/js/listing.js'], main, extraHead,
    });
}
for (const page of Object.keys(LISTINGS)) write(`${page}/index.html`, listingPage(page, `/${page}/`));

// SEO tags for the pages with a simple Home > page trail
const simpleSeo = (p, title, description, name) => T.seoHead({ url: SITE + p, title, description, crumbs: [['Home', '/'], [name, p]] });

// ---------- Legal pages (content in tools/pages/<slug>.html) ----------
const LEGAL = {
    'privacy-policy': {
        title: 'Privacy Policy',
        desc: 'How Shifara Health collects, uses, shares and protects your personal and health data under the Digital Personal Data Protection Act, 2023.',
    },
    'medical-disclaimer': {
        title: 'Medical Disclaimer',
        desc: 'Shifara Health is a medical travel facilitator. Information on this website is for general awareness and is not medical advice.',
    },
};
for (const [slug, c] of Object.entries(LEGAL)) {
    const body = read(`tools/pages/${slug}.html`).replace(/\r\n/g, '\n').replace(/^<!--[\s\S]*?-->\n/, '');
    const main = `    <!-- ================= PAGE: ${slug} ================= -->
    <main>
        <section class="lp-hero lp-hero-page">
            <div class="container">
                <nav class="lp-crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span>${c.title}</span></nav>
                <h1>${c.title}</h1>
            </div>
        </section>
        <div class="container">
            <article class="legal">
${body.trim().split('\n').map(l => '                ' + l).join('\n')}
            </article>
        </div>
    </main>
`;
    const seo = simpleSeo(`/${slug}/`, c.title, c.desc, c.title);
    write(`${slug}/index.html`, layout({ title: c.title, description: c.desc, css: ['listing.css'], js: [], main, extraHead: seo }), { seo });
}

// ---------- Service pages (content in tools/services.js) ----------
const SERVICES = require('./services.js');
const icon = (id, cls = '') => `<svg${cls ? ` class="${cls}"` : ''}><use href="#${id}" /></svg>`;
// Partner cards (air ambulance, step-down, nursing home): photo or brand panel beside the profile, then lists.
// A partner's `lists` ([icon, heading, items, boxed]) default to the air ambulance services / capabilities / fleet.
function partnersSection(p) {
    const list = (ic, label, items, boxed, cols) => `                                <div class="col-md-${12 / cols}">
                                    <h4 class="svp-ptr-h">${icon(ic)}${label}</h4>
                                    <ul class="svp-ptr-list${boxed ? ' fleet' : ''}">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
                                </div>`;
    return `        <section class="sec svp-ptr-sec">
            <div class="container">
                <div class="sec-head">
                    <span class="eyebrow">${esc(p.eyebrow)}</span>
                    <h2 class="title">${p.title}</h2>
${p.intro.map(t => `                    <p class="svp-ptr-intro">${esc(t)}</p>`).join('\n')}
                </div>
${p.list.map((c, i) => {
        const lists = c.lists || [['check', 'Services offered', c.services], ['heart', 'Medical capabilities', c.capabilities], ['amb', 'Fleet available', c.fleet, true]];
        return `                <article class="svp-ptr">
                    <div class="row g-0${i % 2 ? ' flex-lg-row-reverse' : ''}">
                        <div class="col-lg-5">
                            <div class="svp-ptr-img${c.image ? ' photo' : ''}">${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.imageAlt || c.name)}" loading="lazy">` : `${icon(p.icon || 'amb')}<b>${esc(c.name)}</b>`}</div>
                        </div>
                        <div class="col-lg-7">
                            <div class="svp-ptr-body">
                                <h3>${esc(c.name)}</h3>
                                <span class="svp-ptr-sub">About the company</span>
                                <p>${esc(c.about)}</p>
                                <div class="svp-ptr-facts">${c.facts.map(([ic, k, v]) => `<div>${icon(ic)}<span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
                            </div>
                        </div>
                    </div>
                    <div class="svp-ptr-foot">
                        <div class="row g-4">
${lists.map(([ic, label, items, boxed]) => list(ic, label, items, boxed, lists.length)).join('\n')}
                        </div>
                    </div>
                </article>`;
    }).join('\n')}
            </div>
        </section>
`;
}
for (const s of SERVICES) {
    const others = SERVICES.filter(o => o.slug !== s.slug);
    const main = `    <!-- ================= SERVICE: ${s.slug} ================= -->
    <main class="svp">
        <section class="svp-hero">
            <div class="container">
                <div class="row g-4 g-lg-5 align-items-center">
                    <div class="col-lg-6">
                        <nav class="lp-crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/#services">Services</a><span>/</span><span>${esc(s.name)}</span></nav>
                        <span class="svp-tag">${icon(s.icon)}${esc(s.tag)}</span>
                        <h1>${esc(s.title)}</h1>
                        <p class="svp-lead">${esc(s.lead)}</p>
                        <div class="d-flex flex-wrap gap-2 gap-sm-3">
                            <a href="/book-consultation/?for=${encodeURIComponent(s.name)}" class="btn btn-coral">Get free help ${icon('arrow', 'i')}</a>
                            <a href="https://wa.me/919971316164" target="_blank" rel="noopener" class="btn btn-wa">${icon('wa', 'i')}Ask on WhatsApp</a>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="svp-img"><img src="${esc(s.image)}" alt="${esc(s.imageAlt)}" fetchpriority="high"></div>
                    </div>
                </div>
            </div>
        </section>

        <section class="sec">
            <div class="container">
                <div class="sec-head">
                    <span class="eyebrow">What's included</span>
                    <h2 class="title">How We Help With <em>${esc(s.name)}</em></h2>
                </div>
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 g-lg-4">
${s.included.map(([h, p]) => `                    <div class="col"><div class="svp-inc">${icon('check')}<div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></div></div>`).join('\n')}
                </div>
            </div>
        </section>

${s.partners ? partnersSection(s.partners) : ''}
        <section class="sec svp-steps-sec">
            <div class="container">
                <div class="sec-head">
                    <span class="eyebrow">How it works</span>
                    <h2 class="title">Four Simple <em>Steps</em></h2>
                </div>
                <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 g-lg-4">
${s.steps.map(([h, p], i) => `                    <div class="col"><div class="svp-step"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></div></div>`).join('\n')}
                </div>
            </div>
        </section>

        <section class="sec faq">
            <div class="container">
                <div class="row g-4 g-lg-5">
                    <div class="col-lg-5">
                        <span class="eyebrow">Who it's for</span>
                        <h2 class="title text-start">Is ${esc(s.name)} <em>Right for You?</em></h2>
                        <ul class="svp-who">
${s.who.map(w => `                            <li>${icon('check')}${esc(w)}</li>`).join('\n')}
                        </ul>
                    </div>
                    <div class="col-lg-7">
                        <div class="accordion" id="svpFaq">
${s.faqs.map(([q, a], i) => `                            <div class="accordion-item">
                                <h3 class="accordion-header"><button class="accordion-button${i ? ' collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#sf${i}" aria-expanded="${!i}">${esc(q)}</button></h3>
                                <div id="sf${i}" class="accordion-collapse collapse${i ? '' : ' show'}" data-bs-parent="#svpFaq">
                                    <div class="accordion-body">${esc(a)}</div>
                                </div>
                            </div>`).join('\n')}
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="pb-5">
            <div class="container">
                <div class="lp-cta d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div>
                        <h2>Talk to a Shifara case manager</h2>
                        <p>Share your reports and we'll plan ${esc(s.name.toLowerCase())} around your treatment. Free for patients.</p>
                    </div>
                    <a href="/book-consultation/?for=${encodeURIComponent(s.name)}" class="btn btn-coral flex-none">Get free help ${icon('arrow', 'i')}</a>
                </div>
                <h2 class="svp-more-title">Other services</h2>
                <div class="row row-cols-2 row-cols-lg-4 g-3">
${others.map(o => `                    <div class="col"><a href="/services/${o.slug}/" class="svp-other">${icon(o.icon)}<b>${esc(o.name)}</b></a></div>`).join('\n')}
                </div>
            </div>
        </section>
    </main>
`;
    const seo = T.seoHead({ url: `${SITE}/services/${s.slug}/`, title: s.title, description: s.desc, image: s.image,
        crumbs: [['Home', '/'], [s.name, `/services/${s.slug}/`]] });
    write(`services/${s.slug}/index.html`, layout({ title: s.title, description: s.desc, css: ['listing.css', 'service.css'], js: [], main, extraHead: seo }), { seo });
}

// ---------- Company pages (content in tools/pages/<slug>.html) ----------
const COMPANY = {
    'about-us': {
        name: 'About Us', title: 'About Shifara Health: Medical Care Companion in India', eyebrow: 'About Shifara Health', h1: 'With You, <em>Every Step</em> of the Way',
        lead: 'We guide international patients through every question, appointment and unfamiliar step of treatment in India.',
        desc: 'Shifara Health connects international patients with accredited hospitals and support services in India, from first contact to follow-up.',
    },
    'concierge': {
        name: 'Concierge', title: 'Medical Concierge & Care Companion in India', eyebrow: 'Patient assistance', h1: 'Concierge &amp; <em>Care Companion</em>',
        lead: 'A dedicated care companion for hospital visits, paperwork, billing and daily needs, from your first consultation through recovery.',
        desc: 'Shifara Health concierge: a dedicated care companion for hospital navigation, care coordination, billing support and medical records during treatment in India.',
    },
    'country-comparison': {
        name: 'Country Comparison', title: 'Treatment Cost in India vs Other Countries', eyebrow: 'Cost & access', h1: 'Treatment Costs: <em>India vs Other Countries</em>',
        lead: 'Compare indicative treatment prices and waiting times in India, the USA, the UK, Singapore, Thailand and Turkey.',
        desc: 'Compare indicative treatment costs and waiting times in India, the USA, the UK, Singapore, Thailand and Turkey for heart, joint, transplant and IVF care.',
    },
    'book-consultation': {
        name: 'Book Consultation', eyebrow: '100% free · reply within 24 hrs', h1: 'Book a <em>Free Consultation</em>',
        lead: 'Share a few details about the patient. A Shifara case manager will reply within 24 hours with hospital options and the next steps.',
        desc: 'Book a free consultation with Shifara Health. Share your medical details and get opinions and written cost estimates from accredited hospitals in India.',
    },
    'partner-with-us': {
        name: 'Partner With Us', eyebrow: 'Shifara Partner Network', h1: 'Join the Medical Travel Network <em>for Africa, Bangladesh &amp; the Middle East</em>',
        lead: 'Refer patients to 130+ accredited hospitals in India, or care for them here. One team handles hospitals, visas, travel and recovery for every patient you refer.',
        desc: 'Become a Shifara Health partner: medical facilitators, travel agents, doctors and affiliates refer patients to 130+ accredited hospitals in India; hospitals and care services join the care network.',
    },
    'travel-visa': {
        name: 'Travel & Visa', title: 'India Medical Visa Guide for International Patients', eyebrow: 'Medical visa guide', h1: 'Medical Visa &amp; <em>Travel to India</em>',
        lead: 'Which visa to apply for, the documents you need, how to apply and what happens when you land, in one place. Our visa help is free.',
        desc: 'India medical visa guide for international patients: e-Medical Visa and attendant visas, documents, how to apply, FRRO registration and travel checklist.',
    },
    'thank-you': {
        name: 'Thank You', eyebrow: 'Request received', h1: 'Thank You! <em>We\'ve Got Your Details</em>',
        lead: 'Your enquiry has reached Shifara Health. Here is what happens next.',
        desc: 'Thank you for contacting Shifara Health.', noindex: true,
    },
};
for (const [slug, c] of Object.entries(COMPANY)) {
    const body = read(`tools/pages/${slug}.html`).replace(/\r\n/g, '\n').replace(/^<!--[\s\S]*?-->\n/, '');
    const main = `    <!-- ================= PAGE: ${slug} ================= -->
    <main class="cpg">
        <section class="pg-hero">
            <div class="container">
                <nav class="lp-crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span>${c.name}</span></nav>
                <span class="eyebrow">${esc(c.eyebrow)}</span>
                <h1>${c.h1}</h1>
                <p>${esc(c.lead)}</p>
            </div>
        </section>
${body.trim().split('\n').map(l => l ? '        ' + l : l).join('\n')}
    </main>
`;
    const title = c.title || c.name;
    const seo = c.noindex ? '' : simpleSeo(`/${slug}/`, title, c.desc, c.name);
    const html = layout({ title, description: c.desc, css: ['listing.css', 'service.css'], js: [], main, extraHead: seo });
    write(`${slug}/index.html`, c.noindex ? html.replace('<head>', '<head>\n    <meta name="robots" content="noindex">') : html, { seo });
}

// ---------- Blog (posts in tools/blog/<slug>.html) ----------
const postDate = d => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const postCard = p => `                    <div class="col"><a href="/blog/${p.slug}/" class="post post-lg">
                        <div class="cover"><img src="${esc(p.image)}" alt="${esc(p.imageAlt)}" loading="lazy"></div>
                        <div class="body">
                            <div class="meta">${postDate(p.date)}<i></i>${esc(p.category)}</div>
                            <h3>${esc(p.title)}</h3>
                            <p>${esc(p.excerpt)}</p>
                            <span class="more">Read the guide <svg class="i" style="width:16px"><use href="#arrow" /></svg></span>
                        </div>
                    </a></div>`;
const BLOG = {
    title: 'Health Blog: Guides for Medical Treatment in India',
    h1: 'Health Blog: Guides for Treatment in India',
    desc: 'Practical guides for international patients on treatment costs, hospitals, medical visas and recovery in India, from the Shifara Health team.',
    lead: 'Practical guides on treatments, costs, visas and recovery, written for international patients and their families.',
};
{
    const url = `${SITE}/blog/`;
    const extraHead = T.seoHead({
        url, title: BLOG.title, description: BLOG.desc, pageType: 'CollectionPage', crumbs: [['Home', '/'], ['Blog', '/blog/']],
        nodes: [{
            '@type': 'ItemList', '@id': url + '#posts', numberOfItems: POSTS.length,
            itemListElement: POSTS.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: `${url}${p.slug}/` })),
        }],
    });
    const main = `    <!-- ================= BLOG ================= -->
    <main>
        <section class="lp-hero lp-hero-page">
            <div class="container">
                <nav class="lp-crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span>Blog</span></nav>
                <h1>${esc(BLOG.h1)}</h1>
                <p>${esc(BLOG.lead)}</p>
            </div>
        </section>
        <section class="sec blog-sec">
            <div class="container">
                <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 g-lg-4">
${POSTS.map(postCard).join('\n')}
                </div>
            </div>
        </section>
    </main>
`;
    write('blog/index.html', layout({ title: BLOG.title, description: BLOG.desc, css: ['listing.css'], js: [], main, extraHead }));
}
for (const p of POSTS) {
    const url = `${SITE}/blog/${p.slug}/`;
    const related = (p.treatments || []).map(id => UI.treatBy[id]).filter(Boolean);
    const more = POSTS.filter(o => o.slug !== p.slug).slice(0, 3);
    const extraHead = T.seoHead({
        url, title: p.title, description: p.description, ogType: 'article', image: p.image, aboutId: url + '#article',
        crumbs: [['Home', '/'], ['Blog', '/blog/'], [p.title, `/blog/${p.slug}/`]],
        nodes: [{
            '@type': 'BlogPosting', '@id': url + '#article', headline: p.title, description: p.description, image: SITE + encodeURI(p.image), url,
            datePublished: p.date, dateModified: p.updated || p.date, inLanguage: 'en-IN',
            author: { '@id': SITE + '/#organization' }, publisher: { '@id': SITE + '/#organization' }, mainEntityOfPage: { '@id': url + '#webpage' },
        }],
    });
    const main = `    <!-- ================= BLOG POST: ${p.slug} ================= -->
    <main>
        <section class="lp-hero lp-hero-page">
            <div class="container">
                <nav class="lp-crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/blog/">Blog</a><span>/</span><span>${esc(p.category)}</span></nav>
                <h1>${esc(p.title)}</h1>
                <p>By the Shifara Health Editorial Team · ${postDate(p.date)}</p>
            </div>
        </section>
        <div class="container">
            <article class="legal">
                <img src="${esc(p.image)}" alt="${esc(p.imageAlt)}" class="img-fluid rounded-4 mb-4" fetchpriority="high">
${p.body.split('\n').map(l => l ? '                ' + l : l).join('\n')}${related.length ? `
                <h2>Related treatments in India</h2>
                <ul>
${related.map(t => `                    <li><a href="/treatment/${t.id}/">${esc(t.name)} in India</a></li>`).join('\n')}
                </ul>` : ''}${more.length ? `
                <h2>More guides for patients</h2>
                <ul>
${more.map(o => `                    <li><a href="/blog/${o.slug}/">${esc(o.title)}</a></li>`).join('\n')}
                </ul>` : ''}
                <p class="legal-note">This guide is general information, not medical advice, and costs are indicative. Please read our <a href="/medical-disclaimer/">medical disclaimer</a> and speak to your doctor about your own case.</p>
            </article>
        </div>
        <section class="pb-5">
            <div class="container">
                <div class="lp-cta d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div>
                        <h2>Talk to a Shifara case manager</h2>
                        <p>Share your reports and get a treatment plan and written cost estimate, free.</p>
                    </div>
                    <a href="/book-consultation/?for=${encodeURIComponent(p.title)}" class="btn btn-coral flex-none">Get free quote</a>
                </div>
            </div>
        </section>
    </main>
`;
    write(`blog/${p.slug}/index.html`, layout({ title: p.title, description: p.description, css: ['listing.css'], js: [], main, extraHead }));
}

// ---------- Detail pages ----------
const DETAILS = [['hospital', 'hospitals', D.hospitals], ['doctor', 'doctors', D.doctors], ['treatment', 'treatments', D.treatments]];
for (const [kind, dataKind, items] of DETAILS) {
    for (const item of items) {
        const page = T[kind](item, detailData(dataKind, item.id));
        const main = `    <!-- ================= ${kind.toUpperCase()}: ${item.id} ================= -->
    <main data-detail="${kind}">${page.main}
    </main>
`;
        write(`${kind}/${item.id}/index.html`, layout({
            title: page.title, description: page.description, css: ['listing.css', 'detail.css'],
            js: ['/assets/js/detail.js'], main, extraHead: page.head,
        }));
    }
}

// ---------- Homepage: the source file itself, kept with relative links ----------
{
    const raw = read('index.html');
    const fixed = relative(raw, 'index.html');
    if (fixed !== raw && !ONLY) { fs.writeFileSync(path.join(ROOT, 'index.html'), fixed); console.log('index.html: site-root links made relative'); }
    collectListings(raw, 'index.html');
}

// ---------- Filtered listing pages ----------
// Every linked filter URL gets its own listing page, so it opens on any static server
// without rewrite rules. Other combinations (picked in the filter bar, pages 2+) are rewritten to the
// listing page by .htaccess / server.js, or sent there by 404.html.
// A URL stays once it exists: a filter folder nothing links to any more is still rebuilt, never removed.
for (const type of Object.keys(LISTINGS)) {
    (function walk(dir) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!e.isDirectory()) continue;
            const sub = path.join(dir, e.name);
            walk(sub);
            if (fs.existsSync(path.join(sub, 'index.html'))) linkedListings.add('/' + path.relative(ROOT, sub).split(path.sep).join('/') + '/');
        }
    })(path.join(ROOT, type));
}
// a Set visits entries added while looping, so a page that links to a new filter URL still gets that folder built
for (const p of linkedListings) write(`${p.slice(1)}index.html`, listingPage(p.split('/')[1], p));
console.log(`filtered listing pages: ${linkedListings.size}`);

// ---------- 404 page ----------
// Served for any missing URL, so its links stay site-root ("/…"). A filter URL without its own folder
// (/hospitals/cardiology/page/2/) is sent on to the listing page, which reads ?path= and shows the clean URL.
write('404.html', layout({
    title: 'Page Not Found', description: 'The page you are looking for could not be found.', css: ['listing.css'], js: [],
    main: `    <!-- ================= PAGE: 404 ================= -->
    <script>
        (() => {
            const m = location.pathname.match(/^(.*?\\/)(hospitals|doctors|treatments)\\/(.+)$/);
            if (m) location.replace(m[1] + m[2] + '/?path=' + encodeURIComponent(m[3]) + location.search.replace('?', '&'));
        })();
    </script>
    <main>
        <section class="lp-hero lp-hero-page">
            <div class="container">
                <nav class="lp-crumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span>Page not found</span></nav>
                <h1>Page Not Found</h1>
                <p>The page you are looking for may have moved. Try one of these instead.</p>
                <div class="d-flex flex-wrap gap-2 mt-3">
                    <a href="/" class="btn btn-coral">Home</a>
                    <a href="/hospitals/" class="btn btn-ghost">Hospitals</a>
                    <a href="/doctors/" class="btn btn-ghost">Doctors</a>
                    <a href="/treatments/" class="btn btn-ghost">Treatments</a>
                    <a href="/book-consultation/" class="btn btn-ghost">Book consultation</a>
                </div>
            </div>
        </section>
    </main>
`,
}).replace('<head>', '<head>\n    <meta name="robots" content="noindex">'), { asIs: true });

// ---------- sitemap.xml + robots.txt (from the page folders now on disk) ----------
if (!ONLY) require('./sitemap.js');

console.log(`written: ${stats.written} | unchanged: ${stats.unchanged} | skipped (edited by hand): ${stats.skipped.length}`);
if (stats.skipped.length) {
    console.log(stats.skipped.slice(0, 20).map(s => '  - ' + s).join('\n') + (stats.skipped.length > 20 ? '\n  …' : ''));
    console.log('Run with --force to overwrite them.');
}
