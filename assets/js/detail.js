// Shifara Health - detail pages (hospital, doctor, treatment).
// Needs catalog.js and cards.js. The page picks its type with <main data-detail="hospital|doctor|treatment">
// and the record from the path (/hospital/<id>, /doctor/<id>, /treatment/<id>; ?id= also works).
// Long-form content loads from /assets/data/details/<kind>/<id>.js.
(() => {
    const UI = window.ShifaraUI;
    const root = document.querySelector('[data-detail]');
    if (!UI || !root) return;

    const { D, HOME, esc, svg, deptName, cityName, deptBy, hospBy, treatBy, docBy, link, listUrl, wa, startingPrice, initials,
        hospitalCard, doctorCard, treatmentCard } = UI;
    const KIND = root.dataset.detail;
    const LIST = { hospital: 'hospitals', doctor: 'doctors', treatment: 'treatments' }[KIND];
    const id = new URLSearchParams(location.search).get('id') || UI.pathId();
    const base = { hospital: hospBy, doctor: docBy, treatment: treatBy }[KIND][id];

    if (!base) {
        root.innerHTML = `<section class="dt-missing"><div class="container text-center">
            <div class="ico">${svg('search')}</div>
            <h1>We couldn't find that ${KIND}</h1>
            <p>The link may be old or mistyped. Browse the full list instead.</p>
            <a href="/${LIST}" class="btn btn-coral">View all ${LIST}</a></div></section>`;
        document.title = `Not found | Shifara Health`;
        return;
    }

    const s = document.createElement('script');
    s.src = `/assets/data/details/${LIST}/${encodeURIComponent(id)}.js`;
    s.onload = () => render(window.SHIFARA_DETAIL?.id === id ? window.SHIFARA_DETAIL : {});
    s.onerror = () => render({});
    document.head.appendChild(s);

    // ---------- Shared pieces ----------
    const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const top = (list, n, sort) => [...list].sort(sort).slice(0, n);
    const byDoctors = (a, b) => b.doctors - a.doctors;
    const byExperience = (a, b) => (b.experience || 0) - (a.experience || 0);

    function crumb(items) {
        return `<nav class="lp-crumb dt-crumb" aria-label="Breadcrumb"><a href="${HOME}">Home</a>` +
            items.map(([label, href]) => `<span>/</span>${href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`}`).join('') +
            '</nav>';
    }

    function blocksHtml(blocks) {
        let out = '', list = [];
        const flush = () => {
            if (list.length) out += `<ul class="dt-list">${list.join('')}</ul>`;
            list = [];
        };
        for (const b of blocks) {
            if (b.t === 'li') {
                list.push(`<li>${svg('check')}<span>${b.lead ? `<b>${esc(b.lead)}</b> ` : ''}${esc(b.text)}</span></li>`);
            } else {
                flush();
                out += b.t === 'h' ? `<h3 class="dt-h3">${esc(b.text)}</h3>` : `<p>${esc(b.text)}</p>`;
            }
        }
        flush();
        return out;
    }

    // Lists whose items all have a bold lead read better as cards
    function leadCards(blocks) {
        const lis = blocks.filter(b => b.t === 'li' && b.lead);
        if (lis.length < 2 || lis.length !== blocks.filter(b => b.t === 'li').length) return null;
        const intro = blocks.filter(b => b.t !== 'li');
        return blocksHtml(intro) + `<div class="row row-cols-1 row-cols-md-2 g-3">${lis.map(b => `
            <div class="col"><div class="dt-card"><span class="dt-card-ic">${svg('check')}</span>
            <div><b>${esc(b.lead)}</b><p>${esc(b.text)}</p></div></div></div>`).join('')}</div>`;
    }

    function section(title, inner, extraClass = '') {
        return `<section class="dt-sec ${extraClass}" id="sec-${slug(title)}"><h2>${esc(title)}</h2>${inner}</section>`;
    }

    function tabSections(tabs, special = {}) {
        return tabs.map(t => section(t.title, (special[t.title] || leadCards)(t.blocks) || blocksHtml(t.blocks))).join('');
    }

    function subnav(titles) {
        return `<nav class="dt-subnav" aria-label="On this page"><div class="dt-subnav-inner">${titles.map(t =>
            `<a href="#sec-${slug(t)}">${esc(t)}</a>`).join('')}</div></nav>`;
    }

    function quoteBox(subject) {
        return `<div class="dt-quote" id="dtQuote">
            <form class="dt-quote-form">
                <span class="dt-quote-kicker">100% free · reply within 24 hrs</span>
                <h3>Get a free quote</h3>
                <p class="dt-quote-sub">for ${esc(subject)}</p>
                <div class="d-grid gap-2">
                    <input class="form-control" name="name" required placeholder="Full name" aria-label="Full name">
                    <input class="form-control" name="phone" type="tel" required placeholder="WhatsApp / phone with country code" aria-label="Phone">
                    <input class="form-control" name="country" placeholder="Country" aria-label="Country">
                    <textarea class="form-control" name="message" rows="2" placeholder="Briefly describe the condition (optional)" aria-label="Message"></textarea>
                    <button class="btn btn-coral w-100" type="submit">Request free quote ${svg('arrow', 'i')}</button>
                </div>
                <p class="dt-quote-note">${svg('shield')}Your reports are shared only with hospitals you approve.</p>
            </form>
            <div class="dt-quote-ok d-none">
                <div class="ok-ico">${svg('check', 'i')}</div>
                <h3>Request received</h3>
                <p class="dt-quote-sub">A case manager will contact you within 24 hours.</p>
            </div>
            <a class="btn btn-wa w-100 mt-3" target="_blank" rel="noopener" href="${wa(`Hi Shifara, I want a quote for ${subject}`)}">${svg('wa', 'i')} Chat on WhatsApp</a>
        </div>`;
    }

    function related(title, cards, allHref, allLabel, cols = 'row-cols-1 row-cols-md-2 row-cols-xl-3') {
        if (!cards.length) return '';
        return `<section class="dt-related">
            <div class="dt-related-head"><h2>${esc(title)}</h2>${allHref ? `<a href="${allHref}" class="link-arrow">${esc(allLabel)} ${svg('arrow', 'i')}</a>` : ''}</div>
            <div class="row ${cols} g-3 g-lg-4">${cards.join('')}</div></section>`;
    }

    function ctaBand(title, text) {
        return `<section class="dt-cta"><div class="lp-cta d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div><h2>${esc(title)}</h2><p>${esc(text)}</p></div>
            <div class="d-flex flex-wrap gap-2"><a href="#dtQuote" class="btn btn-coral">Get free quote</a>
            <a href="${wa('Hi Shifara, I need help planning treatment in India')}" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} WhatsApp</a></div>
        </div></section>`;
    }

    function setMeta(title, desc) {
        document.title = `${title} | Shifara Health`;
        const m = document.querySelector('meta[name="description"]');
        if (m && desc) m.setAttribute('content', desc.slice(0, 160));
    }

    const firstText = tabs => (tabs?.[0]?.blocks || []).find(b => b.t === 'p')?.text || '';

    // ---------- Hospital ----------
    function renderHospital(x) {
        const h = base;
        const tabs = x.tabs || [];
        const docs = D.doctors.filter(d => d.hospitalId === h.id).sort(byExperience);
        const docDepts = [...new Set(docs.flatMap(d => d.departments))];
        const specialities = tabs.find(t => t.title === 'Specialities');
        const special = {
            Specialities: blocks => {
                const heads = blocks.filter(b => b.t === 'h');
                return heads.length ? `<div class="dt-spec-grid">${heads.map(b => `<div class="dt-spec">${svg('heart')}<span>${esc(b.text)}</span></div>`).join('')}</div>` + blocksHtml(blocks.filter(b => b.t !== 'h')) : null;
            },
        };
        setMeta(h.name, firstText(tabs) || `${h.name}, ${cityName(h.city)}: specialities, doctors and free cost estimates for international patients.`);
        const navTitles = [...tabs.map(t => t.title), ...(docs.length ? ['Doctors'] : [])];

        root.innerHTML = `
        <section class="dt-hero">
            <div class="container">
                ${crumb([['Hospitals', '/hospitals'], [cityName(h.city), listUrl('hospitals', { city: h.city })], [h.name]])}
                <div class="dt-head">
                    <div class="dt-logo"><img src="${esc(h.logo)}" alt="${esc(h.name)} logo"></div>
                    <div class="min-w-0">
                        <h1>${esc(h.name)}</h1>
                        <p class="dt-loc">${svg('pin')}${esc(h.address || cityName(h.city))}</p>
                        <div class="dt-facts">
                            ${x.established ? `<span>${svg('clock')}Established ${esc(x.established)}</span>` : ''}
                            <span>${svg('shield')}Accredited partner</span>
                            ${docs.length ? `<a href="#sec-doctors">${svg('user')}${docs.length} doctors</a>` : ''}
                            <span>${svg('heart')}${h.departments.length} specialities</span>
                        </div>
                    </div>
                </div>
                <div class="dt-actions">
                    <a href="#dtQuote" class="btn btn-coral">Get free quote ${svg('arrow', 'i')}</a>
                    <a href="${wa(`Hi Shifara, I want to know more about ${h.name}, ${cityName(h.city)}`)}" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} Message us</a>
                    ${docs.length ? `<a href="#sec-doctors" class="btn btn-ghost">View doctors</a>` : ''}
                </div>
            </div>
        </section>
        ${subnav(navTitles)}
        <div class="container dt-body">
            <div class="row g-4 g-xl-5">
                <div class="col-lg-8">
                    ${tabSections(tabs, special)}
                    ${!specialities ? section('Specialities', `<div class="lc-tags dt-tags">${h.departments.map(s => `<a href="${listUrl('doctors', { hospital: h.id, department: s })}">${esc(deptName(s))}</a>`).join('')}</div>`) : ''}
                    ${docs.length ? section('Doctors', `
                        <div class="dt-chips" id="dtDocChips">
                            <button type="button" class="on" data-d="">All (${docs.length})</button>
                            ${docDepts.map(s => `<button type="button" data-d="${s}">${esc(deptBy[s]?.noun || deptName(s))} (${docs.filter(d => d.departments.includes(s)).length})</button>`).join('')}
                        </div>
                        <div class="row row-cols-1 row-cols-md-2 g-3" id="dtDocGrid"></div>
                        <div class="text-center mt-4"><a id="dtDocAll" class="btn btn-ghost" href="${listUrl('doctors', { hospital: h.id })}">View all doctors ${svg('arrow', 'i')}</a></div>`) : ''}
                </div>
                <div class="col-lg-4"><aside class="dt-side">${quoteBox(h.name)}</aside></div>
            </div>
            ${related(`Other hospitals in ${cityName(h.city)}`, top(D.hospitals.filter(o => o.city === h.city && o.id !== h.id), 3, byDoctors).map(hospitalCard), listUrl('hospitals', { city: h.city }), `All hospitals in ${cityName(h.city)}`)}
            ${ctaBand('Not sure this is the right hospital?', 'Send your reports and we will compare up to 3 hospitals with written estimates, free.')}
        </div>`;

        if (docs.length) {
            const grid = root.querySelector('#dtDocGrid');
            const all = root.querySelector('#dtDocAll');
            const show = dept => {
                const list = docs.filter(d => !dept || d.departments.includes(dept));
                grid.innerHTML = list.slice(0, 6).map(doctorCard).join('');
                all.href = listUrl('doctors', { hospital: h.id, department: dept });
                all.innerHTML = `View all ${list.length} ${list.length === 1 ? 'doctor' : 'doctors'} ${svg('arrow', 'i')}`;
                all.classList.toggle('d-none', list.length <= 6);
            };
            root.querySelector('#dtDocChips').addEventListener('click', e => {
                const b = e.target.closest('button');
                if (!b) return;
                root.querySelectorAll('#dtDocChips button').forEach(x => x.classList.toggle('on', x === b));
                show(b.dataset.d);
            });
            show('');
        }
    }

    // ---------- Doctor ----------
    function renderDoctor(x) {
        const d = base;
        const tabs = x.tabs || [];
        const h = d.hospitalId ? hospBy[d.hospitalId] : null;
        const dept = d.departments[0];
        setMeta(`${d.name}, ${d.speciality}`, firstText(tabs) || `${d.name}: ${d.designation} at ${d.hospital}, ${cityName(d.city)}.`);
        const photo = d.image ? `<img src="${esc(d.image)}" alt="${esc(d.name)}">` : `<span class="lc-initials">${esc(initials(d.name))}</span>`;
        const peers = D.doctors.filter(o => o.id !== d.id && dept && o.departments.includes(dept));

        root.innerHTML = `
        <section class="dt-hero">
            <div class="container">
                ${crumb([['Doctors', '/doctors'], ...(dept ? [[deptBy[dept]?.noun + ' doctors', listUrl('doctors', { department: dept })]] : []), [d.name]])}
                <div class="dt-head dt-head-doc">
                    <div class="dt-photo">${photo}</div>
                    <div class="min-w-0">
                        <span class="lc-spec">${esc(d.speciality || 'Specialist')}</span>
                        <h1>${esc(d.name)}</h1>
                        <p class="dt-desig">${esc(d.designation)}</p>
                        <div class="dt-facts">
                            ${d.experience ? `<span>${svg('clock')}${d.experience}+ years experience</span>` : ''}
                            ${h ? `<a href="${link.hospital(h.id)}">${svg('home')}${esc(d.hospital)}</a>` : `<span>${svg('home')}${esc(d.hospital)}</span>`}
                            <span>${svg('pin')}${esc(cityName(d.city))}</span>
                            ${x.fee ? `<span class="dt-fee">${svg('video')}Video consultation: ${esc(x.fee)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="dt-actions">
                    <a href="#dtQuote" class="btn btn-coral">Book consultation ${svg('arrow', 'i')}</a>
                    <a href="${wa(`Hi Shifara, I want to consult ${d.name} (${d.hospital})`)}" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} Chat on WhatsApp</a>
                    <a href="#dtQuote" class="btn btn-ghost">${svg('video', 'i')} Video consultation</a>
                </div>
            </div>
        </section>
        ${subnav(tabs.map(t => t.title))}
        <div class="container dt-body">
            <div class="row g-4 g-xl-5">
                <div class="col-lg-8">${tabSections(tabs) || section('About the Doctor', `<p>${esc(d.designation)}</p>`)}</div>
                <div class="col-lg-4"><aside class="dt-side">
                    ${h ? `<a class="dt-hosp" href="${link.hospital(h.id)}">
                        <span class="dt-hosp-logo"><img src="${esc(h.logo)}" alt=""></span>
                        <span class="min-w-0"><small>Practises at</small><b>${esc(h.name)}</b><span>${esc(h.address || cityName(h.city))}</span></span>
                        ${svg('arrow', 'i')}</a>` : ''}
                    ${quoteBox(d.name)}
                </aside></div>
            </div>
            ${related(`More ${deptBy[dept]?.noun || ''} specialists`, top(peers, 3, byExperience).map(doctorCard), listUrl('doctors', { department: dept }), 'View all')}
            ${ctaBand('Want a second opinion first?', 'Share your reports and get a free opinion from a senior specialist before you travel.')}
        </div>`;
    }

    // ---------- Treatment ----------
    function renderTreatment(x) {
        const t = base;
        const dept = t.department;
        const cost = x.cost;
        const hosps = top(D.hospitals.filter(h => h.departments.includes(dept)), 3, byDoctors);
        const docs = top(D.doctors.filter(d => d.departments.includes(dept)), 3, byExperience);
        const others = D.treatments.filter(o => o.department === dept && o.id !== t.id).slice(0, 4);
        const intro = x.sections?.[0]?.blocks?.find(b => b.t === 'p')?.text;
        setMeta(`${t.name} in India: cost, hospitals & doctors`, x.tagline ? `${x.tagline} ${intro || ''}` : intro);
        const navTitles = [...(x.sections || []).map(s => s.title), ...(x.steps?.length ? ['Your journey'] : []), ...(cost ? ['Cost'] : [])];

        root.innerHTML = `
        <section class="dt-hero dt-hero-treat">
            <div class="container">
                <div class="row g-4 align-items-center">
                    <div class="col-lg-7">
                        ${crumb([['Treatments', '/treatments'], [deptName(dept), listUrl('treatments', { department: dept })], [t.name]])}
                        <span class="dt-badge">${esc(deptName(dept))}</span>
                        <h1>${esc(t.name)}</h1>
                        ${x.tagline ? `<p class="dt-tagline">${esc(x.tagline)}</p>` : ''}
                        ${t.cost ? `<div class="dt-price"><small>Starting from</small><b>${esc(startingPrice(t.cost))}</b><span>Package range ${esc(t.cost)} · indicative</span></div>` : ''}
                        <div class="dt-actions">
                            <a href="#dtQuote" class="btn btn-coral">Get free treatment plan ${svg('arrow', 'i')}</a>
                            <a href="${wa(`Hi Shifara, I need information about ${t.name} in India`)}" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} Talk to an advisor</a>
                        </div>
                    </div>
                    <div class="col-lg-5">${t.image ? `<div class="dt-hero-img"><img src="${esc(t.image)}" alt="${esc(t.name)}"></div>` : ''}</div>
                </div>
            </div>
        </section>
        ${subnav(navTitles)}
        <div class="container dt-body">
            <div class="row g-4 g-xl-5">
                <div class="col-lg-8">
                    ${(x.sections || []).map((s, i) => `<section class="dt-sec dt-sec-media" id="sec-${slug(s.title)}">
                        ${s.img ? `<div class="dt-sec-img ${i % 2 ? 'order-md-last' : ''}"><img src="${esc(s.img)}" alt="" loading="lazy"></div>` : ''}
                        <div class="dt-sec-text"><h2>${esc(s.title)}</h2>${blocksHtml(s.blocks)}</div></section>`).join('')}
                    ${x.steps?.length ? section('Your journey', `<p>How Shifara Health supports you from your first message to your return home.</p>
                        <div class="dt-steps">${x.steps.map((st, i) => `<div class="dt-step"><span>${String(i + 1).padStart(2, '0')}</span><div><b>${esc(st.title)}</b><p>${esc(st.text)}</p></div></div>`).join('')}</div>`) : ''}
                    ${cost ? `<section class="dt-sec" id="sec-cost"><h2>${esc(cost.title)}</h2>${cost.intro ? `<p>${esc(cost.intro)}</p>` : ''}
                        <div class="dt-cost"><table><thead><tr><th>Procedure</th><th>Indicative cost (USD)</th></tr></thead><tbody>
                        ${cost.rows.map(([p, c]) => `<tr><td>${esc(p)}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table></div>
                        ${cost.note ? `<p class="dt-cost-note">${esc(cost.note)}</p>` : ''}</section>` : ''}
                </div>
                <div class="col-lg-4"><aside class="dt-side">
                    <div class="dt-glance"><h3>At a glance</h3>
                        <div><small>Department</small><a href="${listUrl('treatments', { department: dept })}">${esc(deptName(dept))}</a></div>
                        ${t.cost ? `<div><small>Indicative cost</small><b>${esc(t.cost)}</b></div>` : ''}
                        <div><small>Partner hospitals</small><a href="${listUrl('hospitals', { treatment: t.id })}">${D.hospitals.filter(h => h.departments.includes(dept)).length} hospitals</a></div>
                        <div><small>Specialists</small><a href="${listUrl('doctors', { treatment: t.id })}">${D.doctors.filter(d => d.departments.includes(dept)).length} doctors</a></div>
                    </div>
                    ${quoteBox(t.name)}
                </aside></div>
            </div>
            ${related(`Top hospitals for ${t.name}`, hosps.map(hospitalCard), listUrl('hospitals', { treatment: t.id }), 'All hospitals')}
            ${related(`${deptBy[dept]?.noun || ''} specialists`, docs.map(doctorCard), listUrl('doctors', { treatment: t.id }), 'All doctors')}
            ${related('Related treatments', others.map(treatmentCard), listUrl('treatments', { department: dept }), 'View all', 'row-cols-1 row-cols-sm-2 row-cols-lg-4')}
            ${ctaBand(`Planning ${t.name} in India?`, 'Tell us about your condition and we will send a treatment plan and cost estimate within 48 hours, free.')}
        </div>`;
    }

    // ---------- Render + behaviour ----------
    function render(x) {
        ({ hospital: renderHospital, doctor: renderDoctor, treatment: renderTreatment })[KIND](x);

        root.querySelectorAll('.dt-quote-form').forEach(f => f.addEventListener('submit', e => {
            e.preventDefault();
            // TODO: send the enquiry (with the page subject) to the CRM / form endpoint
            f.classList.add('d-none');
            f.nextElementSibling.classList.remove('d-none');
        }));

        // highlight the section in view in the sticky sub-nav
        const links = [...root.querySelectorAll('.dt-subnav a')];
        if (!links.length) return;
        const io = new IntersectionObserver(entries => entries.forEach(en => {
            if (!en.isIntersecting) return;
            links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
        }), { rootMargin: '-140px 0px -60% 0px' });
        links.forEach(a => { const sec = root.querySelector(a.getAttribute('href')); if (sec) io.observe(sec); });
        links[0].classList.add('on');
    }
})();
