// Local dev server with the same URL rules as .htaccess. No dependencies.
// Run:  node server.js        then open http://localhost:3000
// (Optional: every page also works on any plain static server or from disk; this adds the rewrites below.)
//
//   /hospital/<id>/, /doctor/<id>/, /treatment/<id>/  -> real folders (index.html)
//   /hospitals/<filters…>/ etc.                         -> real folder if generated, else redirect to
//                                                          /hospitals/?path=<filters…> (listing.js shows the clean URL)
//   anything else missing                               -> 404.html
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
const isFile = p => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

function resolve(urlPath) {
    const full = path.normalize(path.join(ROOT, urlPath));
    if (!full.startsWith(ROOT)) return { status: 403 };
    if (isDir(full)) {
        if (!urlPath.endsWith('/')) return { redirect: urlPath + '/' };
        for (const index of ['index.html']) {
            if (isFile(path.join(full, index))) return { file: path.join(full, index) };
        }
    }
    if (isFile(full)) return { file: full };
    // pages use relative links, so the listing page is opened from its own folder rather than rewritten
    const listing = urlPath.match(/^\/(hospitals|doctors|treatments)\/(.+)$/);
    if (listing) return { redirect: `/${listing[1]}/?path=${encodeURIComponent(listing[2])}`, temporary: true };
    return { status: 404 };
}

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const r = resolve(decodeURIComponent(url.pathname));
    if (r.redirect) {
        const search = r.temporary ? url.search.replace('?', '&') : url.search;
        res.writeHead(r.temporary ? 302 : 301, { Location: r.redirect + search });
        return res.end();
    }
    if (r.status === 404 && isFile(path.join(ROOT, '404.html'))) {
        res.writeHead(404, { 'Content-Type': TYPES['.html'] });
        return fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
    }
    if (!r.file) {
        res.writeHead(r.status, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(r.status === 404 ? '404 Not found: ' + url.pathname : 'Forbidden');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(r.file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(r.file).pipe(res);
}).listen(PORT, () => console.log(`Shifara Health running at http://localhost:${PORT}`));
