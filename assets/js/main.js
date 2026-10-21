// Shifara Health - homepage scripts (needs Bootstrap 5.3 bundle loaded first).
// Duplicate marquee items for a seamless loop
document.querySelectorAll('.track').forEach(t => {
    t.querySelectorAll('.lg').forEach(a => {
        const c = a.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.tabIndex = -1;
        t.appendChild(c);
    });
});

// Close the mobile menu after tapping a link
document.querySelectorAll('#mainNav a:not(.dropdown-toggle)').forEach(a => a.addEventListener('click', () => {
    const nav = document.getElementById('mainNav');
    if (nav.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(nav).hide();
}));

// Multi-step quote form
const lead = {};
document.querySelectorAll('#treatChips .chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('#treatChips .chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    lead.treatment = c.textContent;
}));
function qcNext(n) {
    document.querySelectorAll('.qc-step').forEach(s => s.classList.toggle('on', +s.dataset.step === n));
    document.querySelectorAll('.steps-dots span').forEach((d, i) => d.classList.toggle('on', i < n));
}
function qcSubmit() {
    const name = document.getElementById('qcName'), phone = document.getElementById('qcPhone');
    if (!name.value.trim()) { name.focus(); return; }
    if (!phone.value.trim()) { phone.focus(); return; }
    // DPDP Act: no submission without explicit consent
    const consent = document.getElementById('qcConsent');
    if (!consent.checked) { consent.reportValidity(); return; }
    Object.assign(lead, {
        country: document.getElementById('qcCountry').value,
        when: document.getElementById('qcWhen').value,
        note: document.getElementById('qcNote').value,
        name: name.value, phone: phone.value,
        email: document.getElementById('qcEmail').value
    });
    // TODO: send `lead` (with consent: true and a timestamp, as proof of consent) to the CRM / form endpoint
    qcNext(4);
}

// Contact form
function formSubmit(e) {
    e.preventDefault();
    // TODO: send to the CRM / form endpoint
    document.getElementById('formFields').classList.add('d-none');
    document.getElementById('formOk').classList.add('on');
    return false;
}

// Cost tabs
document.querySelectorAll('#costTabs .tab-btn').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('#costTabs .tab-btn').forEach(x => x.classList.remove('on'));
    t.classList.add('on');
    const f = t.dataset.f;
    document.querySelectorAll('.cc-col').forEach(c => c.classList.toggle('d-none', f !== 'all' && c.dataset.c !== f));
}));

// Countries: [ISO code, name, region]
const COUNTRIES = [
    ['bd', 'Bangladesh', 'sa'], ['ng', 'Nigeria', 'af'], ['om', 'Oman', 'me'], ['ae', 'UAE', 'me'],
    ['kw', 'Kuwait', 'me'], ['ir', 'Iran', 'me'], ['iq', 'Iraq', 'me'], ['sa', 'Saudi Arabia', 'me'],
    ['qa', 'Qatar', 'me'], ['bh', 'Bahrain', 'me'], ['ye', 'Yemen', 'me'],
    ['ke', 'Kenya', 'af'], ['et', 'Ethiopia', 'af'], ['tz', 'Tanzania', 'af'], ['ug', 'Uganda', 'af'],
    ['sd', 'Sudan', 'af'], ['gh', 'Ghana', 'af'], ['so', 'Somalia', 'af'],
    ['np', 'Nepal', 'sa'], ['lk', 'Sri Lanka', 'sa'], ['mv', 'Maldives', 'sa'], ['af', 'Afghanistan', 'sa'], ['mm', 'Myanmar', 'sa'],
    ['uz', 'Uzbekistan', 'ca'], ['kz', 'Kazakhstan', 'ca'], ['tj', 'Tajikistan', 'ca'], ['tm', 'Turkmenistan', 'ca'], ['kg', 'Kyrgyzstan', 'ca'], ['ru', 'Russia', 'ca']
];
const ctryGrid = document.getElementById('ctryGrid');
if (ctryGrid) {
    COUNTRIES.forEach(([code, name, region]) => {
        const col = document.createElement('div');
        col.className = 'col';
        col.dataset.r = region;
        col.innerHTML = `<a href="#" class="ct"><span class="flag"><img src="/assets/images/flags/${code}.png" alt="${name} flag" loading="lazy"></span><b>${name}</b><small class="d-none d-md-inline-flex">Visa guide <svg class="i" style="width:13px;height:13px"><use href="#arrow"/></svg></small></a>`;
        ctryGrid.appendChild(col);
    });
    document.querySelectorAll('#ctryTabs .ctab').forEach(t => t.addEventListener('click', () => {
        document.querySelectorAll('#ctryTabs .ctab').forEach(x => x.classList.remove('on'));
        t.classList.add('on');
        const r = t.dataset.r;
        ctryGrid.querySelectorAll('.col').forEach(c => c.classList.toggle('d-none', r !== 'all' && c.dataset.r !== r));
    }));
}

