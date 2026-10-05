const http = require('http'), fs = require('fs'), path = require('path');
http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '');
  fs.readFile(path.join(__dirname, name), 'utf8', (err, body) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + body + '</body></html>');
  });
}).listen(8940, () => console.log('listening 8940'));
