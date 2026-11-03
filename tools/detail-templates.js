// Shifara Health - HTML templates for the generated detail pages (used by tools/build.js only).
// Each function returns { title, description, main } for one hospital, doctor or treatment, plus { head } (canonical,
// social and schema.org tags, with absolute URLs on SITE) where the page has one.
module.exports = function templates(UI, SITE) {
    const { D, HOME, esc, svg, deptName, cityName, deptBy, hospBy, link, listUrl, wa, startingPrice, initials, logo,
        hospitalCard, doctorCard, treatmentCard } = UI;

    // ---------- Shared pieces ----------
    const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const top = (list, n, sort) => [...list].sort(sort).slice(0, n);
    const byDoctors = (a, b) => b.doctors - a.doctors;
    const byExperience = (a, b) => (b.experience || 0) - (a.experience || 0);
    const firstText = tabs => (tabs?.[0]?.blocks || []).find(b => b.t === 'p')?.text || '';
    const clip = s => (s || '').replace(/\s+/g, ' ').trim().slice(0, 158);
    // first candidate that fits, else the last one cut at a word
    const fit = (max, ...options) => options.find(o => o.length <= max) ||
        options.at(-1).slice(0, max - 1).replace(/[\s,;:–-]+\S*$/, '') + '…';
    const strip = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    // JSON-LD inside <script>: "</" must not close the tag
    const jsonLd = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

    function crumb(items) {
        return `<nav class="lp-crumb dt-crumb" aria-label="Breadcrumb"><a href="${HOME}">Home</a>` +
            items.map(([label, href]) => `<span>/</span>${href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`}`).join('') +
            '</nav>';
    }

    function blocksHtml(blocks) {
        let out = '', list = [];
        const flush = () => {
            if (list.length) out += `\n                        <ul class="dt-list">\n${list.join('\n')}\n                        </ul>`;
            list = [];
        };
        for (const b of blocks) {
            if (b.t === 'li') {
                list.push(`                            <li>${svg('check')}<span>${b.lead ? `<b>${esc(b.lead)}</b> ` : ''}${esc(b.text)}</span></li>`);
            } else {
                flush();
                out += b.t === 'h' ? `\n                        <h3 class="dt-h3">${esc(b.text)}</h3>` : `\n                        <p>${esc(b.text)}</p>`;
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
                                <div><b>${esc(b.lead)}</b><p>${esc(b.text)}</p></div></div></div>`).join('')}
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

    function quoteBox(subject, id = 'dtQuote') {
        return `
                    <div class="dt-quote" id="${id}">
                        <form class="dt-quote-form" data-form="Quote box" accept-charset="UTF-8" action="https://app.formester.com/forms/HmhWy3jl2/submissions" method="POST">
                            <input type="hidden" name="subject" value="${esc(subject)}">
                            <span class="dt-quote-kicker">100% free · reply within 24 hrs</span>
                            <h3>Get a free quote</h3>
                            <p class="dt-quote-sub">for ${esc(subject)}</p>
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
    function hospital(h, x) {
        const tabs = x.tabs || [];
        const docs = D.doctors.filter(d => d.hospitalId === h.id).sort(byExperience);
        const docDepts = [...new Set(docs.flatMap(d => d.departments))];
        const hasSpecialities = tabs.some(t => t.title === 'Specialities');
        const special = {
            Specialities: blocks => {
                const heads = blocks.filter(b => b.t === 'h');
                return heads.length ? `
                        <div class="dt-spec-grid">${heads.map(b => `
                            <div class="dt-spec">${svg('heart')}<span>${esc(b.text)}</span></div>`).join('')}
                        </div>` + blocksHtml(blocks.filter(b => b.t !== 'h')) : null;
            },
        };
        const navTitles = [...tabs.map(t => t.title), ...(docs.length ? ['Doctors'] : [])];
        const chip = (dept, label, n) =>
            `<button type="button"${dept ? '' : ' class="on"'} data-d="${dept}" data-count="${n}" data-href="${listUrl('doctors', { hospital: h.id, department: dept })}">${esc(label)} (${n})</button>`;
        // every doctor is in the HTML; the department chips only show / hide them (assets/js/detail.js)
        const docCards = docs.map((d, i) => doctorCard(d).replace('<div class="col">',
            `<div class="col${i >= 6 ? ' d-none' : ''}" data-depts="${d.departments.join(' ')}">`));

        const intro = `
                <div class="dt-head">
                    <div class="dt-logo">${logo(h)}</div>
                    <div class="min-w-0">
                        <h1>${esc(h.name)}</h1>
                        <p class="dt-loc">${svg('pin')}${esc(h.address || cityName(h.city))}</p>
                        <div class="dt-facts">
                            ${x.established ? `<span>${svg('clock')}Established ${esc(x.established)}</span>` : ''}
                            ${x.image ? '' : `<span>${svg('shield')}Accredited partner</span>`}
                            ${docs.length ? `<a href="#sec-doctors">${svg('user')}${docs.length} doctors</a>` : ''}
                            <span>${svg('heart')}${h.departments.length} specialities</span>
                        </div>
                    </div>
                </div>
                <div class="dt-actions">
                    <a href="${esc(bookUrl(h.name))}" class="btn btn-coral">Get free quote ${svg('arrow', 'i')}</a>
                    <a href="${wa(`Hi Shifara, I want to know more about ${h.name}, ${cityName(h.city)}`)}" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} Message us</a>
                    ${docs.length ? '<a href="#sec-doctors" class="btn btn-ghost">View doctors</a>' : ''}
                </div>`;

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
                    ${!hasSpecialities ? section('Specialities', `
                        <div class="lc-tags dt-tags">${h.departments.map(s => `<a href="${listUrl('doctors', { hospital: h.id, department: s })}">${esc(deptName(s))}</a>`).join('')}</div>`) : ''}
                    ${docs.length ? section('Doctors', `
                        <div class="dt-chips" id="dtDocChips">
                            ${chip('', 'All', docs.length)}
                            ${docDepts.map(s => chip(s, deptBy[s]?.noun || deptName(s), docs.filter(d => d.departments.includes(s)).length)).join('\n                            ')}
                        </div>
                        <div class="row row-cols-1 row-cols-md-2 g-3" id="dtDocGrid">
                            ${docCards.join('\n                            ')}
                        </div>
                        <div class="text-center mt-4"><a id="dtDocAll" class="btn btn-ghost${docs.length <= 6 ? ' d-none' : ''}" href="${listUrl('doctors', { hospital: h.id })}"><span>View all ${docs.length} doctors</span> ${svg('arrow', 'i')}</a></div>`) : ''}
                </div>
                <div class="col-lg-4">
                    <aside class="dt-side">${quoteBox(h.name)}
                    </aside>
                </div>
            </div>
            ${related(`Other hospitals in ${cityName(h.city)}`, top(D.hospitals.filter(o => o.city === h.city && o.id !== h.id), 3, byDoctors).map(hospitalCard), listUrl('hospitals', { city: h.city }), `All hospitals in ${cityName(h.city)}`)}
            ${ctaBand('Not sure this is the right hospital?', 'Send your reports and we will compare up to 3 hospitals with written estimates, free.', h.name)}
        </div>`;
        return {
            title: h.name,
            description: clip(firstText(tabs) || `${h.name}, ${cityName(h.city)}: specialities, doctors and free cost estimates for international patients.`),
            main,
        };
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
        [/neuro/i, 'neurology'], [/orthop|joint|sports/i, 'orthopedics'], [/cardi|electrophys/i, 'cardiology'],
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

    // section headings that carry the doctor's name, with the short label used in the "On this page" bar
    const DOCTOR_TABS = {
        'About the Doctor': [n => `About ${n}`, 'About'],
        'Areas of Expertise': [n => `${n}'s Areas of Expertise`, 'Expertise'],
        'Key Achievements': [n => `Key Achievements of ${n}`, 'Achievements'],
        'Awards & Recognition': [n => `Awards & Recognition`, 'Awards'],
    };

    function doctor(d, x) {
        const h = d.hospitalId ? hospBy[d.hospitalId] : null;
        const dept = d.departments[0];
        const city = cityName(d.city);
        const role = doctorRole(d);
        // the page targets India as a whole: the city stays in the facts and address, not in the title or headings
        const roleIn = `${role} in India`;
        const exp = d.experience ? ` with ${d.experience}+ years of experience` : '';
        const tabs = (x.tabs || []).map((t, i) => {
            const [heading, nav] = DOCTOR_TABS[t.title] || [() => t.title, t.title];
            const blocks = i === 0 ? [{ t: 'p', text: `${d.name} is a ${roleIn}${exp}, currently at ${d.hospital}.` }, ...t.blocks] : t.blocks;
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
        const treatments = depts.flatMap(s => D.treatments.filter(t => t.department === s && t.cost)).slice(0, 6);
        const expertise = (x.tabs || []).find(t => t.title === 'Areas of Expertise')?.blocks.filter(b => b.lead).map(b => b.lead) || [];
        const photo = d.image
            ? `<img src="${esc(d.image)}" alt="${esc(`${d.name} - ${roleIn}`)}" fetchpriority="high">`
            : `<span class="lc-initials">${esc(initials(d.name))}</span>`;
        // doctors with the same role first ("More Liver Transplant Surgeons"), then the rest of the department
        const others = D.doctors.filter(o => o.id !== d.id);
        const sameRole = top(others.filter(o => doctorRole(o) === role), 3, byExperience);
        const peers = sameRole.length === 3 ? sameRole
            : [...sameRole, ...top(others.filter(o => !sameRole.includes(o) && dept && o.departments.includes(dept)), 3 - sameRole.length, byExperience)];
        const peerDept = sameRole.length && roleDept ? roleDept : dept;

        // up to 70 characters so long names keep "in India"; Google may shorten the brand suffix in results
        const title = fit(70, `${d.name} - ${roleIn}`, `${d.name} - ${role}`, d.name);
        const years = d.experience ? ` ${d.experience}+ years' experience.` : '';
        const description = fit(158,
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
            [`What does treatment with ${d.name} cost?`, `The cost depends on the procedure, the room category and how long you stay in hospital. Share your reports and we will get a written estimate from ${esc(d.hospital)} at no charge.${treatments.length ? ' Indicative costs for related treatments are listed above.' : ''}`],
            [`Do I need a medical visa to see ${d.name} in India?`, `Most international patients travel on India's e-Medical Visa. Once the hospital confirms your treatment plan, we arrange the invitation letter and guide you through the application, free. Read our <a href="/travel-visa/">medical visa guide</a>.`],
        ];

        // [section title, html, short label for the "On this page" bar]
        const extra = [
            ...(quals.length || position ? [[`${d.name}'s Qualifications & Experience`, `
                        <p>${esc(d.name)}, ${esc(roleIn)}${esc(exp)}.</p>${quals.length ? `
                        <ul class="dt-list">${quals.map(q => `
                            <li>${svg('check')}<span>${esc(q)}</span></li>`).join('')}
                        </ul>` : ''}${position ? `
                        <p><b>Current position:</b> ${esc(position)}</p>` : ''}`, 'Qualifications']] : []),
            [`Consult ${d.name} from Abroad`, `
                        <p>How Shifara Health connects international patients with ${esc(d.name)}, ${esc(roleIn)}.</p>
                        <div class="dt-steps">${steps.map(([t, p], i) => `
                            <div class="dt-step"><span>${String(i + 1).padStart(2, '0')}</span>
                                <div><b>${esc(t)}</b><p>${esc(p)}</p></div></div>`).join('')}
                        </div>`, 'Consult from abroad'],
            ...(treatments.length ? [['Treatment Costs in India', `
                        <p>Indicative package costs in India at Shifara partner hospitals. Your written estimate depends on your reports.</p>
                        <div class="dt-cost">
                            <table>
                                <thead><tr><th>Treatment</th><th>Indicative cost (USD)</th></tr></thead>
                                <tbody>${treatments.map(t => `
                                    <tr><td><a href="${link.treatment(t.id)}">${esc(t.name)}</a></td><td>${esc(t.cost)}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>`, 'Costs']] : []),
            [`FAQs about ${d.name}`, faqs.map(([q, a]) => `
                        <details class="dt-faq">
                            <summary>${esc(q)}</summary>
                            <p>${a}</p>
                        </details>`).join(''), 'FAQs'],
        ];

        const crumbs = [['Doctors', listUrl('doctors')], ...(dept ? [[deptBy[dept]?.noun + ' doctors', listUrl('doctors', { department: dept })]] : [])];
        const org = { '@type': 'Organization', '@id': SITE + '/#organization', name: 'Shifara Health', url: SITE + '/', logo: SITE + '/assets/images/logo/shifara-logo.png' };
        const head = `    <meta name="author" content="Shifara Health">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="Shifara Health">
    <meta property="og:locale" content="en_IN">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${esc(SITE + encodeURI(d.image || '/assets/images/logo/shifara-logo.png'))}">
    <meta name="twitter:card" content="summary">
    ${jsonLd({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage', '@id': url + '#webpage', url, name: title, description, inLanguage: 'en-IN',
                about: { '@id': url + '#physician' }, breadcrumb: { '@id': url + '#breadcrumb' },
                ...(d.image ? { primaryImageOfPage: SITE + encodeURI(d.image) } : {}),
                author: { '@id': org['@id'] }, publisher: { '@id': org['@id'] },
            },
            org,
            {
                '@type': 'Physician', '@id': url + '#physician', name: d.name, url, description,
                ...(d.image ? { image: SITE + encodeURI(d.image) } : {}),
                medicalSpecialty: [...new Set(depts.map(s => SPECIALTY[s]).filter(Boolean))].map(s => 'https://schema.org/' + s),
                ...(expertise.length ? { knowsAbout: expertise } : {}),
                ...(h ? { hospitalAffiliation: { '@type': 'Hospital', name: h.name, url: SITE + link.hospital(h.id) } } : {}),
                address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'IN' },
            },
            {
                '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
                itemListElement: [['Home', '/'], ...crumbs, [d.name, `/doctor/${d.id}/`]].map(([name, p], i) =>
                    ({ '@type': 'ListItem', position: i + 1, name, item: SITE + p })),
            },
            {
                '@type': 'FAQPage',
                mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a) } })),
            },
        ],
    })}
