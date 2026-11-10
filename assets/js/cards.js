// Shifara Health - shared helpers and card templates for listing and detail pages.
// Needs assets/data/catalog.js (window.SHIFARA) loaded first.
// Site root, worked out from this script's own URL (…/assets/js/cards.js), so the site runs at a domain root,
// in a subfolder or from disk. '/' when build.js runs this file in Node; the build makes the links relative.
window.SHIFARA_BASE = window.SHIFARA_BASE || (typeof document !== 'undefined' && document.currentScript
    ? new URL('../../', document.currentScript.src).pathname : '/');
window.ShifaraUI = (() => {
    const D = window.SHIFARA;
    if (!D) return null;

    const BASE = window.SHIFARA_BASE;
    const HOME = BASE;
    // catalog paths are written from the site root ("/assets/…")
    const asset = p => p && p[0] === '/' ? BASE + p.slice(1) : p;
    const WA = 'https://wa.me/919971316164';
    const by = (arr, key = 'id') => Object.fromEntries(arr.map(x => [x[key], x]));
    const deptBy = by(D.departments, 'slug');
    const cityBy = by(D.cities, 'slug');
    const hospBy = by(D.hospitals);
    const treatBy = by(D.treatments);
    const docBy = by(D.doctors);

    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const svg = (id, cls = '') => `<svg class="${cls}"><use href="#${id}" /></svg>`;
    const deptName = s => deptBy[s]?.name || s;
    const cityName = s => cityBy[s]?.name || s;
    // Clean, folder-style URLs:
    //   /hospital/<id>/  /doctor/<id>/  /treatment/<id>/  -> real folders with their own index.html
    //   /hospitals/<department>/<treatment>/<city>/  /doctors/.../<hospital>/  /treatments/<department>/
    //     -> a generated folder when some page links to it, otherwise the listing folder's index.html
    //        (.htaccess / server.js / 404.html); filters are read from the path
    const link = {
        hospital: id => `${BASE}hospital/${id}/`,
        doctor: id => `${BASE}doctor/${id}/`,
        treatment: id => `${BASE}treatment/${id}/`,
    };
    const SEGMENT_ORDER = ['department', 'treatment', 'city', 'hospital'];
    function listUrl(type, f = {}, extra = {}) {
        const filters = { ...f };
        if (filters.treatment && !filters.department) filters.department = treatBy[filters.treatment]?.department;
        const parts = SEGMENT_ORDER.filter(k => filters[k]).map(k => filters[k]);
        if (extra.page > 1) parts.push('page', extra.page);
        const qs = new URLSearchParams();
        if (extra.q) qs.set('q', extra.q);
        if (extra.sort) qs.set('sort', extra.sort);
        return `${BASE}${type}/${parts.length ? parts.join('/') + '/' : ''}${qs.toString() ? '?' + qs : ''}`;
    }
    // Path below the site root: "/sub/hospitals/delhi/index.html" -> "hospitals/delhi/"
    const sitePath = (pathname = location.pathname) =>
        (pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '')).replace(/index\.html$/, '');
    // Read filters back from a path such as /hospitals/cardiology/delhi/page/2
    function readFilters(pathname) {
        const segs = sitePath(pathname).split('/').filter(Boolean).slice(1).map(decodeURIComponent);
        const out = {};
        for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            if (s === 'page') { out.page = parseInt(segs[++i], 10) || 1; continue; }
            if (deptBy[s]) out.department = s;
            else if (treatBy[s]) out.treatment = s;
            else if (cityBy[s]) out.city = s;
            else if (hospBy[s]) out.hospital = s;
        }
        return out;
    }
    const pathId = () => decodeURIComponent(sitePath().split('/').filter(Boolean)[1] || '');
    const wa = text => `${WA}?text=${encodeURIComponent(text)}`;
    // first dollar amount of a cost range; empty when the cost field holds no price
    const startingPrice = range => (range || '').match(/\$[\d,]+/)?.[0] || '';

    function tags(slugs, max = 3) {
        const shown = slugs.slice(0, max).map(s => `<span>${esc(deptBy[s]?.noun || deptName(s))}</span>`).join('');
        return shown + (slugs.length > max ? `<span class="more">+${slugs.length - max} more</span>` : '');
    }

    function initials(name) {
        return name.replace(/^Dr\.?\s*(\(.*?\)\s*)?/i, '').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    }

    // hospital logo, or its initials when there is no logo file yet
    const logo = (h, alt = `${h.name} logo`) => h.logo
        ? `<img src="${esc(asset(h.logo))}" alt="${esc(alt)}" loading="lazy">`
        : `<span class="lc-initials" aria-label="${esc(h.name)}">${esc(initials(h.name))}</span>`;

    function hospitalCard(h) {
        const url = link.hospital(h.id);
        return `<div class="col"><article class="lc">
            <div class="lc-head">
                <a href="${url}" class="lc-logo">${logo(h)}</a>
                <div class="min-w-0">
                    <h3><a href="${url}">${esc(h.name)}</a></h3>
                    <p class="lc-loc">${svg('pin')}${esc(h.address || cityName(h.city))}</p>
                </div>
            </div>
            <div class="lc-tags">${tags(h.departments)}</div>
            <div class="lc-meta">
                ${h.established ? `<span>${svg('clock')}Est. ${esc(h.established)}</span>` : `<span>${svg('shield')}Accredited partner</span>`}
                ${h.doctors ? `<a href="${listUrl('doctors', { hospital: h.id })}">${svg('user')}${h.doctors} ${h.doctors === 1 ? 'doctor' : 'doctors'}</a>` : `<span>${svg('pin')}${esc(cityName(h.city))}</span>`}
            </div>
            <div class="lc-actions">
                <a href="${url}" class="btn btn-ghost">View hospital</a>
                <a href="${BASE}book-consultation/?for=${encodeURIComponent(h.name)}" class="btn btn-coral">Get free quote</a>
            </div>
        </article></div>`;
    }

    function doctorCard(d) {
        const url = link.doctor(d.id);
        const photo = d.image ? `<img src="${esc(asset(d.image))}" alt="${esc(d.name)}" loading="lazy">` : `<span class="lc-initials">${esc(initials(d.name))}</span>`;
        const hosp = d.hospitalId ? `<a href="${link.hospital(d.hospitalId)}">${esc(d.hospital)}</a>` : esc(d.hospital);
        return `<div class="col"><article class="lc lc-doc">
            <div class="lc-head">
                <a href="${url}" class="lc-photo">${photo}</a>
                <div class="min-w-0">
                    <span class="lc-spec">${esc(d.speciality || 'Specialist')}</span>
                    <h3><a href="${url}">${esc(d.name)}</a></h3>
                    <p class="lc-desig">${esc(d.designation)}</p>
                </div>
            </div>
            <div class="lc-meta lc-meta-stack">
                ${d.experience ? `<span>${svg('clock')}${d.experience}+ years experience</span>` : ''}
                <span>${svg('home')}${hosp}</span>
                <span>${svg('pin')}${esc(cityName(d.city))}</span>
            </div>
            <div class="lc-actions">
                <a href="${url}" class="btn btn-ghost">View profile</a>
                <a href="${BASE}book-consultation/?for=${encodeURIComponent(d.name)}" class="btn btn-coral">Free opinion</a>
            </div>
        </article></div>`;
    }

    function treatmentCard(t) {
        const url = link.treatment(t.id);
        return `<div class="col"><article class="lc lc-treat">
            <a href="${url}" class="lc-img">${t.image ? `<img src="${esc(asset(t.image))}" alt="${esc(t.name)}" loading="lazy">` : ''}</a>
            <div class="lc-body">
                <h3><a href="${url}">${esc(t.name)}</a></h3>
                ${startingPrice(t.cost) ? `<p class="lc-price">Starting from <b>${esc(startingPrice(t.cost))}</b></p>` : ''}
                <div class="lc-actions">
                    <a href="${url}" class="btn btn-ghost">Read more</a>
                    <a href="${listUrl('hospitals', { treatment: t.id })}" class="btn btn-coral">Find hospitals</a>
                </div>
            </div>
        </article></div>`;
    }

    // ---------- Listing pages: results, titles and intro (shared by listing.js and the build) ----------
    // How people search for each department: [treatments and hospitals, doctors]
    const SEARCH_TERMS = {
        neurology: ['Neurosurgery', 'Neurosurgeons & Neurologists'], cardiology: ['Heart', 'Cardiologists & Heart Surgeons'],
        oncology: ['Cancer', 'Oncologists & Cancer Surgeons'], orthopedics: ['Orthopaedic', 'Orthopaedic Surgeons'],
        'spine-surgery': ['Spine Surgery', 'Spine Surgeons'], gastroenterology: ['Gastroenterology & Liver', 'Gastroenterologists'],
        nephrology: ['Kidney', 'Nephrologists'], urology: ['Urology', 'Urologists'], gynecology: ['Gynaecology', 'Gynaecologists'],
        ivf: ['IVF', 'IVF Specialists'], cosmetic: ['Cosmetic Surgery', 'Plastic Surgeons'], transplant: ['Organ Transplant', 'Transplant Surgeons'],
        pediatrics: ['Paediatric', 'Paediatricians'], 'general-surgery': ['General Surgery', 'General Surgeons'], ent: ['ENT', 'ENT Specialists'],
        hematology: ['Haematology', 'Haematologists'], 'internal-medicine': ['Internal Medicine', 'Internal Medicine Physicians'],
        pulmonology: ['Lung', 'Pulmonologists'], ophthalmology: ['Eye', 'Eye Specialists'], vascular: ['Vascular Surgery', 'Vascular Surgeons'],
        endocrinology: ['Endocrinology', 'Endocrinologists'], bariatric: ['Bariatric Surgery', 'Bariatric Surgeons'], dental: ['Dental', 'Dentists'],
        'nuclear-medicine': ['Nuclear Medicine', 'Nuclear Medicine Specialists'], rheumatology: ['Rheumatology', 'Rheumatologists'],
        pathology: ['Pathology', 'Pathologists'], anesthesiology: ['Anaesthesiology', 'Anaesthesiologists'], psychiatry: ['Psychiatry', 'Psychiatrists'],
        'palliative-care': ['Palliative Care', 'Palliative Care Specialists'], dermatology: ['Dermatology', 'Dermatologists'],
    };
    const searchTerm = s => SEARCH_TERMS[s]?.[0] || deptBy[s]?.noun || deptName(s);
    const searchDoctors = s => SEARCH_TERMS[s]?.[1] || `${deptBy[s]?.noun || deptName(s)} Specialists`;

    // Branches share a name: the city tells them apart, or the area when one city has several
    const BRANCH_AREA = {
        'birla-fertility-ivf': 'Dwarka', 'birla-fertility-ivf-lajpat-nagar': 'Lajpat Nagar', 'fortis-hospital-noida': 'Noida',
        'fortis-hospital-greater-noida': 'Greater Noida', 'manipal-hospital-hebbal-bangalore': 'Hebbal', 'manipal-hospital-old-airport-road-bangalore': 'Old Airport Road',
        'max-super-speciality-hospital': 'Saket', 'max-super-speciality-hospital-dwarka': 'Dwarka', 'max-super-speciality-hospital-patparganj': 'Patparganj',
        'medicover-fertility-delhi': 'Panchsheel Park', 'medicover-fertility-dwarka': 'Dwarka', 'kauvery-hospital-chennai': 'Alwarpet',
        'kauvery-hospital-vadapalani-chennai': 'Vadapalani', 'kauvery-hospital-radial-road-chennai': 'Radial Road', 'manipal-hospital-hyderabad': 'Banjara Hills',
        'manipal-hospital-secunderabad-hyderabad': 'Secunderabad', 'yashoda-hospitals-hyderabad': 'Malakpet', 'yashoda-hospitals-hitec-city-hyderabad': 'Hitec City',
    };
    const nameCount = D.hospitals.reduce((n, h) => ({ ...n, [h.name]: (n[h.name] || 0) + 1 }), {});
    const hospitalLabel = h => BRANCH_AREA[h.id] ? `${h.name}, ${BRANCH_AREA[h.id]}` : nameCount[h.name] > 1 ? `${h.name}, ${cityName(h.city)}` : h.name;

    const LISTING_KEYS = { hospitals: ['department', 'treatment', 'city'], doctors: ['department', 'treatment', 'city', 'hospital'], treatments: ['department', 'hospital'] };
    const deptsOf = { hospitals: h => h.departments, doctors: d => d.departments, treatments: t => [t.department] };
    const FILTER_MATCH = {
        department: (type, it, v) => deptsOf[type](it).includes(v),
        treatment: (type, it, v) => deptsOf[type](it).includes(treatBy[v]?.department),
        city: (type, it, v) => it.city === v,
        // doctors belong to one hospital; a treatment is offered where its department is
        hospital: (type, it, v) => type === 'treatments' ? !!hospBy[v]?.departments.includes(it.department) : it.hospitalId === v,
    };
    const filterMatches = (type, key, it, v) => FILTER_MATCH[key](type, it, v);
    // first sort of each listing, the order results open in
    const listingSort = {
        hospitals: (a, b) => b.doctors - a.doctors,
        doctors: (a, b) => (b.experience || 0) - (a.experience || 0),
        treatments: (a, b) => a.name.localeCompare(b.name),
    };
    const listingItems = (type, st) => D[type].filter(it => LISTING_KEYS[type].every(k => !st[k] || filterMatches(type, k, it, st[k]))).sort(listingSort[type]);

    function listingTitle(type, st) {
        const where = st.city ? `${cityName(st.city)}, India` : 'India';
        const treat = treatBy[st.treatment]?.name;
        const hosp = hospBy[st.hospital];
        if (type === 'hospitals') {
            if (treat) return `Best Hospitals for ${treat} in ${where}`;
            return st.department ? `Best ${searchTerm(st.department)} Hospitals in ${where}` : `Best Hospitals in ${where}`;
        }
        if (type === 'doctors') {
            if (hosp) {
                if (!st.department) return `${hospitalLabel(hosp)} Doctors List, India`;
                const full = `${searchDoctors(st.department)} at ${hospitalLabel(hosp)}, India`;
                return full.length > 58 ? `${deptBy[st.department]?.noun || ''} Doctors at ${hospitalLabel(hosp)}, India` : full;
            }
            if (treat) return `Best Doctors for ${treat} in ${where}`;
            return st.department ? `Best ${searchDoctors(st.department)} in ${where}` : `Best Doctors in ${where}`;
        }
        const what = st.department ? `${searchTerm(st.department)} Treatment` : 'Medical Treatment';
        return hosp ? `${what} at ${hospitalLabel(hosp)}, India` : `Best ${what} in India`;
    }
    // the browser / search result title; the H1 stays shorter
    const listingDocTitle = (type, st) => listingTitle(type, st) + (type === 'treatments' && !st.hospital ? ': Cost & Hospitals' : '');
    function listingIntro(type, n, st) {
        const where = st.city ? `${cityName(st.city)}, India` : 'India';
        const hosp = hospBy[st.hospital];
        if (type === 'hospitals') {
            const offering = st.treatment ? ` offering ${treatBy[st.treatment]?.name}` : st.department ? ` offering ${deptName(st.department).toLowerCase()}` : '';
            return `Carefully curated list of ${n} partner ${n === 1 ? 'hospital' : 'hospitals'}${offering} in ${where} for international patients, with free coordination from Shifara.`;
        }
        if (type === 'doctors') return `${n} experienced ${n === 1 ? 'specialist' : 'specialists'} at JCI and NABH accredited partner hospitals in India. Get a free opinion before you travel.`;
        return `${n} ${n === 1 ? 'treatment' : 'treatments'} available ${hosp ? `at ${hosp.name}, ${cityName(hosp.city)}` : 'at our partner hospitals in India'}. Send your reports for a free plan and cost estimate.`;
    }

    return {
        D, BASE, HOME, asset, logo, sitePath, WA, deptBy, cityBy, hospBy, treatBy, docBy, esc, svg, deptName, cityName, link, listUrl, readFilters, pathId, wa, startingPrice,
        initials, hospitalCard, doctorCard, treatmentCard,
        searchTerm, searchDoctors, hospitalLabel, filterMatches, listingSort, listingItems, listingTitle, listingDocTitle, listingIntro,
    };
})();
