// Shifara Health - homepage hospital finder (Department, Treatment, City).
// Needs assets/data/catalog.js and assets/js/cards.js loaded first. Search opens the hospitals listing
// with the picked filters, e.g. /hospitals/cardiology/delhi/.
(() => {
    const D = window.SHIFARA;
    const bar = document.querySelector('#hfBar');
    if (!D || !bar || !window.ShifaraUI) return;

    const { esc, svg, deptName, cityName, treatBy, listUrl } = window.ShifaraUI;

    const FILTERS = {
        department: {
            label: 'Department', icon: 'heart', placeholder: 'Select department…',
            values: () => D.departments.map(d => d.slug),
            text: deptName,
            match: (h, v) => h.departments.includes(v),
        },
        treatment: {
            label: 'Treatment', icon: 'doc', placeholder: 'Select treatment…',
            values: st => D.treatments.filter(t => !st.department || t.department === st.department).map(t => t.id),
            text: v => treatBy[v]?.name || v,
            group: v => deptName(treatBy[v]?.department),
            match: (h, v) => h.departments.includes(treatBy[v]?.department),
        },
        city: {
            label: 'City', icon: 'pin', placeholder: 'Select city…',
            values: () => D.cities.map(c => c.slug),
            text: cityName,
            match: (h, v) => h.city === v,
        },
    };
    const KEYS = Object.keys(FILTERS);

    // Options show how many hospitals match given the other picks, and hide the ones with none.
    function matches(h, st, skip) {
        return KEYS.every(k => k === skip || !st[k] || FILTERS[k].match(h, st[k]));
    }
    function optionsFor(key, st) {
        const f = FILTERS[key];
        const pool = D.hospitals.filter(h => matches(h, st, key));
        return f.values(st)
            .map(v => ({ value: v, label: f.text(v), group: f.group?.(v), count: pool.filter(h => f.match(h, v)).length }))
            .filter(o => o.count > 0 || o.value === st[key]);
    }

    // ---------- Combobox (same markup and keyboard behaviour as the listing pages) ----------
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
            input.setAttribute('aria-expanded', 'true');
        }
        function close() {
            el.classList.remove('open');
            input.setAttribute('aria-expanded', 'false');
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

    // ---------- Render ----------
    const fields = bar.querySelector('#hfFields');
    fields.innerHTML = KEYS.map(k => `
        <div class="col-sm-6 col-lg-4">
            <label class="lf-label" for="hf-${k}">${svg(FILTERS[k].icon)}${FILTERS[k].label}</label>
            <div class="combo" data-key="${k}">
                <input id="hf-${k}" type="text" autocomplete="off" placeholder="${FILTERS[k].placeholder}" role="combobox" aria-expanded="false">
                <button type="button" class="combo-clear" aria-label="Clear ${FILTERS[k].label}">×</button>
                <span class="combo-caret">${svg('chev')}</span>
                <ul class="combo-list" role="listbox"></ul>
            </div>
        </div>`).join('');

    let st = {};
    const combos = {};

    function onPick(key, v) {
        st = { ...st, [key]: v };
        if (key === 'treatment' && v) st.department = treatBy[v]?.department;
        if (key === 'department' && st.treatment && treatBy[st.treatment]?.department !== v) delete st.treatment;
        KEYS.forEach(k => { if (!st[k]) delete st[k]; });
        refresh();
    }
    KEYS.forEach(k => { combos[k] = Combo(k, fields.querySelector(`.combo[data-key="${k}"]`), onPick); });

    function refresh() {
        KEYS.forEach(k => combos[k].set(optionsFor(k, st), st[k]));
        const n = KEYS.filter(k => st[k]).length;
        const badge = bar.querySelector('.lf-count');
        badge.textContent = `${n} ${n === 1 ? 'filter' : 'filters'} applied`;
        badge.classList.toggle('d-none', !n);
        bar.querySelector('.lf-clear').classList.toggle('invisible', !n);
    }

    bar.querySelector('.lf-clear').addEventListener('click', () => { st = {}; refresh(); });
    bar.querySelector('.lf-search').addEventListener('click', () => {
        location.href = listUrl('hospitals', { department: st.department, treatment: st.treatment, city: st.city });
    });

    refresh();
})();
