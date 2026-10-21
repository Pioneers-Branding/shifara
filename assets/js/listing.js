// Shifara Health - listing pages (hospitals, doctors, treatments) with Vaidam-style filters.
// Needs assets/data/catalog.js and assets/js/cards.js loaded first. The page picks its type with
// <main data-listing="hospitals|doctors|treatments">.
(() => {
    const D = window.SHIFARA;
    const root = document.querySelector('[data-listing]');
    if (!D || !root || !window.ShifaraUI) return;

    const TYPE = root.dataset.listing;
    const PER_PAGE = 12;
    const desktop = window.matchMedia('(min-width: 768px)');

    const { esc, svg, deptName, cityName, deptBy, cityBy, hospBy, treatBy, hospitalCard, doctorCard, treatmentCard, listUrl, readFilters } = window.ShifaraUI;

    // ---------- Page configuration ----------
    const deptOf = {
        hospitals: h => h.departments,
        doctors: d => d.departments,
        treatments: t => [t.department],
    }[TYPE];

    const FILTERS = {
        department: {
            label: 'Department', icon: 'heart', placeholder: 'Select department…',
            values: () => D.departments.map(d => d.slug),
            text: deptName,
            match: (it, v) => deptOf(it).includes(v),
        },
        treatment: {
            label: 'Treatment', icon: 'doc', placeholder: 'Select treatment…',
            values: st => D.treatments.filter(t => !st.department || t.department === st.department).map(t => t.id),
            text: v => treatBy[v]?.name || v,
            group: v => deptName(treatBy[v]?.department),
            match: (it, v) => deptOf(it).includes(treatBy[v]?.department),
        },
        city: {
            label: 'City', icon: 'pin', placeholder: 'Select city…',
            values: () => D.cities.map(c => c.slug),
            text: cityName,
            match: (it, v) => it.city === v,
        },
        hospital: {
            label: 'Hospital', icon: 'home', placeholder: 'Select hospital…',
            values: st => D.hospitals.filter(h => !st.city || h.city === st.city).map(h => h.id),
            text: v => hospBy[v] ? `${hospBy[v].name}, ${cityName(hospBy[v].city)}` : v,
            // doctors belong to one hospital; a treatment is offered where its department is
            match: (it, v) => TYPE === 'treatments' ? !!hospBy[v]?.departments.includes(it.department) : it.hospitalId === v,
        },
    };

    const PAGES = {
        hospitals: {
            items: D.hospitals, keys: ['department', 'treatment', 'city'], noun: 'hospitals',
            heading: 'Find the Right Hospital', searchLabel: 'Search Hospitals', qPlaceholder: 'Search hospital name…',
            haystack: h => `${h.name} ${h.address} ${cityName(h.city)}`,
            sorts: { doctors: ['Most doctors', (a, b) => b.doctors - a.doctors], name: ['Name A–Z', (a, b) => a.name.localeCompare(b.name)] },
            title(st) {
                const where = st.city ? cityName(st.city) : 'India';
                if (st.treatment) return `Hospitals for ${treatBy[st.treatment]?.name} in ${where}`;
                if (st.department) return `${deptBy[st.department]?.noun} Hospitals in ${where}`;
                return `Partner Hospitals in ${where}`;
            },
            intro: (n, st) => `Carefully curated list of ${n} partner ${n === 1 ? 'hospital' : 'hospitals'}${st.department ? ' offering ' + deptName(st.department).toLowerCase() : ''} for international patients, with free coordination from Shifara.`,
            card: hospitalCard,
        },
        doctors: {
            items: D.doctors, keys: ['department', 'treatment', 'city', 'hospital'], noun: 'doctors',
            heading: 'Find the Right Doctor', searchLabel: 'Search Doctors', qPlaceholder: 'Search doctor name…',
            haystack: d => `${d.name} ${d.speciality} ${d.designation} ${d.hospital}`,
            sorts: { experience: ['Most experienced', (a, b) => (b.experience || 0) - (a.experience || 0)], name: ['Name A–Z', (a, b) => a.name.replace(/^Dr\.?\s*/i, '').localeCompare(b.name.replace(/^Dr\.?\s*/i, ''))] },
            title(st) {
                if (st.hospital && hospBy[st.hospital]) return `Doctors at ${hospBy[st.hospital].name}`;
                const where = st.city ? cityName(st.city) : 'India';
                if (st.treatment) return `Doctors for ${treatBy[st.treatment]?.name} in ${where}`;
                if (st.department) return `${deptBy[st.department]?.noun} Doctors in ${where}`;
                return `Specialist Doctors in ${where}`;
            },
            intro: n => `${n} experienced ${n === 1 ? 'specialist' : 'specialists'} at JCI and NABH accredited partner hospitals. Get a free opinion before you travel.`,
            card: doctorCard,
        },
        treatments: {
            items: D.treatments, keys: ['department', 'hospital'], noun: 'treatments',
            heading: 'Find a Treatment', searchLabel: 'Search Treatments', qPlaceholder: 'Search treatment name…',
            haystack: t => `${t.name} ${deptName(t.department)}`,
            sorts: { name: ['Name A–Z', (a, b) => a.name.localeCompare(b.name)] },
            title(st) {
                const what = st.department ? `${deptName(st.department)} Treatments` : 'Treatments';
                return st.hospital && hospBy[st.hospital] ? `${what} at ${hospBy[st.hospital].name}` : `${what} in India`;
            },
            intro: (n, st) => `${n} ${n === 1 ? 'treatment' : 'treatments'} available ${st.hospital && hospBy[st.hospital] ? `at ${hospBy[st.hospital].name}, ${cityName(hospBy[st.hospital].city)}` : 'at our partner hospitals'}. Send your reports for a free plan and cost estimate.`,
            card: treatmentCard,
        },
    };
    const P = PAGES[TYPE];
    const DEFAULT_SORT = Object.keys(P.sorts)[0];

    // ---------- State <-> URL ----------
    // Filters and page live in the path (/hospitals/cardiology/delhi/page/2); free-text name search and
    // a non-default sort stay in the query string because they are not fixed values.
    function readUrl() {
        const fromPath = readFilters(location.pathname);
        const sp = new URLSearchParams(location.search);
        const st = {};
        // ?department=… style links from older pages still work and are rewritten to the clean path
        P.keys.forEach(k => { const v = fromPath[k] || sp.get(k); if (v) st[k] = v; });
        P.keys.forEach(k => { if (st[k] && !FILTERS[k].values({}).includes(st[k])) delete st[k]; });
        if (sp.get('q')) st.q = sp.get('q');
        if (P.sorts[sp.get('sort')]) st.sort = sp.get('sort');
        st.page = Math.max(1, fromPath.page || parseInt(sp.get('page'), 10) || 1);
        return st;
    }
    const urlFor = (st, page = st.page) => listUrl(TYPE, Object.fromEntries(P.keys.filter(k => st[k]).map(k => [k, st[k]])),
        { page, q: st.q, sort: st.sort !== DEFAULT_SORT ? st.sort : '' });
    function writeUrl(st, push = true) {
        const url = urlFor(st);
        if (url === location.pathname + location.search) return;
        history[push ? 'pushState' : 'replaceState'](null, '', url);
    }

    // ---------- Filtering ----------
    function matches(it, st, skip) {
        for (const k of P.keys) {
            if (k !== skip && st[k] && !FILTERS[k].match(it, st[k])) return false;
        }
        if (st.q) {
            const hay = P.haystack(it).toLowerCase();
            if (!st.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
        }
        return true;
    }
    function optionsFor(key, st) {
        const f = FILTERS[key];
        const pool = P.items.filter(it => matches(it, st, key));
        return f.values(st)
            .map(v => ({ value: v, label: f.text(v), group: f.group?.(v), count: pool.filter(it => f.match(it, v)).length }))
            .filter(o => o.count > 0 || o.value === st[key]);
    }

    // ---------- Combobox ----------
    function Combo(key, el, onPick) {
        const input = el.querySelector('input');
        const list = el.querySelector('.combo-list');
        const clear = el.querySelector('.combo-clear');
        let opts = [], value = '', active = -1;

        function show(text = '') {
            const t = text.toLowerCase();
            const shown = opts.filter(o => !t || o.label.toLowerCase().includes(t));
            let lastGroup = null;
            list.innerHTML = shown.length ? shown.map((o, i) => {
                const head = o.group && o.group !== lastGroup ? `<li class="combo-group">${esc(lastGroup = o.group)}</li>` : '';
                return `${head}<li class="combo-opt${o.value === value ? ' sel' : ''}" data-i="${i}" role="option">${o.value === value ? svg('check') : ''}<span>${esc(o.label)}</span><em>${o.count}</em></li>`;
            }).join('') : '<li class="combo-empty">No matches</li>';
            list._shown = shown;
            active = -1;
            el.classList.add('open');
        }
        function close() {
            el.classList.remove('open');
            input.value = value ? (opts.find(o => o.value === value)?.label || FILTERS[key].text(value)) : '';
        }
        function pick(v) { value = v; close(); sync(); onPick(key, v); }
        function sync() { el.classList.toggle('has-value', !!value); }

        input.addEventListener('focus', () => { input.select(); show(); });
        input.addEventListener('input', () => show(input.value));
        input.addEventListener('blur', () => setTimeout(close, 150));
        input.addEventListener('keydown', e => {
            const items = [...list.querySelectorAll('.combo-opt')];
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!el.classList.contains('open')) show();
                if (!items.length) return;
                active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                items.forEach((li, i) => li.classList.toggle('active', i === active));
                items[active].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const li = items[active >= 0 ? active : 0];
                if (li) pick(list._shown[li.dataset.i].value);
            } else if (e.key === 'Escape') {
                input.blur();
            }
        });
        list.addEventListener('mousedown', e => {
            const li = e.target.closest('.combo-opt');
            if (li) { e.preventDefault(); pick(list._shown[li.dataset.i].value); }
        });
        clear.addEventListener('click', () => pick(''));

        return {
            set(newOpts, v) { opts = newOpts; value = v || ''; sync(); if (document.activeElement !== input) close(); },
        };
    }

    // ---------- Render filter bar ----------
    const bar = root.querySelector('#lfBar');
    bar.querySelector('.lf-title').textContent = P.heading;
    bar.querySelector('.lf-search span').textContent = P.searchLabel;
    const fields = bar.querySelector('#lfFields');
    const colClass = { 1: 'col-md-6', 2: 'col-md-6', 3: 'col-md-4' }[P.keys.length + 1] || 'col-md-6 col-lg';
    fields.innerHTML = P.keys.map(k => `
        <div class="${colClass}">
            <label class="lf-label" for="lf-${k}">${svg(FILTERS[k].icon)}${FILTERS[k].label}</label>
            <div class="combo" data-key="${k}">
                <input id="lf-${k}" type="text" autocomplete="off" placeholder="${FILTERS[k].placeholder}" role="combobox" aria-expanded="false">
                <button type="button" class="combo-clear" aria-label="Clear ${FILTERS[k].label}">×</button>
                <span class="combo-caret">${svg('chev')}</span>
                <ul class="combo-list" role="listbox"></ul>
            </div>
        </div>`).join('') + `
        <div class="${colClass}">
            <label class="lf-label" for="lf-q">${svg('search')}Name</label>
            <div class="lf-q"><input id="lf-q" type="search" placeholder="${P.qPlaceholder}" autocomplete="off"></div>
        </div>`;

    let state = readUrl();     // applied (in URL)
    let pending = { ...state }; // edited in the bar, applied on desktop at once, on mobile with the Search button
    const combos = {};
    const qInput = fields.querySelector('#lf-q');

    function apply(next, push = true) {
        state = { ...next };
        P.keys.forEach(k => { if (!state[k]) delete state[k]; });
        if (!state.q) delete state.q;
        pending = { ...state };
        writeUrl(state, push);
        render();
    }

    function onPick(key, v) {
        pending = { ...pending, [key]: v, page: 1 };
        if (key === 'treatment' && v) pending.department = treatBy[v]?.department;
        if (key === 'department' && pending.treatment && treatBy[pending.treatment]?.department !== v) delete pending.treatment;
        if (key === 'city' && pending.hospital && hospBy[pending.hospital]?.city !== v) delete pending.hospital;
        if (key === 'hospital' && v) pending.city = hospBy[v]?.city;
        if (desktop.matches) apply(pending); else refreshBar();
    }
    P.keys.forEach(k => { combos[k] = Combo(k, fields.querySelector(`.combo[data-key="${k}"]`), onPick); });

    let qTimer;
    qInput.addEventListener('input', () => {
        pending = { ...pending, q: qInput.value.trim(), page: 1 };
        if (!desktop.matches) return;
        clearTimeout(qTimer);
        qTimer = setTimeout(() => apply(pending, false), 300);
    });
    qInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(pending); } });
    bar.querySelector('.lf-search').addEventListener('click', () => { apply({ ...pending, q: qInput.value.trim(), page: 1 }); scrollToResults(); });
    bar.querySelector('.lf-clear').addEventListener('click', () => apply({ page: 1, sort: state.sort }));

    function refreshBar() {
        P.keys.forEach(k => combos[k].set(optionsFor(k, pending), pending[k]));
        if (document.activeElement !== qInput) qInput.value = pending.q || '';
        const n = P.keys.filter(k => pending[k]).length + (pending.q ? 1 : 0);
        const badge = bar.querySelector('.lf-count');
        badge.textContent = `${n} ${n === 1 ? 'filter' : 'filters'} applied`;
        badge.classList.toggle('d-none', !n);
        bar.querySelector('.lf-clear').classList.toggle('invisible', !n);
    }

    // ---------- Results ----------
    const out = {
        title: root.querySelector('#lrTitle'), intro: root.querySelector('#lrIntro'), chips: root.querySelector('#lrChips'),
        count: root.querySelector('#lrCount'), sort: root.querySelector('#lrSort'), grid: root.querySelector('#lrGrid'),
        pager: root.querySelector('#lrPager'), crumb: root.querySelector('#lrCrumb'),
    };
    out.sort.innerHTML = Object.entries(P.sorts).map(([k, [label]]) => `<option value="${k}">${label}</option>`).join('');
    out.sort.closest('.lr-sort').classList.toggle('d-none', Object.keys(P.sorts).length < 2);
    out.sort.addEventListener('change', () => apply({ ...state, sort: out.sort.value, page: 1 }));

    function render() {
        refreshBar();
        const sortKey = state.sort || DEFAULT_SORT;
        const list = P.items.filter(it => matches(it, state)).sort(P.sorts[sortKey][1]);
        const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
        const page = Math.min(state.page || 1, pages);
        const slice = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

        const title = P.title(state);
        out.title.textContent = title;
        out.crumb.textContent = title;
        document.title = `${title} | Shifara Health`;
        out.intro.textContent = P.intro(list.length, state);
        out.sort.value = sortKey;
        out.count.innerHTML = list.length
            ? `Showing <b>${(page - 1) * PER_PAGE + 1}–${(page - 1) * PER_PAGE + slice.length}</b> of <b>${list.length}</b> ${P.noun}`
            : `No ${P.noun} found`;

        const chips = P.keys.filter(k => state[k]).map(k => [k, `${FILTERS[k].label}: ${FILTERS[k].text(state[k])}`]);
        if (state.q) chips.push(['q', `Name: “${state.q}”`]);
        out.chips.innerHTML = chips.map(([k, t]) => `<button type="button" class="lr-chip" data-k="${k}">${esc(t)}<span aria-hidden="true">×</span></button>`).join('');

        out.grid.innerHTML = slice.length ? slice.map(P.card).join('') : emptyState();
        out.pager.innerHTML = pages > 1 ? pager(page, pages) : '';
    }

    out.chips.addEventListener('click', e => {
        const b = e.target.closest('.lr-chip');
        if (!b) return;
        const next = { ...state, page: 1 };
        delete next[b.dataset.k];
        if (b.dataset.k === 'department') delete next.treatment;
        apply(next);
    });
    out.pager.addEventListener('click', e => {
        const b = e.target.closest('[data-page]');
        if (!b) return;
        e.preventDefault();
        apply({ ...state, page: +b.dataset.page });
        scrollToResults();
    });
    out.grid.addEventListener('click', e => {
        const b = e.target.closest('[data-reset]');
        if (b) apply({ page: 1 });
    });

    function pager(page, pages) {
        const nums = [];
        for (let i = 1; i <= pages; i++) {
            if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
            else if (nums[nums.length - 1] !== '…') nums.push('…');
        }
        const link = (p, label, extra = '') => `<a href="${urlFor(state, p)}" data-page="${p}" class="pg ${extra}">${label}</a>`;
        return (page > 1 ? link(page - 1, svg('arrow', 'flip') , 'pg-nav') : '')
            + nums.map(n => n === '…' ? '<span class="pg pg-gap">…</span>' : link(n, n, n === page ? 'on' : '')).join('')
            + (page < pages ? link(page + 1, svg('arrow'), 'pg-nav') : '');
    }

    function emptyState() {
        return `<div class="col-12"><div class="lr-empty">
            <div class="ico">${svg('search')}</div>
            <h3>No ${P.noun} match these filters</h3>
            <p>Try removing a filter, or tell us what you need and a case manager will find the right option for you.</p>
            <div class="d-flex flex-wrap justify-content-center gap-2">
                <button type="button" class="btn btn-ghost" data-reset>Clear all filters</button>
                <a href="https://wa.me/919971316164" target="_blank" rel="noopener" class="btn btn-wa">${svg('wa', 'i')} Ask on WhatsApp</a>
            </div></div></div>`;
    }

    function scrollToResults() {
        const top = root.querySelector('#lrTop').getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top, behavior: 'smooth' });
    }

    // ---------- Boot ----------
    window.addEventListener('popstate', () => { state = readUrl(); pending = { ...state }; render(); });
    desktop.addEventListener('change', () => { pending = { ...state }; refreshBar(); });
    writeUrl(state, false);
    render();
})();
