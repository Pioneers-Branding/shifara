// Shifara Health - HTML templates for the generated detail pages (used by tools/build.js only).
// Each function returns { title, description, main } for one hospital, doctor or treatment, plus { head } (canonical,
// social and schema.org tags, with absolute URLs on SITE) where the page has one.
module.exports = function templates(UI, SITE, detailData, POSTS) {
    const { D, HOME, esc, svg, deptName, cityName, deptBy, hospBy, treatBy, link, listUrl, wa, startingPrice, initials, logo,
        hospitalCard, doctorCard, treatmentCard, hospitalLabel, searchTerm, searchDoctors, listingTitle } = UI;

    // ---------- Shared pieces ----------
    const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const top = (list, n, sort) => [...list].sort(sort).slice(0, n);
    const byDoctors = (a, b) => b.doctors - a.doctors;
    const byExperience = (a, b) => (b.experience || 0) - (a.experience || 0);
    // first candidate that fits, else the last one cut at a word
    const fit = (max, ...options) => options.find(o => o.length <= max) ||
        options.at(-1).slice(0, max - 1).replace(/[\s,;:–-]+\S*$/, '') + '…';
    const strip = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    // JSON-LD inside <script>: "</" must not close the tag
    const jsonLd = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

    const ORG = { '@type': 'Organization', '@id': SITE + '/#organization', name: 'Shifara Health', url: SITE + '/', logo: SITE + '/assets/images/logo/shifara-logo.png', telephone: '+91-99713-16164', email: 'mail@shifarahealth.com',
        sameAs: ['https://www.facebook.com/people/Shifara-Health/61591410937126/', 'https://www.instagram.com/shifarahealth_/', 'https://www.linkedin.com/company/shifarahealth/', 'https://www.youtube.com/channel/UCIlfjKs6gzZnWdWGmFoh66A', 'https://x.com/shifarahealth'] };
    // Author, robots, canonical, social and schema.org tags for one page.
    // url and canonical are absolute; crumbs are [name, site-root path]; nodes go in the schema.org graph after the Organization.
    function seoHead({ url, canonical = url, title, description, ogType = 'website', pageType = 'WebPage', image, aboutId, crumbs, nodes = [], faqs = [] }) {
        return `    <meta name="author" content="Shifara Health">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="${ogType}">
    <meta property="og:site_name" content="Shifara Health">
    <meta property="og:locale" content="en_IN">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${esc(SITE + encodeURI(image || '/assets/images/logo/shifara-logo.png'))}">
    <meta name="twitter:card" content="summary">
    ${jsonLd({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': pageType, '@id': url + '#webpage', url, name: title, description, inLanguage: 'en-IN',
                ...(aboutId ? { about: { '@id': aboutId } } : {}), breadcrumb: { '@id': url + '#breadcrumb' },
                ...(image ? { primaryImageOfPage: SITE + encodeURI(image) } : {}),
                author: { '@id': ORG['@id'] }, publisher: { '@id': ORG['@id'] },
            },
            ORG,
            ...nodes,
            {
                '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
                itemListElement: crumbs.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + p })),
            },
            ...(faqs.length ? [{
                '@type': 'FAQPage',
                mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a) } })),
            }] : []),
        ],
    })}
`;
    }

    // "a, b and c"
    const andList = list => list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
    const hospitalLink = h => `<a href="${link.hospital(h.id)}">${esc(hospitalLabel(h))}</a>`;
    const doctorLink = d => `<a href="${link.doctor(d.id)}">${esc(d.name)}</a>`;
    const hasPrice = t => !!startingPrice(t.cost);
    const treatmentLink = t => `<a href="${link.treatment(t.id)}">${esc(t.name)}</a>`;
    const VISA_ANSWER = `Most international patients travel on India's e-Medical Visa. Once the hospital confirms your treatment plan, we arrange the invitation letter and guide you through the application, free. Read our <a href="/travel-visa/">medical visa guide</a>.`;

    function faqBlock(faqs) {
        return faqs.map(([q, a]) => `
                        <details class="dt-faq">
                            <summary>${esc(q)}</summary>
                            <p>${a}</p>
                        </details>`).join('');
    }

    function stepsBlock(steps) {
        return `
                        <div class="dt-steps">${steps.map(([t, p], i) => `
                            <div class="dt-step"><span>${String(i + 1).padStart(2, '0')}</span>
                                <div><b>${esc(t)}</b><p>${esc(p)}</p></div></div>`).join('')}
                        </div>`;
    }

    function costTable(treatments) {
        return `
                        <div class="dt-cost">
                            <table>
                                <thead><tr><th>Treatment</th><th>Indicative cost (USD)</th></tr></thead>
                                <tbody>${treatments.map(t => `
                                    <tr><td>${treatmentLink(t)}</td><td>${hasPrice(t) ? esc(t.cost) : 'On request'}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>`;
    }

    function crumb(items) {
        return `<nav class="lp-crumb dt-crumb" aria-label="Breadcrumb"><a href="${HOME}">Home</a>` +
            items.map(([label, href]) => `<span>/</span>${href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`}`).join('') +
            '</nav>';
    }

    // ---------- In-text links ----------
    // The first mention of a treatment, specialist or service in a page's own text links to that page, with those words as the anchor.
    const tr = link.treatment, hub = (type, department) => listUrl(type, { department });
    const TEXT_LINKS = [
        ['total knee replacement( surgery)?|knee replacement( surgery)?', tr('total-knee-replacement')], ['hip replacement( surgery)?', tr('hip-replacement')],
        ['coronary artery bypass( surgery| grafting)?|heart bypass( surgery)?|bypass surgery|CABG', tr('coronary-artery-bypass-cabg')],
        ['heart valve replacement|valve replacement', tr('heart-valve-replacement-avr-mvr')], ['heart transplant(ation)?', tr('heart-transplant')],
        ['kidney transplant(ation)?|renal transplant(ation)?', tr('kidney-transplant')], ['liver transplant(ation)?', tr('liver-transplant')],
        ['bone marrow transplant(ation)?', tr('adult-bone-marrow-transplant')], ['angioplasty', tr('angioplasty-stent')], ['pacemakers?', tr('pacemaker-surgery')],
        ['TAVI( procedure)?', tr('tavi-procedure')], ['TAVR( procedure)?', tr('tavr-procedure-2')], ['IVF|in vitro fertili[sz]ation', tr('in-vitro-fertilisation')],
        ['laparoscopic hysterectomy', tr('laparoscopic-hysterectomy')], ['hysterectomy', tr('hysterectomy')], ['myomectomy', tr('myomectomy')],
        ['scoliosis( surgery)?', tr('scoliosis-surgery')], ['spinal fusion', tr('decompression-fusion')], ['micro-?discectomy', tr('lumbar-microdiscectomy')],
        ['hair transplant(ation)?', tr('hair-transplant')], ['liposuction', tr('liposuction')], ['tummy tuck', tr('tummy-tuck')], ['abdominoplasty', tr('abdominoplasty')],
        ['deep brain stimulation', tr('deep-brain-stimulation-dbs')], ['gamma knife( radiosurgery)?', tr('gamma-knife-radiosurgery')], ['cyber ?knife', tr('cyberknife-surgery')],
        ['epilepsy surgery', tr('epilepsy-surgery')], ['PCNL', tr('pcnl-procedure')], ['RIRS', tr('rirs-stenting')], ['TURP', tr('turp')], ['urethroplasty', tr('urethroplasty')],
        ['CAR-T( cell therapy)?', tr('car-t-cell-therapy')], ['proton therapy', tr('proton-therapy')], ['HIPEC', tr('hipec')],
        ['orthopa?edic surgeons?', hub('doctors', 'orthopedics')], ['neurosurgeons?|neurologists?', hub('doctors', 'neurology')],
        ['cardiac surgeons?|heart surgeons?|cardiologists?', hub('doctors', 'cardiology')], ['oncologists?', hub('doctors', 'oncology')], ['urologists?', hub('doctors', 'urology')],
        ['gynaecologists?', hub('doctors', 'gynecology')], ['nephrologists?', hub('doctors', 'nephrology')], ['gastroenterologists?', hub('doctors', 'gastroenterology')],
        ['spine surgeons?', hub('doctors', 'spine-surgery')], ['plastic surgeons?', hub('doctors', 'cosmetic')],
        ['cardiac cent(re|er)s?', hub('hospitals', 'cardiology')], ['orthopa?edic cent(re|er)s?', hub('hospitals', 'orthopedics')], ['cancer (care|cent(re|er)s?|hospitals?)', hub('hospitals', 'oncology')],
        ['e-medical visa|medical visa', '/travel-visa/'], ['air ambulance', '/services/air-ambulance/'], ['video consultations?', '/services/video-consultation/'],
        ['step-down care', '/services/step-down-care/'], ['medical tourism', '/services/medical-tourism/'],
    ].map(([words, href]) => ({ whole: new RegExp('^(?:' + words + ')$', 'i'), words, href }));
    const TEXT_LINK_WORDS = new RegExp('(?<![A-Za-z0-9_-])(?:' + TEXT_LINKS.map(o => o.words).sort((a, b) => b.length - a.length).join('|') + ')(?![A-Za-z0-9_-])', 'gi');
    let inText = s => s;
    // call at the start of a page: up to 5 links, one per target, none to the page itself
    function startTextLinks(self) {
        const used = new Set([self]);
        inText = s => s.replace(TEXT_LINK_WORDS, m => {
            const target = TEXT_LINKS.find(o => o.whole.test(m));
            if (!target || used.has(target.href) || used.size > 5) return m;
            used.add(target.href);
            return `<a href="${target.href}">${m}</a>`;
        });
    }

    function blocksHtml(blocks) {
        let out = '', list = [];
        const flush = () => {
            if (list.length) out += `\n                        <ul class="dt-list">\n${list.join('\n')}\n                        </ul>`;
            list = [];
        };
        for (const b of blocks) {
            if (b.t === 'li') {
                list.push(`                            <li>${svg('check')}<span>${b.lead ? `<b>${esc(b.lead)}</b> ` : ''}${inText(esc(b.text))}</span></li>`);
            } else {
                flush();
                out += b.t === 'h' ? `\n                        <h3 class="dt-h3">${esc(b.text)}</h3>` : `\n                        <p>${inText(esc(b.text))}</p>`;
            }
        }
        flush();
        return out;
    }

    // Lists whose items all have a bold lead read better as cards
    function leadCards(blocks) {
        const lis = blocks.filter(b => b.t === 'li' && b.lead);
        if (lis.length < 2 || lis.length !== blocks.filter(b => b.t === 'li').length) return null;
        return blocksHtml(blocks.filter(b => b.t !== 'li')) + `
                        <div class="row row-cols-1 row-cols-md-2 g-3">${lis.map(b => `
                            <div class="col"><div class="dt-card"><span class="dt-card-ic">${svg('check')}</span>
                                <div><b>${esc(b.lead)}</b><p>${inText(esc(b.text))}</p></div></div></div>`).join('')}
                        </div>`;
    }

    function section(title, inner, extraClass = '') {
        return `
                    <section class="dt-sec ${extraClass}" id="sec-${slug(title)}">
                        <h2>${esc(title)}</h2>${inner}
                    </section>`;
    }

    function tabSections(tabs, special = {}) {
        return tabs.map(t => section(t.title, (special[t.title] || leadCards)(t.blocks) || blocksHtml(t.blocks))).join('');
    }

    // titles: section titles, or [short label, section title] pairs
    function subnav(titles) {
        if (!titles.length) return '';
        return `
        <nav class="dt-subnav" aria-label="On this page">
            <div class="dt-subnav-inner">${titles.map(t => Array.isArray(t) ? t : [t, t]).map(([label, t]) => `
                <a href="#sec-${slug(t)}">${esc(label)}</a>`).join('')}
            </div>
        </nav>`;
    }

    // DPDP Act: explicit, unticked consent naming the purpose and who the data is shared with
    function consent(id) {
        return `
                                <div class="form-check consent-check">
                                    <input class="form-check-input" type="checkbox" name="consent" value="Yes" id="${id}Consent" required>
                                    <label class="form-check-label" for="${id}Consent">I consent to Shifara Health using my details and health information to prepare a treatment plan, share it with the hospitals and doctors I choose, and contact me. If the patient is under 18, I am their parent or guardian. <a href="/privacy-policy/" target="_blank">Privacy Policy</a></label>
                                </div>`;
    }

    // every quote / consultation button opens the booking page, telling it what the enquiry is about
    // patient's country (same list as the Book consultation form); main.js fills the phone code from it
    const COUNTRIES = ['Bangladesh', 'Iraq', 'Iran', 'Saudi Arabia', 'Yemen', 'Oman', 'Nigeria', 'Kenya', 'Ethiopia', 'Tanzania', 'Uganda',
        'Ghana', 'Sudan', 'South Sudan', 'Somalia', 'Rwanda', 'Zambia', 'Zimbabwe', 'Cameroon', 'DR Congo', 'Mozambique', 'Malawi', 'Egypt', 'Other'];
    const countrySelect = () => `<select class="form-select" name="country" required aria-label="Country"><option value="">Your country</option>${COUNTRIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select>`;
    const bookUrl = subject => '/book-consultation/' + (subject ? '?for=' + encodeURIComponent(subject) : '');

    function quoteBox(subject, id = 'dtQuote', shown = subject) {
        return `
                    <div class="dt-quote" id="${id}">
                        <form class="dt-quote-form" data-form="Quote box" accept-charset="UTF-8" action="https://app.formester.com/forms/HmhWy3jl2/submissions" method="POST">
                            <input type="hidden" name="subject" value="${esc(subject)}">
                            <span class="dt-quote-kicker">100% free · reply within 24 hrs</span>
                            <h3>Get a free quote</h3>
                            <p class="dt-quote-sub">for ${esc(shown)}</p>
                            <div class="d-grid gap-2">
                                <input class="form-control" name="name" required placeholder="Full name" aria-label="Full name">
                                ${countrySelect()}
                                <input class="form-control" name="phone" type="tel" required placeholder="WhatsApp / phone with country code" aria-label="Phone">
                                <input class="form-control" name="email" type="email" required placeholder="Email address" aria-label="Email">
                                <textarea class="form-control" name="message" rows="2" placeholder="Briefly describe the condition (optional)" aria-label="Message"></textarea>${consent(id)}
                                <button class="btn btn-coral w-100" type="submit">Request free quote ${svg('arrow', 'i')}</button>
                            </div>
                            <p class="dt-quote-note">${svg('shield')}Your reports are shared only with hospitals you approve.</p>
                        </form>
                    </div>`;
    }

    function related(title, cards, allHref, allLabel, cols = 'row-cols-1 row-cols-md-2 row-cols-xl-3') {
        if (!cards.length) return '';
        return `
            <section class="dt-related">
                <div class="dt-related-head">
                    <h2>${esc(title)}</h2>${allHref ? `
                    <a href="${allHref}" class="link-arrow">${esc(allLabel)} ${svg('arrow', 'i')}</a>` : ''}
                </div>
                <div class="row ${cols} g-3 g-lg-4">
                    ${cards.join('\n                    ')}
                </div>
            </section>`;
    }

    function ctaBand(title, text, subject) {
        return `
            <section class="dt-cta">
                <div class="lp-cta d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                    <div>
                        <h2>${esc(title)}</h2>
                        <p>${esc(text)}</p>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <a href="${esc(bookUrl(subject))}" class="btn btn-coral">Get free quote</a>
                        <a href="${wa('Hi Shifara, I need help planning treatment in India')}" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} WhatsApp</a>
                    </div>
                </div>
            </section>`;
    }

    // ---------- Hospital ----------
    // section headings that carry the hospital's name, with the short label used in the "On this page" bar
    const HOSPITAL_TABS = {
        'About the Hospital': [n => `About ${n}`, 'About'],
        'Key Highlights': [() => 'Key Highlights', 'Highlights'],
        Specialities: [n => `Specialities at ${n}`, 'Specialities'],
        'International Patient Services': [() => 'International Patient Services', 'International patients'],
    };

    function hospital(h, x) {
        startTextLinks(link.hospital(h.id));
        // the hospital's name stays as it is; branches that share a name also carry their city or area
        const label = hospitalLabel(h);
        const nameIn = `${label}, India`;
        const tabs = (x.tabs || []).map(t => {
            const [heading, nav] = HOSPITAL_TABS[t.title] || [() => t.title, t.title];
            return { ...t, title: heading(label), nav };
        });
        const docs = D.doctors.filter(d => d.hospitalId === h.id).sort(byExperience);
        const docDepts = [...new Set(docs.flatMap(d => d.departments))];
        const hasSpecialities = (x.tabs || []).some(t => t.title === 'Specialities');
        const specialitiesTitle = `Specialities at ${label}`;
        const doctorsTitle = `Doctors at ${label}`;
        const doctorsAnchor = `#sec-${slug(doctorsTitle)}`;
        const special = {
            [specialitiesTitle]: blocks => {
                const heads = blocks.filter(b => b.t === 'h');
                return heads.length ? `
                        <div class="dt-spec-grid">${heads.map(b => `
                            <div class="dt-spec">${svg('heart')}<span>${esc(b.text)}</span></div>`).join('')}
                        </div>` + blocksHtml(blocks.filter(b => b.t !== 'h')) : null;
            },
        };
        const chip = (dept, text, n) =>
            `<button type="button"${dept ? '' : ' class="on"'} data-d="${dept}" data-count="${n}" data-href="${listUrl('doctors', { hospital: h.id, department: dept })}">${esc(text)} (${n})</button>`;
        // every doctor is in the HTML; the department chips only show / hide them (assets/js/detail.js)
        const docCards = docs.map((d, i) => doctorCard(d).replace('<div class="col">',
            `<div class="col${i >= 6 ? ' d-none' : ''}" data-depts="${d.departments.join(' ')}">`));

        const intro = `
                <div class="dt-head">
                    <div class="dt-logo">${logo(h)}</div>
                    <div class="min-w-0">
                        <h1>${esc(nameIn)}</h1>
                        <p class="dt-loc">${svg('pin')}${esc(h.address || cityName(h.city))}</p>
                        <div class="dt-facts">
                            ${x.established ? `<span>${svg('clock')}Established ${esc(x.established)}</span>` : ''}
                            ${x.image ? '' : `<span>${svg('shield')}Accredited partner</span>`}
                            ${docs.length ? `<a href="${doctorsAnchor}">${svg('user')}${docs.length} doctors</a>` : ''}
                            <span>${svg('heart')}${h.departments.length} specialities</span>
                        </div>
                    </div>
                </div>
                <div class="dt-actions">
                    <a href="${esc(bookUrl(h.name))}" class="btn btn-coral">Get free quote ${svg('arrow', 'i')}</a>
                    <a href="${wa(`Hi Shifara, I want to know more about ${h.name}, ${cityName(h.city)}`)}" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} Message us</a>
                    ${docs.length ? `<a href="${doctorsAnchor}" class="btn btn-ghost">View doctors</a>` : ''}
                </div>`;

        // treatments of the departments where this hospital has doctors come first
        const deptOrder = [...docDepts.filter(s => h.departments.includes(s)), ...h.departments.filter(s => !docDepts.includes(s))];
        const treatments = deptOrder.flatMap(s => D.treatments.filter(t => t.department === s && hasPrice(t)).slice(0, 2)).slice(0, 10);
        const steps = [
            ['Share your reports', 'Send your reports and scans on WhatsApp or through the form on this page. A Shifara case manager replies within 24 hours.'],
            ['Get a treatment plan and cost estimate', 'We share your case with the hospital and send you the treatment plan with a written cost estimate, free.'],
            ['Medical visa and travel', 'We arrange the hospital invitation letter for your e-Medical Visa and guide you through the application, free. Your case manager stays with you from the airport to the day you fly home.'],
            ['Treatment and follow-up', 'After treatment we schedule your follow-up consultations, including after you return home.'],
        ];
        const shownDepts = h.departments.slice(0, 8).map(s => `<a href="${listUrl('hospitals', { department: s })}">${esc(deptName(s))}</a>`);
        const faqs = [
            [`Where is ${label} in India?`, `${esc(h.name)} is at ${esc(h.address || cityName(h.city))}, India.`],
            ...(docs.length ? [['How many doctors are listed at this hospital?', `Shifara Health lists ${docs.length} ${docs.length === 1 ? 'doctor' : 'doctors'} at this hospital, including ${andList(docs.slice(0, 3).map(doctorLink))}. <a href="${listUrl('doctors', { hospital: h.id })}">See the ${esc(label)} doctors list</a>.`]] : []),
            ['Which specialities does this hospital offer?', `${andList(shownDepts)}${h.departments.length > shownDepts.length ? ', among others' : ''}.`],
            ['How can international patients get a cost estimate?', 'Send your medical reports to Shifara Health on WhatsApp or through the form on this page. A case manager replies within 24 hours and shares a written cost estimate from the hospital. Our help is free for patients.'],
            ['Do I need a medical visa for treatment in India?', VISA_ANSWER],
        ];
        // [section title, html, short label for the "On this page" bar]
        const extra = [
            ...(treatments.length ? [[`Treatments at ${label} in India`, `
                        <p>Treatments in the departments at ${esc(h.name)}. Costs are indicative package prices in India at Shifara partner hospitals; your written estimate depends on your reports.</p>${costTable(treatments)}`, 'Treatments']] : []),
            [`Get Treated at ${label} from Abroad`, `
                        <p>How Shifara Health helps international patients get treated at ${esc(h.name)} in India.</p>${stepsBlock(steps)}`, 'From abroad'],
            ['Frequently Asked Questions', faqBlock(faqs), 'FAQs'],
        ];
        const navTitles = [...tabs.map(t => [t.nav, t.title]), ...(docs.length ? [['Doctors', doctorsTitle]] : []), ...extra.map(([t, , nav]) => [nav, t])];

        const main = `
        <section class="dt-hero">
            <div class="container">
                ${crumb([['Hospitals', listUrl('hospitals')], [cityName(h.city), listUrl('hospitals', { city: h.city })], [h.name]])}${x.image ? `
                <div class="row g-4 g-xl-5 align-items-center">
                    <div class="col-lg-7">${intro}
                    </div>
                    <div class="col-lg-5 order-first order-lg-last">
                        <figure class="dt-hosp-media">
                            <div class="dt-hero-img dt-hosp-img"><img src="${esc(x.image)}" alt="${esc(h.name)}, ${esc(cityName(h.city))}" fetchpriority="high"></div>
                        </figure>
                    </div>
                </div>` : intro}
            </div>
        </section>
        ${subnav(navTitles)}
        <div class="container dt-body">
            <div class="row g-4 g-xl-5">
                <div class="col-lg-8">
                    ${tabSections(tabs, special)}
                    ${!hasSpecialities ? section(specialitiesTitle, `
                        <div class="lc-tags dt-tags">${h.departments.map(s => `<a href="${docDepts.includes(s) ? listUrl('doctors', { hospital: h.id, department: s }) : listUrl('hospitals', { department: s })}">${esc(deptName(s))}</a>`).join('')}</div>`) : ''}
                    ${docs.length ? section(doctorsTitle, `
                        <div class="dt-chips" id="dtDocChips">
                            ${chip('', 'All', docs.length)}
                            ${docDepts.map(s => chip(s, deptBy[s]?.noun || deptName(s), docs.filter(d => d.departments.includes(s)).length)).join('\n                            ')}
                        </div>
                        <div class="row row-cols-1 row-cols-md-2 g-3" id="dtDocGrid">
                            ${docCards.join('\n                            ')}
                        </div>
${docDepts.some(s => docs.filter(d => d.departments.includes(s)).length > 1) ? `
                        <p class="mt-4 mb-0">Browse ${esc(label)} doctors by speciality: ${docDepts.filter(s => docs.filter(d => d.departments.includes(s)).length > 1).map(s => `<a href="${listUrl('doctors', { hospital: h.id, department: s })}">${esc(searchDoctors(s))}</a>`).join(', ')}.</p>` : ''}
                        <div class="text-center mt-4"><a id="dtDocAll" class="btn btn-ghost${docs.length <= 6 ? ' d-none' : ''}" href="${listUrl('doctors', { hospital: h.id })}"><span>View all ${docs.length} doctors</span> ${svg('arrow', 'i')}</a></div>`) : ''}${extra.map(([t, inner]) => section(t, inner)).join('')}
                </div>
                <div class="col-lg-4">
                    <aside class="dt-side">${quoteBox(h.name)}
                    </aside>
                </div>
            </div>
            ${related(`Other hospitals in ${cityName(h.city)}`, top(D.hospitals.filter(o => o.city === h.city && o.id !== h.id), 3, byDoctors).map(hospitalCard), listUrl('hospitals', { city: h.city }), `All hospitals in ${cityName(h.city)}`)}
            ${ctaBand('Not sure this is the right hospital?', 'Send your reports and we will compare up to 3 hospitals with written estimates, free.', h.name)}
        </div>`;
        const title = fit(53, `${nameIn}: Doctors, Specialities & Cost`, `${nameIn}: Doctors & Cost`, nameIn, label);
        const staff = docs.length ? `${docs.length} ${docs.length === 1 ? 'doctor' : 'doctors'} and ` : '';
        const specialities = `${staff}${h.departments.length} ${h.departments.length === 1 ? 'speciality' : 'specialities'}`;
        const description = fit(158,
            `${nameIn}: ${specialities} for international patients. See treatments and doctors, and get a free written cost estimate from Shifara Health.`,
            `${nameIn}: ${specialities} for international patients. See doctors and treatments, and get a free cost estimate.`,
            `${nameIn}: ${specialities} for international patients. Get a free written cost estimate.`,
            `${nameIn}: ${specialities}. Get a free cost estimate.`);
        const url = `${SITE}/hospital/${h.id}/`;
        const head = seoHead({
            url, title, description, ogType: 'business.business', image: x.image || h.logo, aboutId: url + '#hospital', faqs,
            crumbs: [['Home', '/'], ['Hospitals', listUrl('hospitals')], [cityName(h.city), listUrl('hospitals', { city: h.city })], [h.name, `/hospital/${h.id}/`]],
            nodes: [{
                '@type': 'Hospital', '@id': url + '#hospital', name: h.name, url, description,
                ...(x.image || h.logo ? { image: SITE + encodeURI(x.image || h.logo) } : {}),
                ...(x.established ? { foundingDate: String(x.established) } : {}),
                medicalSpecialty: [...new Set(h.departments.map(s => SPECIALTY[s]).filter(Boolean))].map(s => 'https://schema.org/' + s),
                address: { '@type': 'PostalAddress', streetAddress: h.address || cityName(h.city), addressLocality: cityName(h.city), addressCountry: 'IN' },
            }],
        });
        return { title, description, main, head };
    }

    // ---------- Doctor ----------
    // The role in the title, H1 area and schema ("Liver Transplant Surgeon") is read from the designation: the
    // department is often only "General Surgery" for transplant, cardiac and cancer surgeons. First match wins,
    // so narrower roles come before the broad ones they contain.
    const ROLES = [
        [/paediatric|pediatric/i, [
            [/cardiac surg|cardio.?thoracic|heart surg/i, 'Paediatric Cardiac Surgeon'],
            [/cardiolog/i, 'Paediatric Cardiologist'],
            [/gastro|hepatolog/i, 'Paediatric Gastroenterologist'],
            [/neurosurg/i, 'Paediatric Neurosurgeon'],
            [/neurolog/i, 'Paediatric Neurologist'],
            [/orthop/i, 'Paediatric Orthopaedic Surgeon'],
            [/haemato|hemato|bone marrow|bmt/i, 'Paediatric Haematologist'],
            [/oncolog/i, 'Paediatric Oncologist'],
            [/nephrolog/i, 'Paediatric Nephrologist'],
            [/\burolog/i, 'Paediatric Urologist'],
            [/surg/i, 'Paediatric Surgeon'],
        ]],
        [/radiation oncolog|radiotherap/i, 'Radiation Oncologist'],
        [/medical oncolog/i, 'Medical Oncologist'],
        [/gyn(a)?ec(o)?log(ic|ical)? oncolog|gynae?.?onco/i, 'Gynaecologic Oncologist'],
        [/haemato.?oncolog|hemato.?oncolog/i, 'Haemato-Oncologist'],
        [/bone marrow|bmt/i, 'Bone Marrow Transplant Specialist'],
        [/head (&|and) neck/i, [
            [/onco|cancer/i, 'Head & Neck Cancer Surgeon'],
            [/./, 'ENT Surgeon'],
        ]],
        [/surgical oncolog|onco.?surg|cancer surg/i, 'Surgical Oncologist'],
        [/orthop(a)?edic onco|musculoskeletal onco|bone (and|&) soft tissue/i, 'Orthopaedic Oncologist'],
        [/cardiac surg|cardio.?thoracic|ctvs|heart surg/i, 'Cardiac Surgeon'],
        [/electrophysiolog/i, 'Cardiac Electrophysiologist'],
        [/interventional cardiolog/i, 'Interventional Cardiologist'],
        [/cardiolog/i, 'Cardiologist'],
        [/neurosurg|neuro surg|neuro-surg/i, 'Neurosurgeon'],
        [/neuro.?interven/i, 'Interventional Neuroradiologist'],
        [/neurolog/i, 'Neurologist'],
        [/spine/i, 'Spine Surgeon'],
        [/joint replacement|arthroplasty/i, 'Joint Replacement Surgeon'],
        [/sports (medicine|injur)|arthroscop/i, 'Orthopaedic & Sports Injury Surgeon'],
        [/orthop/i, 'Orthopaedic Surgeon'],
        [/gastroenterolog/i, 'Gastroenterologist'],
        [/hepatolog/i, 'Hepatologist'],
        [/liver transplant/i, 'Liver Transplant Surgeon'],
        [/bariatric|metabolic surg/i, 'Bariatric Surgeon'],
        [/gi surg|gastro.?intestinal surg|hpb|hepato.?pancreat|colorectal/i, 'GI Surgeon'],
        [/plastic|aesthetic|cosmetic/i, 'Plastic Surgeon'],
        [/\burolog|androlog/i, 'Urologist'],
        [/nephrolog/i, 'Nephrologist'],
        [/ivf|reproductive|infertility|fertility/i, 'IVF Specialist'],
        [/obstetric|gyn(a)?ec/i, 'Gynaecologist'],
        [/thoracic (organ|surg)|lung transplant/i, 'Thoracic & Lung Transplant Surgeon'],
        [/pulmonolog|chest|respiratory|lung/i, 'Pulmonologist'],
        [/\bent\b|otorhino|otolaryng/i, 'ENT Surgeon'],
        [/ophthalm|retina|cornea|cataract|\beye\b/i, 'Ophthalmologist'],
        [/endocrin|diabet/i, 'Endocrinologist'],
        [/rheumat/i, 'Rheumatologist'],
        [/dermat|skin/i, 'Dermatologist'],
        [/psychiat/i, 'Psychiatrist'],
        [/haematolog|hematolog/i, 'Haematologist'],
        [/interventional radiolog/i, 'Interventional Radiologist'],
        [/vascular/i, 'Vascular Surgeon'],
        [/nuclear medicine/i, 'Nuclear Medicine Specialist'],
        [/anaesthe|anesthe/i, 'Anaesthesiologist'],
        [/patholog/i, 'Pathologist'],
        [/maxillofacial/i, 'Maxillofacial Surgeon'],
        [/dental|dentist|orthodont|endodont|prosthodont/i, 'Dental Surgeon'],
        [/palliative/i, 'Palliative Care Specialist'],
        [/laparoscop|minimal access/i, 'Laparoscopic Surgeon'],
        [/oncolog/i, 'Oncologist'],
        [/infectious/i, 'Infectious Disease Specialist'],
        [/physiotherap/i, 'Physiotherapist'],
        [/internal medicine|general medicine|physician/i, 'Internal Medicine Physician'],
        [/general surg/i, 'General Surgeon'],
    ];
    const DEPT_ROLE = {
        'general-surgery': 'General Surgeon', oncology: 'Oncologist', cardiology: 'Cardiologist', orthopedics: 'Orthopaedic Surgeon',
        neurology: 'Neurologist', gynecology: 'Gynaecologist', urology: 'Urologist', gastroenterology: 'Gastroenterologist',
        cosmetic: 'Plastic Surgeon', pediatrics: 'Paediatrician', nephrology: 'Nephrologist', ent: 'ENT Surgeon',
        hematology: 'Haematologist', 'internal-medicine': 'Internal Medicine Physician', pulmonology: 'Pulmonologist',
        'spine-surgery': 'Spine Surgeon', ophthalmology: 'Ophthalmologist', vascular: 'Vascular Surgeon',
        endocrinology: 'Endocrinologist', bariatric: 'Bariatric Surgeon', dental: 'Dental Surgeon', ivf: 'IVF Specialist',
        transplant: 'Transplant Surgeon', dermatology: 'Dermatologist', rheumatology: 'Rheumatologist',
        'nuclear-medicine': 'Nuclear Medicine Specialist', psychiatry: 'Psychiatrist', anesthesiology: 'Anaesthesiologist',
        pathology: 'Pathologist', 'palliative-care': 'Palliative Care Specialist',
    };
    // "Senior Consultant – Oncology" says less than the MD (Radiation Oncology) before it
    const GENERIC_ROLES = new Set(['Oncologist', 'General Surgeon', 'Internal Medicine Physician']);
    // where the position starts in "MBBS, MS (General Surgery), MCh (Urology) Head – Department of Urology"
    const POSITION = /\b(Senior|Sr\.?|Associate|Principal|Consultant|Director|Head|HOD|Chief|Chairman|Chairperson|Vice|Additional|Attending|Lead|Unit|Executive|Clinical|Program|Programme|Founder|Co-?founder|Professor|Group|Visiting|Specialist|Registrar|Junior|Medical|Managing|Dean|President|Mentor)\b/;
    // the treatment department a role belongs to, for the cost table and schema specialty
    // (\b keeps "Neurologist" out of urology)
    const ROLE_DEPT = [
        [/\burolog/i, 'urology'], [/onco|cancer/i, 'oncology'], [/nephrolog/i, 'nephrology'], [/spine/i, 'spine-surgery'],
        [/neuro/i, 'neurology'], [/orthop|joint|sports/i, 'orthopedics'], [/cardi|electrophys|thoracic/i, 'cardiology'],
        [/gastro|hepatolog|gi surgeon/i, 'gastroenterology'], [/liver transplant/i, 'transplant'], [/ivf/i, 'ivf'],
        [/bariatric/i, 'bariatric'], [/ent surgeon/i, 'ent'], [/plastic|maxillofacial/i, 'cosmetic'], [/gynae/i, 'gynecology'],
        [/pulmonolog/i, 'pulmonology'], [/haemato|bone marrow/i, 'hematology'], [/endocrin/i, 'endocrinology'],
        [/ophthalm/i, 'ophthalmology'], [/vascular|interventional radiolog/i, 'vascular'],
    ];
    const SPECIALTY = {
        cardiology: 'Cardiovascular', oncology: 'Oncologic', neurology: 'Neurologic', orthopedics: 'Musculoskeletal',
        'spine-surgery': 'Musculoskeletal', gynecology: 'Gynecologic', ivf: 'Gynecologic', urology: 'Urologic',
        gastroenterology: 'Gastroenterologic', cosmetic: 'PlasticSurgery', pediatrics: 'Pediatric', nephrology: 'Renal',
        ent: 'Otolaryngologic', hematology: 'Hematologic', pulmonology: 'Pulmonary', endocrinology: 'Endocrine',
        dental: 'Dentistry', dermatology: 'Dermatology', rheumatology: 'Rheumatologic', psychiatry: 'Psychiatric',
        anesthesiology: 'Anesthesia', pathology: 'Pathology', 'general-surgery': 'Surgical', bariatric: 'Surgical',
        vascular: 'Surgical', transplant: 'Surgical', 'internal-medicine': 'PrimaryCare',
    };

    function matchRole(text, rules = ROLES) {
        for (const [re, role] of rules) {
            if (!re.test(text)) continue;
            const r = Array.isArray(role) ? matchRole(text, role) : role;
            if (r) return r;
        }
        return '';
    }
    function designationParts(s) {
        const at = s.search(POSITION);
        return { degrees: at > 0 ? s.slice(0, at).trim().replace(/,$/, '') : '', position: at >= 0 ? s.slice(at).trim() : s };
    }
    // the degrees often include MS (General Surgery) for every surgeon, so the position is read first
    function doctorRole(d) {
        const { degrees, position } = designationParts(d.designation || '');
        const role = matchRole(position), fromDegree = matchRole((degrees.match(/\(([^)]*)\)[^(]*$/) || [])[1] || '');
        if (role && !(GENERIC_ROLES.has(role) && fromDegree && !GENERIC_ROLES.has(fromDegree))) return role;
        return fromDegree || matchRole(d.speciality || '') || DEPT_ROLE[d.departments[0]] || 'Specialist';
    }
    // "MBBS, MS (General Surgery), MCh (Urology)" -> one entry per degree (commas inside brackets stay)
    function degreeList(s) {
        const out = [];
        let depth = 0, cur = '';
        for (const ch of s) {
            depth += ch === '(' ? 1 : ch === ')' ? -1 : 0;
            if (ch === ',' && !depth) { out.push(cur); cur = ''; } else cur += ch;
        }
        return [...out, cur].map(x => x.trim()).filter(Boolean);
    }

    // Treatments a doctor's "Areas of Expertise" names: [treatment id, words to find, the kind of doctor who performs it, short name for the title].
    // Most sought-after first; the title shows the first ones that fit.
    const CARDIAC_SURGEON = /cardiac surgeon/i, CATH = /cardiolog|electrophysiolog/i, NEURO_SURGEON = /neurosurgeon/i, NEURO_PHYSICIAN = /neurologist/i, SPINE = /spine|neurosurgeon|orthopaedic/i;
    const ORTHO = /orthopaedic|joint replacement/i, URO = /urolog/i, GYNAE = /gynaecolog/i, IVF = /ivf|gynaecolog/i, PLASTIC = /plastic/i, VASCULAR = /vascular|interventional radiolog/i;
    const DOCTOR_TREATMENTS = [
        ['coronary-artery-bypass-cabg', /\bcabg\b|coronary artery bypass|bypass graft/i, CARDIAC_SURGEON, 'Bypass Surgery'],
        ['heart-valve-replacement-avr-mvr', /valve (replacement|repair|surgery)/i, CARDIAC_SURGEON, 'Valve Replacement'],
        ['heart-transplant', /heart transplant|cardiac transplant/i, /surgeon/i, 'Heart Transplant'],
        ['bentall-surgery', /bentall/i, CARDIAC_SURGEON, 'Bentall Surgery'],
        ['angioplasty-stent-2', /(paediatric|pediatric|congenital) (cardiac|heart) surg/i, /cardiac surgeon/i, 'Paediatric Heart Surgery'],
        ['paediatric-heart-surgery', /\blvad\b|ventricular assist/i, CARDIAC_SURGEON, 'LVAD'],
        ['angioplasty-stent', /angioplasty|\bstent/i, CATH, 'Angioplasty'],
        ['tavi-procedure', /\btavi\b/i, CATH, 'TAVI'],
        ['tavr-procedure-2', /\btavr\b/i, CATH, 'TAVR'],
        ['paediatric-heart-surgery-2', /mitra.?clip/i, CATH, 'MitraClip'],
        ['pacemaker-surgery', /pacemaker/i, CATH, 'Pacemaker'],
        ['icd-implantation', /\bicd\b|defibrillator/i, CATH, 'ICD Implantation'],
        ['eps-rfa-procedure', /ablation|electrophysiology stud/i, CATH, 'EPS & RFA'],
        ['atrial-septal-defect-asd-closure', /\basd\b|septal defect/i, CATH, 'ASD Closure'],
        ['total-knee-replacement', /knee (replacement|arthroplasty)|\btkr\b/i, ORTHO, 'Knee Replacement'],
        ['hip-replacement', /hip (replacement|arthroplasty)|\bthr\b/i, ORTHO, 'Hip Replacement'],
        ['joint-revision-surgery', /revision (joint|arthroplasty|knee|hip|replacement)/i, ORTHO, 'Joint Revision'],
        ['anterior-cruciate-ligament-surgery', /\bacl\b|anterior cruciate/i, ORTHO, 'ACL Surgery'],
        ['shoulder-arthroscopy', /shoulder arthroscop|arthroscopic shoulder|rotator cuff/i, ORTHO, 'Shoulder Arthroscopy'],
        ['foot-ankle-surgery', /foot (and|&) ankle/i, ORTHO, 'Foot & Ankle Surgery'],
        ['limb-salvage-surgery', /limb.salvage/i, /orthopaedic/i, 'Limb Salvage'],
        ['scoliosis-surgery', /scoliosis/i, SPINE, 'Scoliosis Surgery'],
        ['lumbar-microdiscectomy', /micro-?discectomy/i, SPINE, 'Microdiscectomy'],
        ['decompression-fusion', /spinal fusion|decompression (and|&) fusion|lumbar fusion/i, SPINE, 'Spinal Fusion'],
        ['spine-endoscopic-surgery', /endoscopic spine|spine endoscop/i, SPINE, 'Endoscopic Spine Surgery'],
        ['tlif-1-level-transforaminal-lumbar-interbody-fusion', /\btlif\b/i, SPINE, 'TLIF'],
        ['tumor-in-spinal-cord', /spinal (cord )?tumou?r/i, NEURO_SURGEON, 'Spinal Tumour Surgery'],
        ['brain-tumor-neuronavigation-surgery', /brain tumou?r/i, NEURO_SURGEON, 'Brain Tumour Surgery'],
        ['deep-brain-stimulation-dbs', /deep brain stimulation|\bdbs\b/i, NEURO_SURGEON, 'Deep Brain Stimulation'],
        ['epilepsy-surgery', /epilepsy surg/i, NEURO_SURGEON, 'Epilepsy Surgery'],
        ['pituitary-tumour-surgery', /pituitary/i, NEURO_SURGEON, 'Pituitary Surgery'],
        ['gamma-knife-radiosurgery', /gamma knife/i, /neurosurgeon|radiation/i, 'Gamma Knife'],
        ['cyberknife-surgery', /cyber ?knife/i, /neurosurgeon|radiation/i, 'CyberKnife'],
        ['parkinsons-disease-management', /parkinson/i, NEURO_PHYSICIAN, "Parkinson's Disease"],
        ['motor-neuron-disease-mnd-care', /motor neuron/i, NEURO_PHYSICIAN, 'Motor Neuron Disease'],
        ['kidney-transplant', /kidney transplant|renal transplant/i, URO, 'Kidney Transplant'],
        ['liver-transplant', /liver transplant/i, /liver transplant|gi surgeon/i, 'Liver Transplant'],
        ['adult-bone-marrow-transplant', /bone marrow transplant|\bbmt\b|stem cell transplant/i, /^(?!paediatric).*(haemato|bone marrow|medical oncolog)/i, 'Bone Marrow Transplant'],
        ['paediatric-bone-marrow-transplant', /bone marrow transplant|\bbmt\b|stem cell transplant/i, /paediatric (haemato|oncolog)/i, 'Bone Marrow Transplant'],
        ['car-t-cell-therapy', /car.?t\b/i, /haemato|bone marrow|medical oncolog/i, 'CAR-T Therapy'],
        ['proton-therapy', /proton/i, /radiation/i, 'Proton Therapy'],
        ['hipec', /\bhipec\b/i, /surgical oncolog|gynaecologic oncolog|gi surgeon/i, 'HIPEC'],
        ['robotic-prostatectomy', /robotic.{0,30}prostatectomy/i, URO, 'Robotic Prostatectomy'],
        ['robotic-nephrectomy', /robotic.{0,30}nephrectomy/i, URO, 'Robotic Nephrectomy'],
        ['pcnl-procedure', /\bpcnl\b|percutaneous nephrolith/i, URO, 'PCNL'],
        ['rirs-stenting', /\brirs\b|retrograde intrarenal/i, URO, 'RIRS'],
        ['turp', /\bturp\b|transurethral resection of the prostate/i, URO, 'TURP'],
        ['urethroplasty', /urethroplasty/i, URO, 'Urethroplasty'],
        ['microscopic-varicocelectomy', /varicocele/i, URO, 'Varicocelectomy'],
        ['in-vitro-fertilisation', /\bivf\b|in.?vitro/i, IVF, 'IVF'],
        ['iui', /\biui\b|intrauterine insemination/i, IVF, 'IUI'],
        ['laparoscopic-hysterectomy', /(laparoscopic|tlh).{0,30}hysterectomy/i, GYNAE, 'Laparoscopic Hysterectomy'],
        ['hysterectomy', /hysterectomy/i, GYNAE, 'Hysterectomy'],
        ['myomectomy', /myomectomy/i, GYNAE, 'Myomectomy'],
        ['hair-transplant', /hair transplant/i, PLASTIC, 'Hair Transplant'],
        ['liposuction', /liposuction/i, PLASTIC, 'Liposuction'],
        ['tummy-tuck', /tummy tuck/i, PLASTIC, 'Tummy Tuck'],
        ['abdominoplasty', /abdominoplasty/i, PLASTIC, 'Abdominoplasty'],
        ['scar-revision', /scar revision/i, PLASTIC, 'Scar Revision'],
        ['gender-affirmation-surgery', /gender.(affirm|reassign)/i, PLASTIC, 'Gender Affirmation'],
        ['endovascular-surgery', /endovascular/i, VASCULAR, 'Endovascular Surgery'],
        ['laser-treatment-for-varicose-veins', /varicose/i, VASCULAR, 'Varicose Veins'],
        ['thrombectomy', /thrombectomy/i, VASCULAR, 'Thrombectomy'],
    ].map(([id, words, doctor, short]) => ({ t: treatBy[id], words, doctor, short }));

    function doctorTreatments(x, role) {
        const text = (x.tabs || []).find(t => t.title === 'Areas of Expertise')?.blocks.map(b => `${b.lead || ''} ${b.text || ''}`).join(' ') || '';
        return DOCTOR_TREATMENTS.filter(o => o.t && o.doctor.test(role) && o.words.test(text))
            // the laparoscopic hysterectomy row already says hysterectomy
            .filter((o, i, all) => !(o.t.id === 'hysterectomy' && all.some(a => a.t.id === 'laparoscopic-hysterectomy')));
    }

    // section headings that carry the doctor's name, with the short label used in the "On this page" bar
    const DOCTOR_TABS = {
        'About the Doctor': [n => `About ${n}`, 'About'],
        'Areas of Expertise': [n => `${n}'s Areas of Expertise`, 'Expertise'],
        'Key Achievements': [n => `Key Achievements of ${n}`, 'Achievements'],
        'Awards & Recognition': [n => `Awards & Recognition`, 'Awards'],
    };

    // keyword links from a doctor's page to the listing pages of the department
    function peerDeptLinks(role, dept, roleDept) {
        const s = roleDept || dept;
        if (!deptBy[s]) return '';
        return `
                        <p>See also: <a href="${listUrl('doctors', { department: s })}">${esc(listingTitle('doctors', { department: s }))}</a> and <a href="${listUrl('hospitals', { department: s })}">${esc(listingTitle('hospitals', { department: s }))}</a>.</p>`;
    }

    function doctor(d, x) {
        startTextLinks(link.doctor(d.id));
        const h = d.hospitalId ? hospBy[d.hospitalId] : null;
        const dept = d.departments[0];
        const city = cityName(d.city);
        const role = doctorRole(d);
        // the page targets India as a whole: the city stays in the facts and address, not in the title or headings
        const roleIn = `${role} in India`;
        const exp = d.experience ? ` with ${d.experience}+ years of experience` : '';
        const performs = doctorTreatments(x, role);
        // role, then the treatments that fit, then India; a treatment the role already names is not repeated
        const shortNames = performs.map(o => o.short).filter(s => !role.toLowerCase().includes(s.toLowerCase()));
        const withTreatments = names => names.length ? `${role} for ${names.join(' & ')} in India` : roleIn;
        const headline = [shortNames.slice(0, 2), shortNames.slice(0, 1), []].map(withTreatments).find(h => `${d.name} - ${h}`.length <= 70) || roleIn;
        const treatedText = performs.length ? ` Treatments include ${andList(performs.slice(0, 4).map(o => o.t.name))}.` : '';
        const tabs = (x.tabs || []).map((t, i) => {
            const [heading, nav] = DOCTOR_TABS[t.title] || [() => t.title, t.title];
            const blocks = i === 0 ? [{ t: 'p', text: `${d.name} is a ${roleIn}${exp}, currently at ${d.hospital}.${treatedText}` }, ...t.blocks] : t.blocks;
            return { ...t, title: heading(d.name), nav, blocks };
        });
        const { degrees, position } = designationParts(d.designation || '');
        const quals = degreeList(degrees);
        const url = `${SITE}/doctor/${d.id}/`;
        // the same doctor listed at two branches (same name and designation) points search engines at the first profile
        const same = D.doctors.find(o => o.name === d.name && o.designation === d.designation);
        const canonical = `${SITE}/doctor/${same.id}/`;
        const hospLink = h ? `<a href="${link.hospital(h.id)}">${esc(h.name)}</a>` : esc(d.hospital);
        const roleDept = ROLE_DEPT.find(([re]) => re.test(role))?.[1];
        const depts = [...new Set([roleDept, ...d.departments].filter(Boolean))];
        const treatments = depts.flatMap(s => D.treatments.filter(t => t.department === s && hasPrice(t) && !performs.some(o => o.t.id === t.id))).slice(0, 6);
        const expertise = (x.tabs || []).find(t => t.title === 'Areas of Expertise')?.blocks.filter(b => b.lead).map(b => b.lead) || [];
        const photo = d.image
            ? `<img src="${esc(d.image)}" alt="${esc(`${d.name} - ${headline}`)}" fetchpriority="high">`
            : `<span class="lc-initials">${esc(initials(d.name))}</span>`;
        // doctors with the same role first ("More Liver Transplant Surgeons"), then the rest of the department
        const others = D.doctors.filter(o => o.id !== d.id);
        const sameRole = top(others.filter(o => doctorRole(o) === role), 3, byExperience);
        const peers = sameRole.length === 3 ? sameRole
            : [...sameRole, ...top(others.filter(o => !sameRole.includes(o) && dept && o.departments.includes(dept)), 3 - sameRole.length, byExperience)];
        const peerDept = sameRole.length && roleDept ? roleDept : dept;

        // up to 70 characters so long names keep "in India"; Google may shorten the brand suffix in results
        const title = fit(70, `${d.name} - ${headline}`, `${d.name} - ${roleIn}`, `${d.name} - ${role}`, d.name);
        const years = d.experience ? ` ${d.experience}+ years' experience.` : '';
        const forTreatments = shortNames.length ? `, for ${andList(shortNames.slice(0, 3))}` : '';
        const description = fit(158,
            ...(forTreatments ? [`${d.name}, ${roleIn} at ${d.hospital}${forTreatments}.${years} Book a consultation and get a free cost estimate.`,
                `${d.name}, ${roleIn} at ${d.hospital}${forTreatments}. Book a consultation and get a free cost estimate.`] : []),
            `${d.name} is a ${roleIn} at ${d.hospital}${exp}. Book a consultation from abroad and get a free cost estimate.`,
            `${d.name}, ${roleIn} at ${d.hospital}.${years} Book a consultation and get a free cost estimate.`,
            `${d.name}, ${roleIn} at ${d.hospital}.${years} Book a free consultation.`,
            `${d.name}, ${roleIn} at ${d.hospital}. Book a free consultation.`);

        // How an international patient gets to this doctor; wording follows the booking, visa and concierge pages
        const steps = [
            ['Share your reports', 'Send your reports and scans on WhatsApp or through the form on this page. A Shifara case manager replies within 24 hours.'],
            ['Get an opinion and cost estimate', `We share your case with ${d.name} at ${d.hospital} and send you the treatment plan with a written cost estimate, free.`],
            ...(x.fee ? [['Video consultation', `Speak to ${d.name} on a video call before you travel to India. The consultation fee is ${x.fee}.`]] : []),
            ['Medical visa and travel', 'We arrange the hospital invitation letter for your e-Medical Visa and guide you through the application, free. Your case manager stays with you from the airport to the day you fly home.'],
            ['Treatment and follow-up', `After treatment we schedule your follow-up consultations with ${d.name}, including after you return home.`],
        ];
        const faqs = [
            [`Who is ${d.name}?`, `${esc(d.name)} is a ${esc(roleIn)}${esc(exp)}, practising at ${hospLink}.${quals.length ? ` Qualifications: ${esc(quals.join(', '))}.` : ''}`],
            ...(h ? [[`Which hospital does ${d.name} practise at?`, `${esc(d.name)} practises at ${hospLink}, ${esc(h.address || city)}.`]] : []),
            [`How can international patients book an appointment with ${d.name}?`, `Send your medical reports to Shifara Health on WhatsApp or through the form on this page. A case manager replies within 24 hours, arranges your appointment with ${esc(d.name)} and shares a written cost estimate. Our help is free for patients.`],
            ...(x.fee ? [[`Does ${d.name} offer video consultation?`, `Yes. You can book a <a href="${esc(bookUrl('Video consultation with ' + d.name))}">video consultation with ${esc(d.name)}</a> before you travel to India. The fee is ${esc(x.fee)}.`]] : []),
            [`What does treatment with ${d.name} cost?`, `The cost depends on the procedure, the room category and how long you stay in hospital. Share your reports and we will get a written estimate from ${esc(d.hospital)} at no charge.${performs.length || treatments.length ? ' Indicative costs for related treatments are listed above.' : ''}`],
            [`Do I need a medical visa to see ${d.name} in India?`, VISA_ANSWER],
        ];

        const seeAlso = peerDeptLinks(role, dept, roleDept);
        // [section title, html, short label for the "On this page" bar]
        const extra = [
            ...(quals.length || position ? [[`${d.name}'s Qualifications & Experience`, `
                        <p>${esc(d.name)}, ${esc(roleIn)}${esc(exp)}.</p>${quals.length ? `
                        <ul class="dt-list">${quals.map(q => `
                            <li>${svg('check')}<span>${esc(q)}</span></li>`).join('')}
                        </ul>` : ''}${position ? `
                        <p><b>Current position:</b> ${esc(position)}</p>` : ''}`, 'Qualifications']] : []),
            [`Consult ${d.name} from Abroad`, `
                        <p>How Shifara Health connects international patients with ${esc(d.name)}, ${esc(roleIn)}.</p>${stepsBlock(steps)}`, 'Consult from abroad'],
            ...(performs.length ? [[`Treatments by ${d.name} in India`, `
                        <p>Treatments named in this doctor's profile. Costs are indicative package prices in India; your written estimate depends on your reports.</p>${costTable(performs.map(o => o.t))}${seeAlso}`, 'Treatments']] : []),
            ...(treatments.length ? [[performs.length ? 'Related Treatment Costs in India' : 'Treatment Costs in India', `
                        <p>Indicative package costs in India at Shifara partner hospitals. Your written estimate depends on your reports.</p>${costTable(treatments)}${performs.length ? '' : seeAlso}`, 'Costs']] : []),
            [`FAQs about ${d.name}`, faqBlock(faqs), 'FAQs'],
        ];

        const crumbs = [['Doctors', listUrl('doctors')], ...(dept ? [[deptBy[dept]?.noun + ' doctors', listUrl('doctors', { department: dept })]] : [])];
        const head = seoHead({
            url, canonical, title, description, ogType: 'profile', image: d.image, aboutId: url + '#physician', faqs,
            crumbs: [['Home', '/'], ...crumbs, [d.name, `/doctor/${d.id}/`]],
            nodes: [{
                '@type': 'Physician', '@id': url + '#physician', name: d.name, url, description,
                ...(d.image ? { image: SITE + encodeURI(d.image) } : {}),
                medicalSpecialty: [...new Set(depts.map(s => SPECIALTY[s]).filter(Boolean))].map(s => 'https://schema.org/' + s),
                ...(expertise.length ? { knowsAbout: expertise } : {}),
                ...(h ? { hospitalAffiliation: { '@type': 'Hospital', name: h.name, url: SITE + link.hospital(h.id) } } : {}),
                address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'IN' },
            }],
        });

        const main = `
        <section class="dt-hero">
            <div class="container">
                ${crumb([...crumbs, [d.name]])}
                <div class="dt-head dt-head-doc">
                    <div class="dt-photo">${photo}</div>
                    <div class="min-w-0">
                        <h1>${esc(d.name)} <span class="dt-h1-role">${esc(headline)}</span></h1>
                        <p class="dt-desig">${esc(d.designation)}</p>
                        <div class="dt-facts">
                            ${d.experience ? `<span>${svg('clock')}${d.experience}+ years experience</span>` : ''}
                            ${h ? `<a href="${link.hospital(h.id)}">${svg('home')}${esc(d.hospital)}</a>` : `<span>${svg('home')}${esc(d.hospital)}</span>`}
                            <span>${svg('pin')}${esc(city)}, India</span>
                            ${x.fee ? `<span class="dt-fee">${svg('video')}Video consultation: ${esc(x.fee)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="dt-actions">
                    <a href="${esc(bookUrl(d.name))}" class="btn btn-coral">Book consultation ${svg('arrow', 'i')}</a>
                    <a href="${wa(`Hi Shifara, I want to consult ${d.name} (${d.hospital})`)}" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} Chat on WhatsApp</a>
                    <a href="${esc(bookUrl('Video consultation with ' + d.name))}" class="btn btn-ghost">${svg('video', 'i')} Video consultation</a>
                </div>
            </div>
        </section>
        ${subnav([...tabs.map(t => [t.nav, t.title]), ...extra.map(([t, , label]) => [label, t])])}
        <div class="container dt-body">
            <div class="row g-4 g-xl-5">
                <div class="col-lg-8">
                    ${tabSections(tabs) || section(`About ${d.name}`, `\n                        <p>${esc(d.designation)}</p>`)}${extra.map(([t, inner]) => section(t, inner)).join('')}
                </div>
                <div class="col-lg-4">
                    <aside class="dt-side">${h ? `
                        <a class="dt-hosp" href="${link.hospital(h.id)}">
                            <span class="dt-hosp-logo">${logo(h, `${h.name}, India`)}</span>
                            <span class="min-w-0"><small>Practises at</small><b>${esc(h.name)}</b><span>${esc(h.address || city)}</span></span>
                            ${svg('arrow', 'i')}
                        </a>` : ''}
                        <div class="dt-glance">
                            <h3>At a glance</h3>
                            <div><small>Speciality</small><b>${esc(role)}</b></div>
                            ${d.experience ? `<div><small>Experience</small><b>${d.experience}+ years</b></div>` : ''}
                            <div><small>Hospital</small>${h ? `<a href="${link.hospital(h.id)}">${esc(h.name)}</a>` : `<b>${esc(d.hospital)}</b>`}</div>
                            <div><small>City</small><b>${esc(city)}, India</b></div>
                            ${x.fee ? `<div><small>Video consultation</small><b>${esc(x.fee)}</b></div>` : ''}
                        </div>${quoteBox(d.name)}
                    </aside>
                </div>
            </div>
            ${related(sameRole.length ? `More ${role}s in India` : `More ${deptBy[dept]?.noun || ''} specialists in India`, peers.map(doctorCard), listUrl('doctors', { department: peerDept }), `All ${searchDoctors(peerDept)}`)}
            ${ctaBand('Want a second opinion first?', 'Share your reports and get a free opinion from a senior specialist before you travel.', d.name)}
        </div>`;
        return { title, description, main, head };
    }

    // ---------- Treatment ----------
    // doctors whose profile names each treatment, most experienced first
    let performers;
    function doctorsFor(id) {
        if (!performers) {
            performers = {};
            const seen = new Set();
            for (const d of [...D.doctors].sort(byExperience)) {
                if (seen.has(d.name + d.designation)) continue;
                seen.add(d.name + d.designation);
                for (const o of doctorTreatments(detailData('doctors', d.id), doctorRole(d))) (performers[o.t.id] = performers[o.t.id] || []).push(d);
            }
        }
        return performers[id] || [];
    }

    function treatment(t, x) {
        startTextLinks(link.treatment(t.id));
        const dept = t.department;
        const cost = x.cost;
        const nameIn = `${t.name} in India`;
        const noun = deptBy[dept]?.noun || '';
        const who = /surg|replacement|transplant|bypass|ectomy|plasty|arthroscop/i.test(t.name) ? 'Surgeons' : 'Doctors';
        const deptHospitals = D.hospitals.filter(h => h.departments.includes(dept));
        const hosps = top(deptHospitals, 3, byDoctors);
        const named = doctorsFor(t.id);
        const docs = [...named, ...top(D.doctors.filter(d => d.departments.includes(dept) && !named.includes(d)), 3, byExperience)].slice(0, 3);
        const others = D.treatments.filter(o => o.department === dept && o.id !== t.id).slice(0, 4);
        const guides = POSTS.filter(p => (p.treatments || []).includes(t.id));
        const costlySiblings = D.treatments.filter(o => o.department === dept && o.id !== t.id && hasPrice(o)).slice(0, 8);
        const allHospitals = listUrl('hospitals', { treatment: t.id });
        const allDoctors = listUrl('doctors', { treatment: t.id });
        const faqs = [
            ...(hasPrice(t) ? [[`How much does ${t.name} cost in India?`, `The indicative package cost in India is ${esc(t.cost)}. Your written estimate depends on your reports, the hospital and your room category, and we share it free.`]] : []),
            ...(hosps.length ? [['Which hospitals are best for this treatment in India?', `Shifara partner hospitals for this treatment include ${andList(hosps.map(hospitalLink))}. The right hospital depends on your diagnosis, so send your reports and we will compare up to 3 hospitals for you, free. <a href="${allHospitals}">Compare partner hospitals</a>.`]] : []),
            ...(docs.length ? [['Who are the top doctors for this treatment in India?', `Senior specialists on our panel include ${andList((named.length > 3 ? named.slice(0, 6) : docs).map(doctorLink))}. <a href="${allDoctors}">See all doctors</a>.`]] : []),
            [`How can international patients plan this treatment in India?`, 'Send your medical reports to Shifara Health on WhatsApp or through the form on this page. A case manager replies within 24 hours, suggests suitable hospitals and specialists, and shares a written cost estimate. Our help is free for patients.'],
            ['Do I need a medical visa for treatment in India?', VISA_ANSWER],
        ];
        // [section title, html, short label for the "On this page" bar]
        const extra = [
            ...(costlySiblings.length ? [[`Related ${noun} Treatment Costs in India`, `
                        <p>Indicative package costs in India at Shifara partner hospitals. Your written estimate depends on your reports.</p>${costTable(costlySiblings)}`, 'Related costs']] : []),
            ['Frequently Asked Questions', faqBlock(faqs), 'FAQs'],
        ];
        const navTitles = [...(x.sections || []).map(s => s.title), ...(x.steps?.length ? ['Your journey'] : []), ...(cost ? ['Cost'] : []), ...extra.map(([title, , nav]) => [nav, title])];

        const main = `
        <section class="dt-hero dt-hero-treat">
            <div class="container">
                <div class="row g-4 align-items-center">
                    <div class="col-lg-7">
                        ${crumb([['Treatments', listUrl('treatments')], [deptName(dept), listUrl('treatments', { department: dept })], [t.name]])}
                        <span class="dt-badge">${esc(deptName(dept))}</span>
                        <h1>${esc(nameIn)}</h1>
                        ${x.tagline ? `<p class="dt-tagline">${esc(x.tagline)}</p>` : ''}
                        ${hasPrice(t) ? `<div class="dt-price"><small>Starting from</small><b>${esc(startingPrice(t.cost))}</b><span>Package range ${esc(t.cost)} · indicative</span></div>` : ''}
                        <div class="dt-actions">
                            <a href="${esc(bookUrl(t.name))}" class="btn btn-coral">Let us help you ${svg('arrow', 'i')}</a>
                            <a href="${wa(`Hi Shifara, I need information about ${t.name} in India`)}" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} Talk to an advisor</a>
                        </div>
                    </div>
                    <div class="col-lg-5">
                        <div class="dt-quote dt-hero-form" id="dtQuote">
                            <form class="dt-quote-form" data-form="Quote box" accept-charset="UTF-8" action="https://app.formester.com/forms/HmhWy3jl2/submissions" method="POST">
                                <input type="hidden" name="subject" value="${esc(t.name)}">
                                <span class="dt-quote-kicker">100% free · Reply within 24 hrs</span>
                                <h3>Let Us Help You</h3>
                                <p class="dt-quote-sub">Upfront cost estimate &amp; specialist options for your treatment</p>
                                <div class="d-grid gap-2">
                                    <input class="form-control" name="name" type="text" required placeholder="Full name" aria-label="Full name">
                                    ${countrySelect()}
                                    <input class="form-control" name="phone" type="tel" required placeholder="WhatsApp / phone with country code" aria-label="Phone">
                                    <input class="form-control" name="email" type="email" required placeholder="Email address" aria-label="Email">
                                    <textarea class="form-control" name="message" rows="2" placeholder="Briefly describe condition or treatment required" aria-label="Message"></textarea>${consent('dtQuote')}
                                    <button class="btn btn-coral w-100" type="submit">Let us help you ${svg('arrow', 'i')}</button>
                                </div>
                                <p class="dt-quote-note">${svg('shield')}Your medical information stays confidential.</p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        ${subnav(navTitles)}
        <div class="container dt-body">
            <div class="row g-4 g-xl-5">
                <div class="col-lg-8">${(x.sections || []).map((s, i) => `
                    <section class="dt-sec dt-sec-media" id="sec-${slug(s.title)}">${s.img ? `
                        <div class="dt-sec-img${i % 2 ? ' order-md-last' : ''}"><img src="${esc(s.img)}" alt="${esc(i ? `${s.title.includes(t.name) ? '' : t.name + ': '}${s.title.replace(/[?.]$/, '')}` : `${t.name} in India`)}" loading="lazy"></div>` : ''}
                        <div class="dt-sec-text">
                            <h2>${esc(s.title)}</h2>${i ? '' : `
                        <p>${esc(nameIn)} is available at ${deptHospitals.length} accredited partner hospitals through Shifara Health${hasPrice(t) ? `, with indicative packages from ${esc(startingPrice(t.cost))}` : ''}.</p>`}${blocksHtml(s.blocks)}
                        </div>
                    </section>`).join('')}
                    ${x.steps?.length ? section('Your journey', `
                        <p>How Shifara Health supports you from your first message to your return home.</p>
                        <div class="dt-steps">${x.steps.map((st, i) => `
                            <div class="dt-step"><span>${String(i + 1).padStart(2, '0')}</span>
                                <div><b>${esc(st.title)}</b><p>${esc(st.text)}</p></div></div>`).join('')}
                        </div>`) : ''}
                    ${cost ? `
                    <section class="dt-sec" id="sec-cost">
                        <h2>${esc(t.name)} Cost in India</h2>${cost.intro ? `
                        <p>${esc(cost.intro)}</p>` : ''}
                        <div class="dt-cost">
                            <table>
                                <thead><tr><th>Procedure</th><th>Indicative cost (USD)</th></tr></thead>
                                <tbody>${cost.rows.map(([p, c]) => `
                                    <tr><td>${esc(p)}</td><td>${esc(c)}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>${cost.note ? `
                        <p class="dt-cost-note">${esc(cost.note)}</p>` : ''}${guides.length ? `
                        <p class="mt-3 mb-0">Read our guide: ${guides.map(p => `<a href="/blog/${p.slug}/">${esc(p.title)}</a>`).join(', ')}.</p>` : ''}
                    </section>` : ''}${extra.map(([title, inner]) => section(title, inner)).join('')}
                </div>
                <div class="col-lg-4">
                    <aside class="dt-side">
                        <div class="dt-glance">
                            <h3>At a glance</h3>
                            <div><small>Department</small><a href="${listUrl('treatments', { department: dept })}">${esc(deptName(dept))}</a></div>
                            ${hasPrice(t) ? `<div><small>Indicative cost</small><b>${esc(t.cost)}</b></div>` : ''}
                            <div><small>Partner hospitals</small><a href="${allHospitals}">${deptHospitals.length} hospitals</a></div>
                            <div><small>Specialists</small><a href="${allDoctors}">${D.doctors.filter(d => d.departments.includes(dept)).length} doctors</a></div>
                        </div>${quoteBox(t.name, 'dtSideQuote', 'your treatment')}
                    </aside>
                </div>
            </div>
            ${related(`Best Hospitals for ${nameIn}`, hosps.map(hospitalCard), allHospitals, `All hospitals for ${t.name}`)}
            ${related(`Top Doctors for ${nameIn}`, docs.map(doctorCard), allDoctors, `All doctors for ${t.name}`)}
            ${related(`Related ${noun} Treatments in India`, others.map(treatmentCard), listUrl('treatments', { department: dept }), `All ${noun} treatments`, 'row-cols-1 row-cols-sm-2 row-cols-lg-4')}
            ${ctaBand(`Planning ${t.name} in India?`, 'Tell us about your condition and we will send a treatment plan and cost estimate within 48 hours, free.', t.name)}
        </div>`;
        // up to 53 characters: 70 with the brand suffix
        const title = hasPrice(t)
            ? fit(53, `${nameIn}: Cost, Hospitals & ${who}`, `${nameIn}: Cost & Hospitals`, `${t.name} Cost in India`, nameIn)
            : fit(53, `${nameIn}: Hospitals & ${who}`, `${nameIn}: Best Hospitals`, nameIn);
        const price = hasPrice(t) ? ` starts from ${startingPrice(t.cost)}` : '';
        const description = fit(158,
            `${nameIn}${price}. Compare accredited hospitals and experienced ${who.toLowerCase()}, and get a free written cost estimate from Shifara Health.`,
            `${nameIn}${price}. Compare accredited hospitals and get a free written cost estimate from Shifara Health.`,
            `${nameIn}${price}. Get a free written cost estimate from Shifara Health.`);
        const url = `${SITE}/treatment/${t.id}/`;
        const head = seoHead({
            url, title, description, image: t.image, aboutId: url + '#procedure', faqs,
            crumbs: [['Home', '/'], ['Treatments', listUrl('treatments')], [deptName(dept), listUrl('treatments', { department: dept })], [t.name, `/treatment/${t.id}/`]],
            nodes: [{
                '@type': 'MedicalProcedure', '@id': url + '#procedure', name: t.name, url, description,
                ...(t.image ? { image: SITE + encodeURI(t.image) } : {}),
                ...(SPECIALTY[dept] ? { relevantSpecialty: 'https://schema.org/' + SPECIALTY[dept] } : {}),
            }],
        });
        return { title, description, main, head };
    }

    // ---------- Listing pages ----------
    // Meta description of a listing page, from the same results the page shows
    function listingDescription(type, st, items) {
        const t = st.treatment ? treatBy[st.treatment] : null;
        const dept = st.department || t?.department;
        const h = st.hospital ? hospBy[st.hospital] : null;
        const where = st.city ? `${cityName(st.city)}, India` : 'India';
        const n = items.length;
        const close = 'and get free written estimates.';
        if (type === 'hospitals') {
            const what = t ? `hospitals for ${t.name}` : dept ? `${searchTerm(dept)} hospitals` : 'hospitals';
            return fit(158, `Compare ${n} accredited ${what} in ${where} for international patients. See doctors and specialities, ${close}`, `Compare ${n} accredited ${what} in ${where}. Get free written cost estimates.`);
        }
        if (type === 'doctors') {
            if (h) return fit(158, `${n} ${dept ? searchDoctors(dept) : 'doctors'} at ${hospitalLabel(h)}, India. See their experience and qualifications, ${close}`, `${n} ${dept ? searchDoctors(dept) : 'doctors'} at ${hospitalLabel(h)}, India. Get a free opinion.`);
            const what = t ? `doctors for ${t.name}` : dept ? searchDoctors(dept) : 'senior doctors';
            return fit(158, `Find ${n} experienced ${what} in ${where} at accredited hospitals. Get a free opinion and written cost estimate before you travel.`, `Find ${n} experienced ${what} in ${where}. Get a free opinion before you travel.`);
        }
        const what = dept ? `${searchTerm(dept)} treatments` : 'treatments';
        return fit(158, `Compare ${n} ${what} in India with indicative costs, accredited hospitals and experienced doctors, ${close}`, `Compare ${n} ${what} in India. Get free written cost estimates.`);
    }

    // Text below the results: how to choose, costs, related pages and FAQs, all from the catalog
    function listingAbout(type, st, items) {
        const t = st.treatment ? treatBy[st.treatment] : null;
        const dept = st.department || t?.department;
        const h = st.hospital ? hospBy[st.hospital] : null;
        const where = st.city ? `${cityName(st.city)}, India` : 'India';
        const field = t ? t.name : dept ? deptName(dept) : '';
        const topic = t ? t.name : dept ? searchTerm(dept) : '';
        const n = items.length;
        const byCity = {};
        items.forEach(it => { if (it.city) byCity[it.city] = (byCity[it.city] || 0) + 1; });
        const cities = Object.keys(byCity).sort((a, b) => byCity[b] - byCity[a]).map(cityName);
        const across = st.city || h || !cities.length ? '' : `, across ${andList(cities.slice(0, 6))}`;
        const deptDoctors = o => dept ? D.doctors.filter(d => d.hospitalId === o.id && d.departments.includes(dept)).length : o.doctors;
        const costs = (t ? [t, ...D.treatments.filter(o => o.department === dept && o.id !== t.id)] : dept ? D.treatments.filter(o => o.department === dept) : []).filter(hasPrice).slice(0, 12);
        const filters = t ? { treatment: t.id } : dept ? { department: dept } : null;
        const also = filters && !h ? [
            ...(type !== 'hospitals' ? [[listUrl('hospitals', filters), listingTitle('hospitals', filters)]] : []),
            ...(type !== 'doctors' ? [[listUrl('doctors', filters), listingTitle('doctors', filters)]] : []),
            ...(type !== 'treatments' && D.treatments.some(o => o.department === dept) ? [[listUrl('treatments', { department: dept }), listingTitle('treatments', { department: dept })]] : []),
            ...(t ? [[link.treatment(t.id), `${t.name} in India`]] : []),
        ] : !h ? ['hospitals', 'doctors', 'treatments'].filter(o => o !== type).map(o => [listUrl(o), listingTitle(o, {})]) : [];
        const alsoHtml = also.length ? `
                        <p>Related: ${andList(also.map(([href, text]) => `<a href="${href}">${esc(text)}</a>`))}.</p>` : '';

        let heading, intro, advice, best;
        if (type === 'hospitals') {
            const top5 = [...items].sort((a, b) => deptDoctors(b) - deptDoctors(a)).slice(0, 5).map(hospitalLink);
            heading = field ? `How to Choose a Hospital for ${field} in ${where}` : `How to Choose a Hospital in ${where}`;
            intro = `Shifara Health works with ${n} accredited partner ${n === 1 ? 'hospital' : 'hospitals'}${field ? ` for ${esc(field)}` : ''} in ${esc(where)}${esc(across)}. International patients can compare them, send their reports and get written cost estimates before they travel.`;
            advice = `Hospitals with the most specialists on our panel include ${andList(top5)}. The right hospital depends on your diagnosis, so a Shifara case manager reviews your reports and compares up to 3 hospitals for you, free.`;
            best = [t ? `Which are the best hospitals for ${t.name} in ${where}?` : topic ? `Which are the best ${topic} hospitals in ${where}?` : `Which are the best hospitals in ${where}?`,
                `Shifara partner hospitals${field ? ` for ${esc(field)}` : ''} in ${esc(where)} include ${andList(top5)}. The right choice depends on your diagnosis and budget, so send your reports and we will compare up to 3 hospitals for you, free.`];
        } else if (type === 'doctors') {
            const top5 = items.slice(0, 5).map(doctorLink);
            const specialists = dept ? `${esc(deptName(dept))} specialists` : 'specialists';
            heading = h ? `Consult a Doctor at ${hospitalLabel(h)} from Abroad` : field ? `How to Choose a Doctor for ${field} in ${where}` : `How to Choose a Doctor in ${where}`;
            intro = `Shifara Health lists ${n} ${specialists}${t ? ` who can advise on ${esc(t.name)}` : ''} ${h ? `at ${hospitalLink(h)}, India` : `at accredited hospitals in ${esc(where)}${esc(across)}`}. Each profile shows the doctor's qualifications, experience and hospital.`;
            advice = `The most experienced specialists on our panel include ${andList(top5)}. Share your reports and get a free opinion from a senior specialist before you travel.`;
            best = [h ? `Which doctors practise at ${hospitalLabel(h)}?` : t ? `Who are the best doctors for ${t.name} in ${where}?` : dept ? `Who are the best ${searchDoctors(dept)} in ${where}?` : `Who are the best doctors in ${where}?`,
                `Senior specialists on our panel include ${andList(top5)}. The right doctor depends on your diagnosis, so send your reports and a case manager will suggest suitable specialists, free.`];
        } else {
            const top5 = items.slice(0, 5).map(treatmentLink);
            heading = field ? `${field} Treatment in India` : 'Medical Treatment in India for International Patients';
            intro = `Shifara Health coordinates ${n} ${field ? `${esc(field)} ` : ''}${n === 1 ? 'treatment' : 'treatments'} at accredited hospitals in India, including ${andList(top5)}.`;
            advice = 'Send your reports and a case manager will suggest the right treatment, hospital and cost, free.';
            best = [field ? `Which ${topic} treatments are available in India?` : 'Which treatments are available in India?',
                `Treatments coordinated by Shifara Health include ${andList(top5)}. Send your reports and we will suggest the right option for you, free.`];
        }
        const nums = costs.flatMap(o => (o.cost.match(/\$[\d,]+/g) || []).map(v => +v.replace(/[$,]/g, ''))).filter(Boolean);
        const faqs = [
            best,
            ...(nums.length ? [[`How much does ${topic} treatment cost in India?`, `Indicative package costs range from $${Math.min(...nums).toLocaleString('en-US')} to $${Math.max(...nums).toLocaleString('en-US')}, depending on the procedure. Your written estimate depends on your reports, the hospital and your room category, and we share it free.`]] : []),
            ...(type !== 'treatments' && !st.city && !h && cities.length > 1 ? [[`Which cities in India have these ${type}?`, `${esc(andList(cities))}.`]] : []),
            ['How can international patients book through Shifara Health?', 'Send your medical reports on WhatsApp or through the booking form. A case manager replies within 24 hours, arranges your appointment and shares a written cost estimate. Our help is free for patients.'],
            ['Do I need a medical visa for treatment in India?', VISA_ANSWER],
        ];
        const html = `
                <div class="row mt-4" id="lrAbout">
                    <div class="col-12">${section(heading, `
                        <p>${intro}</p>
                        <p>${advice}</p>${alsoHtml}`)}${costs.length ? section(`${topic} Treatment Costs in India`, `
                        <p>Indicative package costs in India at Shifara partner hospitals. Your written estimate depends on your reports.</p>${costTable(costs)}`) : ''}${section(`FAQs about ${listingTitle(type, st)}`, faqBlock(faqs))}
                    </div>
                </div>`;
        return { html, faqs };
    }

    return { hospital, doctor, treatment, seoHead, listingDescription, listingAbout };
};
