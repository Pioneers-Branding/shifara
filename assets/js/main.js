// Shifara Health - homepage scripts (needs Bootstrap 5.3 bundle loaded first).
// Site root from this script's URL (…/assets/js/main.js): works at a domain root, in a subfolder or from disk.
const BASE = window.SHIFARA_BASE = new URL('../../', document.currentScript.src).pathname;

// Opened from disk (file://) there is no server to turn a folder link into its index.html
if (location.protocol === 'file:') document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target || !a.href.startsWith('file:')) return;
    const url = new URL(a.href);
    if (url.pathname.endsWith('/')) { url.pathname += 'index.html'; a.href = url.href; }
});

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

// Multi-step quote form (homepage): the picked chip goes in the hidden "treatment" field
document.querySelectorAll('#treatChips .chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('#treatChips .chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    document.getElementById('qcTreat').value = c.textContent;
}));
function qcNext(n) {
    document.querySelectorAll('.qc-step').forEach(s => s.classList.toggle('on', +s.dataset.step === n));
    document.querySelectorAll('.steps-dots span').forEach((d, i) => d.classList.toggle('on', i < n));
}

// Every enquiry form ends on the thank-you page (one URL to track conversions on)
function thankYou(type) {
    location.href = BASE + 'thank-you/' + (type ? '?type=' + type : '');
}

// Enquiry forms post to Formester (the <form action>). Sent in the background so the visitor lands on our
// own thank-you page; if that fails, the form is posted the normal way instead.
function setField(form, name, value) {
    const el = form.querySelector(`input[type="hidden"][name="${name}"]`) || form.appendChild(Object.assign(document.createElement('input'), { type: 'hidden', name }));
    el.value = value;
}
function sendForm(e) {
    e.preventDefault();
    const form = e.target;
    if (form.dataset.sending) return false;
    form.dataset.sending = '1';
    setField(form, 'form', form.dataset.form || 'Website form');
    setField(form, 'page', location.href);
    // DPDP Act: the consent box is required, so every lead carries consent = Yes and this timestamp as proof
    setField(form, 'submitted_at', new Date().toISOString());
    const btn = form.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.innerHTML; btn.textContent = 'Sending…'; }
    // url-encoded, exactly what a normal form post sends
    fetch(form.action, { method: 'POST', body: new URLSearchParams(new FormData(form)), mode: 'no-cors' })
        .then(() => thankYou(form.id === 'partnerForm' ? 'partner' : ''))
        .catch(() => HTMLFormElement.prototype.submit.call(form));
    return false;
}
// Back button from the thank-you page can restore this page as it was left: make the forms usable again
window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    document.querySelectorAll('form[data-sending]').forEach(form => {
        delete form.dataset.sending;
        const btn = form.querySelector('[type="submit"]');
        if (btn && btn.dataset.label) { btn.innerHTML = btn.dataset.label; btn.disabled = false; }
    });
});

// Thank-you page: partner enquiries get their own wording
if (new URLSearchParams(location.search).get('type') === 'partner') {
    document.querySelectorAll('[data-partner]').forEach(el => { el.textContent = el.dataset.partner; });
    document.querySelectorAll('[data-partner-hide]').forEach(el => el.classList.add('d-none'));
}

// Book consultation page: show what the enquiry is about (?for=…) and preselect the country (?country=…)
(() => {
    const form = document.getElementById('bookForm');
    if (!form) return;
    const q = new URLSearchParams(location.search);
    const about = (q.get('for') || '').trim().slice(0, 120);
    if (about) {
        document.getElementById('bkFor').value = about;
        document.getElementById('bkForText').textContent = about;
        document.getElementById('bkForWrap').classList.remove('d-none');
    }
    const country = q.get('country');
    const sel = document.getElementById('bkCountry');
    if (country && [...sel.options].some(o => o.value === country)) sel.value = country;
})();

