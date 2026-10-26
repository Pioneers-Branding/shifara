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
    const startingPrice = range => (range || '').split(/[–-]/)[0].trim();

    function tags(slugs, max = 3) {
        const shown = slugs.slice(0, max).map(s => `<span>${esc(deptBy[s]?.noun || deptName(s))}</span>`).join('');
        return shown + (slugs.length > max ? `<span class="more">+${slugs.length - max} more</span>` : '');
    }

    function initials(name) {
        return name.replace(/^Dr\.?\s*(\(.*?\)\s*)?/i, '').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    }

    function hospitalCard(h) {
        const url = link.hospital(h.id);
        return `<div class="col"><article class="lc">
            <div class="lc-head">
                <a href="${url}" class="lc-logo"><img src="${esc(asset(h.logo))}" alt="${esc(h.name)} logo" loading="lazy"></a>
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
                ${t.cost ? `<p class="lc-price">Starting from <b>${esc(startingPrice(t.cost))}</b></p>` : ''}
                <div class="lc-actions">
                    <a href="${url}" class="btn btn-ghost">Read more</a>
                    <a href="${listUrl('hospitals', { treatment: t.id })}" class="btn btn-coral">Find hospitals</a>
                </div>
            </div>
        </article></div>`;
    }

    return {
        D, BASE, HOME, asset, sitePath, WA, deptBy, cityBy, hospBy, treatBy, docBy, esc, svg, deptName, cityName, link, listUrl, readFilters, pathId, wa, startingPrice,
        initials, hospitalCard, doctorCard, treatmentCard,
    };
})();
