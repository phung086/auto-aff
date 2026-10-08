// Browser regression fixture: synthetic form only, no account credentials.
import { createServer } from 'node:http';

const origin = 'http://127.0.0.1:8766';
const callback = 'http://127.0.0.1:8767';
let observedOrigin;
const form = policy => `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Kiểm tra Origin OAuth</title><h1>Kiểm tra ${policy}</h1><p>Dữ liệu giả lập, không kết nối tài khoản.</p><form method="post" action="/consent"><input type="hidden" name="code" value="fixture"><button>Gửi form kiểm tra</button></form></html>`;
const source = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/consent') {
    observedOrigin = req.headers.origin ?? '(missing)';
    req.resume();
    if (observedOrigin !== origin) {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<h1>403 Forbidden</h1><p>Origin nhận được: ${observedOrigin}</p>`);
    }
    res.writeHead(303, { Location: `${callback}/callback` });
    return res.end();
  }
  const policy = req.url === '/legacy' ? 'no-referrer' : 'strict-origin';
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Referrer-Policy': policy,
    'Content-Security-Policy': `default-src 'none'; form-action 'self' ${callback}; frame-ancestors 'none'`,
  });
  res.end(form(policy));
});
const destination = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<h1>Callback thành công</h1><p>Origin nhận được: ${observedOrigin}</p><p>Đã qua kiểm tra nguồn gửi và chuyển hướng 303.</p>`);
});
source.listen(8766, '127.0.0.1');
destination.listen(8767, '127.0.0.1');
process.stderr.write(`Mở ${origin}/legacy rồi ${origin}/fixed bằng Chrome. Ctrl+C để dừng.\n`);
const stop = () => { source.close(); destination.close(); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
