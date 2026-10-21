// Local dev server with the same URL rules as .htaccess. No dependencies.
// Run:  node server.js        then open http://localhost:3000
//
//   /hospital/<id>/, /doctor/<id>/, /treatment/<id>/  -> real folders (index.html)
//   /hospitals/<filters…>/ etc.                         -> hospitals/index.html (filters read by listing.js)
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
        for (const index of ['index.html', 'ind.html']) {
            if (isFile(path.join(full, index))) return { file: path.join(full, index) };
        }
    }
    if (isFile(full)) return { file: full };
    const listing = urlPath.match(/^\/(hospitals|doctors|treatments)\//);
    if (listing) return { file: path.join(ROOT, listing[1], 'index.html') };
    return { status: 404 };
}

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const r = resolve(decodeURIComponent(url.pathname));
    if (r.redirect) { res.writeHead(301, { Location: r.redirect + url.search }); return res.end(); }
    if (!r.file) {
        res.writeHead(r.status, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(r.status === 404 ? '404 Not found: ' + url.pathname : 'Forbidden');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(r.file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(r.file).pipe(res);
}).listen(PORT, () => console.log(`Shifara Health running at http://localhost:${PORT}`));
