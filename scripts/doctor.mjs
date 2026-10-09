// Read-only, local-only setup diagnostics. Never asks for or prints credentials.
import { collectLocalPreflight } from './local-preflight.mjs';

const detail = {
  NODE_SUPPORTED: 'Node.js 22+ da san sang.',
  REQUIRES_NODE_22: 'Can Node.js phien ban 22 tro len.',
  DEVICE_AUTH_GUARD: 'Device API phan hoi 401 dung ky vong; CHUA xac minh MCP/ChatGPT.',
  DEVICE_UNPROTECTED: 'Device API phan hoi 200 khong can token; KIEM TRA bao ve truy cap.',
  WORKER_UI_ONLY: 'Trang AI worker phan hoi; CHUA xac minh OAuth, model hay inference.',
  LOCAL_HOST_ORIGIN_GUARD: 'Nhan 403; kiem tra Host/Origin va tien trinh dung.',
  UNEXPECTED_HTTP_STATUS: 'Local service phan hoi trang thai khong mong doi.',
  LOCAL_TIMEOUT: 'Local service khong phan hoi trong gioi han thoi gian.',
  LOCAL_UNREACHABLE: 'Khong ket noi duoc dich vu local; kiem tra thu cong.',
};

const result = await collectLocalPreflight();
process.stdout.write('LinkDesk local preflight (chi doc, khong khoi dong/ket noi tai khoan)\n');
process.stdout.write('[' + result.node.state + '] ' + detail[result.node.reason] + '\n');
for (const file of result.files) {
  const state = file.state === 'present' ? 'CO' : file.state === 'unexpected_type' ? 'KHONG PHAI FILE' : 'THIEU/CHUA TRUY CAP';
  process.stdout.write('[' + state + '] ' + file.id + '\n');
}
for (const service of result.services)
  process.stdout.write('[' + service.state + '] ' + service.id + ': ' + detail[service.reason] +
    (service.httpStatus ? ' (HTTP ' + service.httpStatus + ')' : '') + '\n');
process.stdout.write('Luu y: preflight khong kiem tra token, quyen MCP, Facebook, ngrok hay viec AI thuc su hoat dong.\n');
