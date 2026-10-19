// Local dev server with the same clean-URL rules as .htaccess. No dependencies.
// Run:  node server.js        then open http://localhost:3000
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

function route(urlPath) {
    if (urlPath === '/') return 'ind.html';
    let m = urlPath.match(/^\/(hospitals|doctors|treatments)(\/.*)?\/?$/);
    if (m) return `${m[1]}.html`;
    m = urlPath.match(/^\/(hospital|doctor|treatment)\/[^/]+\/?$/);
    if (m) return `${m[1]}.html`;
    return urlPath.slice(1);
}

http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.normalize(path.join(ROOT, route(urlPath)));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(file, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not found: ' + urlPath);
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
    });
}).listen(PORT, () => console.log(`Shifara Health running at http://localhost:${PORT}`));