// Countries: [ISO code, name]
const COUNTRIES = [
    ['bd', 'Bangladesh'],
    ['iq', 'Iraq'], ['ir', 'Iran'], ['sa', 'Saudi Arabia'], ['ye', 'Yemen'], ['om', 'Oman'],
    ['ng', 'Nigeria'], ['ke', 'Kenya'], ['et', 'Ethiopia'], ['tz', 'Tanzania'], ['ug', 'Uganda'],
    ['gh', 'Ghana'], ['sd', 'Sudan'], ['ss', 'South Sudan'], ['so', 'Somalia'], ['rw', 'Rwanda'],
    ['zm', 'Zambia'], ['zw', 'Zimbabwe'], ['cm', 'Cameroon'], ['cd', 'DR Congo'], ['mz', 'Mozambique'],
    ['mw', 'Malawi'], ['eg', 'Egypt']
];
const ctryGrid = document.getElementById('ctryGrid');
if (ctryGrid) {
    COUNTRIES.forEach(([code, name]) => {
        const a = document.createElement('a');
        a.href = BASE + 'book-consultation/?country=' + encodeURIComponent(name);
        a.className = 'cpill';
        a.innerHTML = `<img src="${BASE}assets/images/flags/${code}.png" alt="" loading="lazy">${name}`;
        ctryGrid.appendChild(a);
    });
}

// ---------- Site search (modelled on vaidam.com) ----------
(() => {
    const U = BASE + 'assets/images/';
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
            .map(([t, ic, sub, dept]) => ({ type: 'Specialities', title: t, sub: sub + ' · hospitals & doctors', icon: ic, href: BASE + 'hospitals/' + dept + '/' })),
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
            .map(([t, img, sub]) => ({ type: 'Hospitals', title: t, sub: 'JCI / NABH accredited · ' + sub, img: U + img, href: BASE + 'hospitals/?q=' + encodeURIComponent(t.split(' ')[0]) })),
        ...[['Medical Tourism', 'globe', 'End-to-end treatment travel'], ['Step-Down Care', 'home', 'Supervised recovery stays'],
        ['Nurses & Caregivers', 'nurse', 'Hospital, hotel or home'], ['Concierge Desk', 'bell', 'Food, prayer, sightseeing'],
        ['Video Consultation', 'video', 'Talk to a specialist first'], ['Air Ambulance', 'amb', 'ICU-equipped transfers'],
        ['Medical Visa Assistance', 'doc', 'e-Medical visa letter and guidance', BASE + 'travel-visa/']]
            .map(([t, ic, sub, href = '#services']) => ({ type: 'Services', title: t, sub, icon: ic, href })),
        ...COUNTRIES.map(([code, name]) => ({ type: 'Countries', title: name, sub: 'Visa guide & travel support', flag: BASE + 'assets/images/flags/' + code + '.png', href: '#countries' })),
        ...[['Treatment Guide for Nigerian Patients', 'Country guide', 'https://shifarahealth.com/treatment-guide-for-nigerian-patients/'],
        ["7 Reasons Why You Shouldn't Ignore Knee Pain", 'Joint health', 'https://shifarahealth.com/7-reasons-why-you-shouldnt-ignore-knee-pain/'],
        ['India e-Medical Visa: A Step-by-Step Guide', 'Visa & travel', BASE + 'travel-visa/'],
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
        const asset = p => p && p[0] === '/' ? BASE + p.slice(1) : p;
        INDEX = [
            ...INDEX.filter(it => it.type !== 'Hospitals'),
            ...S.hospitals.map(h => ({ type: 'Hospitals', title: h.name, sub: h.address || city[h.city], img: asset(h.logo), href: BASE + 'hospital/' + h.id + '/' })),
            ...S.treatments.map(t => ({ type: 'Treatments', title: t.name, sub: [dept[t.department], t.cost && 'from ' + t.cost.split(/[–-]/)[0].trim()].filter(Boolean).join(' · '), icon: 'doc', href: BASE + 'treatment/' + t.id + '/' })),
            ...S.doctors.map(d => ({ type: 'Doctors', title: d.name, sub: [d.speciality, d.hospital, city[d.city]].filter(Boolean).join(' · '), img: asset(d.image), icon: 'user', href: BASE + 'doctor/' + d.id + '/' })),
        ];
    }
    function loadCatalog() {
        if (catalogState === 'ready') { mergeCatalog(); return; }
        if (catalogState === 'loading') return;
        catalogState = 'loading';
        const s = document.createElement('script');
        s.src = BASE + 'assets/data/catalog.js';
        s.onload = () => { catalogState = 'ready'; mergeCatalog(); render(); };
        s.onerror = () => { catalogState = 'idle'; };
        document.head.appendChild(s);
    }

    // Homepage anchors (#cost, #spec…) point back to the homepage when used on other pages.
    const resolve = href => href.startsWith('#') && !document.querySelector(href) ? BASE + href : href;

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