`;

        const main = `
        <section class="dt-hero">
            <div class="container">
                ${crumb([...crumbs, [d.name]])}
                <div class="dt-head dt-head-doc">
                    <div class="dt-photo">${photo}</div>
                    <div class="min-w-0">
                        <h1>${esc(d.name)} <span class="dt-h1-role">${esc(roleIn)}</span></h1>
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
                            <span class="dt-hosp-logo">${logo(h, '')}</span>
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
            ${related(sameRole.length ? `More ${role}s in India` : `More ${deptBy[dept]?.noun || ''} specialists in India`, peers.map(doctorCard), listUrl('doctors', { department: peerDept }), 'View all')}
            ${ctaBand('Want a second opinion first?', 'Share your reports and get a free opinion from a senior specialist before you travel.', d.name)}
        </div>`;
        return { title, description, main, head };
    }

    // ---------- Treatment ----------
    function treatment(t, x) {
        const dept = t.department;
        const cost = x.cost;
        const hosps = top(D.hospitals.filter(h => h.departments.includes(dept)), 3, byDoctors);
        const docs = top(D.doctors.filter(d => d.departments.includes(dept)), 3, byExperience);
        const others = D.treatments.filter(o => o.department === dept && o.id !== t.id).slice(0, 4);
        const intro = x.sections?.[0]?.blocks?.find(b => b.t === 'p')?.text;
        const navTitles = [...(x.sections || []).map(s => s.title), ...(x.steps?.length ? ['Your journey'] : []), ...(cost ? ['Cost'] : [])];

        const main = `
        <section class="dt-hero dt-hero-treat">
            <div class="container">
                <div class="row g-4 align-items-center">
                    <div class="col-lg-7">
                        ${crumb([['Treatments', listUrl('treatments')], [deptName(dept), listUrl('treatments', { department: dept })], [t.name]])}
                        <span class="dt-badge">${esc(deptName(dept))}</span>
                        <h1>${esc(t.name)}</h1>
                        ${x.tagline ? `<p class="dt-tagline">${esc(x.tagline)}</p>` : ''}
                        ${t.cost ? `<div class="dt-price"><small>Starting from</small><b>${esc(startingPrice(t.cost))}</b><span>Package range ${esc(t.cost)} · indicative</span></div>` : ''}
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
                                <p class="dt-quote-sub">Upfront cost estimate &amp; specialist options for ${esc(t.name)}</p>
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
                        <div class="dt-sec-img${i % 2 ? ' order-md-last' : ''}"><img src="${esc(s.img)}" alt="" loading="lazy"></div>` : ''}
                        <div class="dt-sec-text">
                            <h2>${esc(s.title)}</h2>${blocksHtml(s.blocks)}
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
                        <h2>${esc(cost.title)}</h2>${cost.intro ? `
                        <p>${esc(cost.intro)}</p>` : ''}
                        <div class="dt-cost">
                            <table>
                                <thead><tr><th>Procedure</th><th>Indicative cost (USD)</th></tr></thead>
                                <tbody>${cost.rows.map(([p, c]) => `
                                    <tr><td>${esc(p)}</td><td>${esc(c)}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>${cost.note ? `
                        <p class="dt-cost-note">${esc(cost.note)}</p>` : ''}
                    </section>` : ''}
                </div>
                <div class="col-lg-4">
                    <aside class="dt-side">
                        <div class="dt-glance">
                            <h3>At a glance</h3>
                            <div><small>Department</small><a href="${listUrl('treatments', { department: dept })}">${esc(deptName(dept))}</a></div>
                            ${t.cost ? `<div><small>Indicative cost</small><b>${esc(t.cost)}</b></div>` : ''}
                            <div><small>Partner hospitals</small><a href="${listUrl('hospitals', { treatment: t.id })}">${D.hospitals.filter(h => h.departments.includes(dept)).length} hospitals</a></div>
                            <div><small>Specialists</small><a href="${listUrl('doctors', { treatment: t.id })}">${D.doctors.filter(d => d.departments.includes(dept)).length} doctors</a></div>
                        </div>${quoteBox(t.name, 'dtSideQuote')}
                    </aside>
                </div>
            </div>
            ${related(`Hospitals for ${t.name}`, hosps.map(hospitalCard), listUrl('hospitals', { treatment: t.id }), 'All hospitals')}
            ${related(`${deptBy[dept]?.noun || ''} specialists`, docs.map(doctorCard), listUrl('doctors', { treatment: t.id }), 'All doctors')}
            ${related('Related treatments', others.map(treatmentCard), listUrl('treatments', { department: dept }), 'View all', 'row-cols-1 row-cols-sm-2 row-cols-lg-4')}
            ${ctaBand(`Planning ${t.name} in India?`, 'Tell us about your condition and we will send a treatment plan and cost estimate within 48 hours, free.', t.name)}
        </div>`;
        return {
            title: `${t.name} in India: cost, hospitals & doctors`,
            description: clip(x.tagline ? `${x.tagline} ${intro || ''}` : intro || `${t.name} in India: indicative cost, partner hospitals and specialists.`),
            main,
        };
    }

    return { hospital, doctor, treatment };
};
