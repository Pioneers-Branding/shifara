// Shifara Health - behaviour for the generated detail pages (hospital, doctor, treatment).
// The page content is plain HTML in each page's folder (e.g. /hospital/<id>/index.html); this file only adds
// the quote form, the doctor filter chips on hospital pages and the sticky "on this page" menu.
(() => {
    const root = document.querySelector('[data-detail]');
    if (!root) return;

    // Quote forms
    root.querySelectorAll('.dt-quote-form').forEach(f => f.addEventListener('submit', e => {
        e.preventDefault();
        // TODO: send the enquiry (with f.dataset.subject) to the CRM / form endpoint
        thankYou();
    }));

    // Hospital page: filter the doctors by department (first 6 shown)
    const chips = root.querySelector('#dtDocChips');
    if (chips) {
        const cols = [...root.querySelectorAll('#dtDocGrid [data-depts]')];
        const all = root.querySelector('#dtDocAll');
        chips.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            chips.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
            let shown = 0;
            cols.forEach(col => {
                const match = !b.dataset.d || col.dataset.depts.split(' ').includes(b.dataset.d);
                col.classList.toggle('d-none', !match || shown >= 6);
                if (match) shown++;
            });
            const n = +b.dataset.count;
            all.href = b.dataset.href;
            all.querySelector('span').textContent = `View all ${n} ${n === 1 ? 'doctor' : 'doctors'}`;
            all.classList.toggle('d-none', n <= 6);
        });
    }

    // Highlight the section in view in the sticky sub-nav
    const links = [...root.querySelectorAll('.dt-subnav a')];
    if (!links.length) return;
    const io = new IntersectionObserver(entries => entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-140px 0px -60% 0px' });
    links.forEach(a => { const sec = root.querySelector(a.getAttribute('href')); if (sec) io.observe(sec); });
    links[0].classList.add('on');
})();
