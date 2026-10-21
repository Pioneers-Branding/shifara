// Shifara Health - static page generator.
//
//   node tools/build.js            build / update every page folder
//   node tools/build.js --force    also overwrite pages you edited by hand
//
// Output (one folder per URL, each with its own index.html you can edit directly):
//   hospitals/  doctors/  treatments/            listing pages (filters run in assets/js/listing.js)
//   hospital/<id>/  doctor/<id>/  treatment/<id>/ detail pages (full content in the HTML)
//   privacy-policy/  medical-disclaimer/           legal pages (content in tools/pages/<slug>.html)
//
// Inputs: ind.html (header + footer), assets/data/catalog.js, assets/data/details/<kind>/<id>.js
// Every generated page carries a "shifara:generated" marker with a hash of its content. If the file was
// changed by hand since the last build, the hash no longer matches and the page is skipped (unless --force).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FORCE = process.argv.includes('--force');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------- Data ----------
global.window = {};
require(path.join(ROOT, 'assets/data/catalog.js'));
require(path.join(ROOT, 'assets/js/cards.js'));
const UI = window.ShifaraUI;
const T = require('./detail-templates.js')(UI);
const { D, esc } = UI;

function detailData(kind, id) {
    const p = path.join(ROOT, 'assets/data/details', kind, id + '.js');
    if (!fs.existsSync(p)) return {};
    const s = fs.readFileSync(p, 'utf8');
    return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
}

// ---------- Layout from the homepage ----------
const home = read('ind.html').replace(/\r\n/g, '\n');
const HERO = '    <!-- ================= HERO ================= -->';
const FOOTER = '    <!-- ================= FOOTER ================= -->';
if (!home.includes(HERO) || !home.includes(FOOTER)) throw new Error('ind.html is missing the HERO / FOOTER markers');
// homepage section links (#quote, #cost…) must point back to the homepage from other pages
const siteAnchors = s => s.replace(/(<a\b[^>]*?\bhref=")#([a-z][\w-]*)"/g, '$1/#$2"');
const HEAD = siteAnchors(home.slice(0, home.indexOf(HERO)));
const FOOT = siteAnchors(home.slice(home.indexOf(FOOTER)));

function layout({ title, description, css, js, main }) {
    let head = HEAD
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)} | Shifara Health</title>`)
        .replace(/<meta name="description"\s+content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
        .replace(/(<link rel="stylesheet" href="\/assets\/css\/style.css">)/,
            '$1' + css.map(c => `\n    <link rel="stylesheet" href="/assets/css/${c}">`).join(''));
    const foot = FOOT.replace(/(    <script src="\/assets\/js\/main.js"><\/script>\n)/,
        '$1' + js.map(j => `    <script src="${j}"></script>\n`).join(''));
    if (!js.every(j => foot.includes(j)) || !css.every(c => head.includes(c))) {
        throw new Error('Could not add page CSS/JS: ind.html must keep the style.css <link> and main.js <script> tags');
    }
    return head + main + '\n' + foot;
}

// ---------- Writing with edit protection ----------
const MARK = /<!-- shifara:generated hash=([0-9a-f]{12}) -->\r?\n/;
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const stats = { written: 0, unchanged: 0, skipped: [] };

function write(rel, html) {
    // marker goes on its own line right after <!doctype html>; editors may switch the file to CRLF,
    // so the hash is taken over LF-normalised content
    const norm = s => s.replace(/\r\n/g, '\n');
    const body = norm(html).replace(/^(<!doctype html>)\n?/i, '$1\n');
    const withMark = h => body.replace(/^(<!doctype html>\n)/i, `$1<!-- shifara:generated hash=${h} -->\n`);
    const file = path.join(ROOT, rel);
    if (fs.existsSync(file)) {
        const old = norm(fs.readFileSync(file, 'utf8'));
        const m = old.match(MARK);
        const edited = !m || hash(old.replace(MARK, '')) !== m[1];
        if (edited && !FORCE) { stats.skipped.push(rel); return; }
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

for (const [page, c] of Object.entries(LISTINGS)) {
    const main = `    <!-- ================= LISTING (${page}) ================= -->
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
                        <a href="/#quote" class="btn btn-coral">Get free quote</a>
                        <a href="https://wa.me/919971316164" target="_blank" rel="noopener" class="btn btn-wa"><svg class="i">
                                <use href="#wa" />
                            </svg> WhatsApp</a>
                    </div>
                </div>
            </div>
        </section>
    </main>
`;
    write(`${page}/index.html`, layout({
        title: c.title, description: c.desc, css: ['listing.css'],
        js: ['/assets/data/catalog.js', '/assets/js/cards.js', '/assets/js/listing.js'], main,
    }));
}

// ---------- Legal pages (content in tools/pages/<slug>.html) ----------
const LEGAL = {
    'privacy-policy': {
        title: 'Privacy Policy',
        desc: 'How Shifara Health collects, uses, shares and protects your personal and health data under the Digital Personal Data Protection Act, 2023, and how to exercise your rights.',
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
    write(`${slug}/index.html`, layout({ title: c.title, description: c.desc, css: ['listing.css'], js: [], main }));
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
            js: ['/assets/js/detail.js'], main,
        }));
    }
}

console.log(`written: ${stats.written} | unchanged: ${stats.unchanged} | skipped (edited by hand): ${stats.skipped.length}`);
if (stats.skipped.length) {
    console.log(stats.skipped.slice(0, 20).map(s => '  - ' + s).join('\n') + (stats.skipped.length > 20 ? '\n  …' : ''));
    console.log('Run with --force to overwrite them.');
}