// ---------- Site search (modelled on vaidam.com) ----------
(() => {
    const U = '/assets/images/';
    // Static index from the homepage; the full catalog (assets/data/catalog.js) is merged in on first open.
    let INDEX = [
        ...[['Cardiac Sciences', 'heart', 'Bypass, valve, angioplasty', 'cardiology'], ['Oncology', 'onco', 'Surgery, chemo, radiation', 'oncology'],
        ['Orthopaedics', 'bone', 'Knee, hip, sports injuries', 'orthopedics'], ['Neurosciences', 'brain', 'Brain tumour, epilepsy, stroke', 'neurology'],
        ['IVF & Fertility', 'baby', 'IVF, ICSI, egg freezing', 'ivf'], ['Cosmetic Surgery', 'spark', 'Hair transplant, rhinoplasty', 'cosmetic'],
        ['Ophthalmology', 'eye', 'LASIK, cataract, retina', 'ophthalmology'], ['Dental Care', 'tooth', 'Implants, veneers, smile design', 'dental'],
        ['Organ Transplant', 'liver', 'Liver, kidney, bone marrow', 'transplant'], ['Spine Surgery', 'spine', 'Disc, fusion, scoliosis', 'spine-surgery'],
        ['Urology & Nephrology', 'kidney', 'Kidney stones, dialysis, prostate', 'urology'], ['Gastroenterology', 'stomach', 'Liver, GI, endoscopy', 'gastroenterology'],
        ['Bariatric Surgery', 'scale', 'Weight-loss surgery', 'bariatric'], ['Gynaecology', 'female', 'Hysterectomy, fibroids', 'gynecology'],
        ['Paediatrics', 'child', "Children's surgery and care", 'pediatrics'], ['ENT', 'ear', 'Ear, nose and throat', 'ent']]
            .map(([t, ic, sub, dept]) => ({ type: 'Specialities', title: t, sub: sub + ' · hospitals & doctors', icon: ic, href: '/hospitals/' + dept + '/' })),
        ...[['Coronary Artery Bypass (CABG)', '$5,500 – $8,500', 'heart'], ['Total Knee Replacement', '$5,500 – $8,000', 'bone'],
        ['Liver Transplant', '$28,000 – $40,000', 'liver'], ['IVF Cycle', '$2,500 – $4,500', 'baby'],
        ['Brain Tumour Surgery', '$8,000 – $18,000', 'brain'], ['Hair Transplant', '$1,800 – $3,500', 'spark'],
        ['Dental Implants', '$800 – $2,000', 'tooth'], ['LASIK (both eyes)', '$900 – $2,500', 'eye']]
            .map(([t, price, ic]) => ({ type: 'Cost', title: t + ' cost', sub: 'Package in India: ' + price, icon: ic, href: '#cost' })),
        ...[['Apollo Hospitals', 'hospitals/apollo.png', 'Chennai · Delhi · Hyderabad'], ['Medanta', 'hospitals/medanta.png', 'Gurugram'],
        ['Fortis', 'hospitals/fortis.png', 'Delhi NCR'], ['Max Healthcare', 'hospitals/max-healthcare.png', 'Delhi NCR'],
        ['Manipal Hospitals', 'hospitals/manipal.jpg', 'Bangalore'], ['Artemis', 'hospitals/artemis.png', 'Gurugram'],
        ['Gleneagles', 'hospitals/gleneagles.jpg', 'Chennai · Mumbai'], ['Rela Hospital', 'hospitals/rela.png', 'Chennai'],
        ['Marengo', 'hospitals/marengo.png', 'Gurugram'], ['Shalby', 'hospitals/shalby.png', 'Ahmedabad'],
        ['Nanavati Max', 'hospitals/nanavati-max.png', 'Mumbai'], ['Wockhardt', 'hospitals/wockhardt.png', 'Mumbai'],
        ['HCG', 'hospitals/hcg.jpg', 'Bangalore'], ['Medicover Fertility', 'hospitals/medicover-fertility.jpg', 'Delhi NCR'],
        ['Venkateshwar Hospital', 'hospitals/venkateshwar.jpg', 'Delhi'],
        ['Prime Super Speciality Hospital', 'hospitals/prime-super-speciality.jpg', 'India'],
        ['World IVF Infertility Centre', 'hospitals/world-ivf.jpg', 'India']]
            .map(([t, img, sub]) => ({ type: 'Hospitals', title: t, sub: 'JCI / NABH accredited · ' + sub, img: U + img, href: '/hospitals/?q=' + encodeURIComponent(t.split(' ')[0]) })),
        ...[['Medical Tourism', 'globe', 'End-to-end treatment travel'], ['Step-Down Care', 'home', 'Supervised recovery stays'],
        ['Nurses & Caregivers', 'nurse', 'Hospital, hotel or home'], ['Concierge Desk', 'bell', 'Food, prayer, sightseeing'],
        ['Video Consultation', 'video', 'Talk to a specialist first'], ['Air Ambulance', 'amb', 'ICU-equipped transfers'],
        ['Medical Visa Assistance', 'doc', 'e-Medical visa letter and guidance']]
            .map(([t, ic, sub]) => ({ type: 'Services', title: t, sub, icon: ic, href: '#services' })),
        ...COUNTRIES.map(([code, name]) => ({ type: 'Countries', title: name, sub: 'Visa guide & travel support', flag: '/assets/images/flags/' + code + '.png', href: '#countries' })),
        ...[['Treatment Guide for Nigerian Patients', 'Country guide', 'https://shifarahealth.com/treatment-guide-for-nigerian-patients/'],
        ["7 Reasons Why You Shouldn't Ignore Knee Pain", 'Joint health', 'https://shifarahealth.com/7-reasons-why-you-shouldnt-ignore-knee-pain/'],
        ['India e-Medical Visa: A Step-by-Step Guide', 'Visa & travel', '#blog'],
        ["Heart Bypass Cost in India: What's Included", 'Cost guide', '#blog']]
            .map(([t, sub, href]) => ({ type: 'Articles', title: t, sub, icon: 'doc', href }))
    ];
    const TRENDING = ['Knee replacement', 'Heart bypass', 'IVF', 'Liver transplant', 'Cancer treatment', 'Hair transplant'];
    const ALIASES = { cardiologist: 'cardiology', oncologist: 'oncology', neurologist: 'neurology', cancer: 'oncology', heart: 'cardiac', knee: 'orthopaedics knee', bypass: 'cabg', kidney: 'urology nephrology transplant', eye: 'ophthalmology lasik', teeth: 'dental', tooth: 'dental', weight: 'bariatric', visa: 'medical visa', baby: 'ivf fertility', child: 'paediatrics', women: 'gynaecology', hair: 'hair transplant cosmetic' };
    const LIMIT = 4;

    const modalEl = document.getElementById('searchModal');
    const input = document.getElementById('smInput');
    const body = document.getElementById('smBody');
    const clearBtn = document.getElementById('smClear');
    let filter = 'all', expanded = null, active = -1;

    const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const svg = id => `<svg><use href="#${id}" /></svg>`;
    const recent = {
        get() { try { return JSON.parse(localStorage.getItem('shifaraRecent') || '[]'); } catch (e) { return []; } },
        add(q) { try { const r = [q, ...this.get().filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 6); localStorage.setItem('shifaraRecent', JSON.stringify(r)); } catch (e) { } }
    };

    function highlight(text, q) {
        const t = esc(text);
        if (!q) return t;
        const words = q.split(/\s+/).filter(Boolean).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return words.length ? t.replace(new RegExp('(' + words.join('|') + ')', 'gi'), '<mark>$1</mark>') : t;
    }

    function search(q) {
        const words = q.toLowerCase().split(/\s+/).filter(Boolean);
        const expand = words.map(w => w + ' ' + (ALIASES[w] || ''));
        return INDEX.filter(it => filter === 'all' || it.type === filter).map(it => {
            const hay = (it.title + ' ' + it.sub + ' ' + it.type + ' ' + (it.icon || '')).toLowerCase();
            let score = 0;
            for (const w of expand) {
                const opts = w.split(' ').filter(Boolean);
                const hit = opts.find(o => hay.includes(o));
                if (!hit) return null;
                score += it.title.toLowerCase().startsWith(hit) ? 3 : it.title.toLowerCase().includes(hit) ? 2 : 1;
            }
            return { it, score };
        }).filter(Boolean).sort((a, b) => b.score - a.score).map(r => r.it);
    }

    // Merge the full catalog: real hospitals, doctors and treatments.
    let catalogState = window.SHIFARA ? 'ready' : 'idle';
    function mergeCatalog() {
        const S = window.SHIFARA;
        if (!S || INDEX.some(it => it.type === 'Doctors')) return;
        const city = Object.fromEntries(S.cities.map(c => [c.slug, c.name]));
        const dept = Object.fromEntries(S.departments.map(d => [d.slug, d.name]));
        INDEX = [
            ...INDEX.filter(it => it.type !== 'Hospitals'),
            ...S.hospitals.map(h => ({ type: 'Hospitals', title: h.name, sub: h.address || city[h.city], img: h.logo, href: '/hospital/' + h.id + '/' })),
            ...S.treatments.map(t => ({ type: 'Treatments', title: t.name, sub: [dept[t.department], t.cost && 'from ' + t.cost.split(/[–-]/)[0].trim()].filter(Boolean).join(' · '), icon: 'doc', href: '/treatment/' + t.id + '/' })),
            ...S.doctors.map(d => ({ type: 'Doctors', title: d.name, sub: [d.speciality, d.hospital, city[d.city]].filter(Boolean).join(' · '), img: d.image, icon: 'user', href: '/doctor/' + d.id + '/' })),
        ];
    }
    function loadCatalog() {
        if (catalogState === 'ready') { mergeCatalog(); return; }
        if (catalogState === 'loading') return;
        catalogState = 'loading';
        const s = document.createElement('script');
        s.src = '/assets/data/catalog.js';
        s.onload = () => { catalogState = 'ready'; mergeCatalog(); render(); };
        s.onerror = () => { catalogState = 'idle'; };
        document.head.appendChild(s);
    }

    // Homepage anchors (#cost, #spec…) point back to the homepage when used on other pages.
    const resolve = href => href.startsWith('#') && !document.querySelector(href) ? '/' + href : href;

    function itemHtml(it, q) {
        const ic = it.img ? `<img src="${it.img}" alt="" loading="lazy">` : it.flag ? `<img class="flag" src="${it.flag}" alt="" loading="lazy">` : svg(it.icon);
        return `<a class="sm-item" href="${resolve(it.href)}"><span class="sm-ic">${ic}</span><span><b>${highlight(it.title, q)}</b><small>${esc(it.sub)}</small></span><span class="sm-go">${svg('arrow')}</span></a>`;
    }

    function chips(list, icon) {
        return `<div class="d-flex flex-wrap gap-2">${list.map(t => `<button type="button" class="sm-chip" data-q="${esc(t)}">${svg(icon)}${esc(t)}</button>`).join('')}</div>`;
    }

    function render() {
        const q = input.value.trim();
        clearBtn.classList.toggle('d-none', !q);
        active = -1;
        if (!q) {
            const r = recent.get();
            body.innerHTML = (r.length ? `<div class="sm-group"><span class="sm-label">Recent searches</span>${chips(r, 'clock')}</div>` : '')
                + `<div class="sm-group"><span class="sm-label">Trending</span>${chips(TRENDING, 'trend')}</div>`;
            return;
        }
        const res = search(q);
        if (!res.length) {
            body.innerHTML = `<div class="sm-empty"><div class="ico">${svg('search')}</div>
                <p class="fw-bold text-dark mb-1">No results for “${esc(q)}”</p>
                <p class="small text-secondary mb-4">Try a shorter query or different spelling${filter !== 'all' ? ', or <button type="button" class="btn-link border-0 bg-transparent p-0 text-decoration-underline" id="smAll" style="color:var(--coral)">search all categories</button>' : ''}.</p>
                <span class="sm-label">Try trending</span><div class="d-flex justify-content-center">${chips(TRENDING, 'trend')}</div></div>`;
            return;
        }
        const groups = {};
        res.forEach(it => (groups[it.type] = groups[it.type] || []).push(it));
        body.innerHTML = Object.entries(groups).map(([type, list]) => {
            const show = (filter !== 'all' || expanded === type) ? list : list.slice(0, LIMIT);
            const more = list.length > show.length ? `<button type="button" class="sm-viewall" data-type="${type}">View all ${list.length} →</button>` : '';
            return `<div class="sm-group"><div class="sm-group-head"><span class="sm-label">${type}</span>${more}</div>${show.map(it => itemHtml(it, q)).join('')}</div>`;
        }).join('');
    }

    function setFilter(t) {
        filter = t; expanded = null;
        document.querySelectorAll('#smFilters .sm-filter').forEach(b => b.classList.toggle('on', b.dataset.t === t));
        render();
    }

    input.addEventListener('input', () => { expanded = null; render(); });
    clearBtn.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
    document.getElementById('smFilters').addEventListener('click', e => { const b = e.target.closest('.sm-filter'); if (b) { setFilter(b.dataset.t); input.focus(); } });
    body.addEventListener('click', e => {
        const chip = e.target.closest('.sm-chip');
        if (chip) { input.value = chip.dataset.q; recent.add(chip.dataset.q); render(); input.focus(); return; }
        const more = e.target.closest('.sm-viewall');
        if (more) { setFilter(more.dataset.type); return; }
        if (e.target.id === 'smAll') { setFilter('all'); return; }
        const item = e.target.closest('.sm-item');
        if (item) {
            if (input.value.trim()) recent.add(input.value.trim());
            if (item.getAttribute('href').startsWith('#')) bootstrap.Modal.getInstance(modalEl).hide();
        }
    });
    input.addEventListener('keydown', e => {
        const items = [...body.querySelectorAll('.sm-item')];
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (!items.length) return;
            e.preventDefault();
            active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items.forEach((el, i) => el.classList.toggle('active', i === active));
            items[active].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            const target = items[active >= 0 ? active : 0];
            if (target) { e.preventDefault(); target.click(); }
        }
    });
    modalEl.addEventListener('show.bs.modal', () => { loadCatalog(); render(); });
    modalEl.addEventListener('shown.bs.modal', () => input.focus());

    // "/" or Ctrl/Cmd+K opens search
    document.addEventListener('keydown', e => {
        const typing = /input|textarea|select/i.test(document.activeElement.tagName);
        if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
            e.preventDefault();
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
    });
})();

// Reveal on scroll + compare bars
const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    if (en.target.id === 'compare') en.target.querySelectorAll('.t i').forEach(i => i.style.width = i.dataset.w + '%');
    io.unobserve(en.target);
}), { threshold: .12 });
document.querySelectorAll('.rv, #compare').forEach(el => io.observe(el));
