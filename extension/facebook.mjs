export async function graphRequest({ version, path, token, body, fetcher = fetch }) {
  if (!/^v\d+\.0$/.test(version)) throw new Error('Nhập phiên bản Graph API trong Cài đặt trước.');
  if (!token || typeof token !== 'string' || /\s/.test(token)) throw new Error('Kết nối Page bằng Page access token trước.');
  if (!/^(?:me|\d+)(?:\/feed)?$/.test(path)) throw new Error('Đích API không hợp lệ.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetcher(`https://graph.facebook.com/${version}/${path}${body ? '' : '?fields=id,name,category'}`, {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      ...(body ? { body: new URLSearchParams({ message: body, published: 'true' }).toString() } : {}), signal: controller.signal
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      const raw = String(result.error?.message || `Facebook trả mã ${response.status}.`);
      const message = raw.split(token).join('[đã ẩn token]').slice(0, 700);
      const error = new Error(message); error.confirmedFailure = true; throw error;
    }
    if (!result.id) throw new Error('Facebook chưa trả về ID. Cần kiểm tra trực tiếp trước khi gửi lại.');
    return result;
  } catch (e) {
    if (e.confirmedFailure) throw e;
    const error = new Error(body ? 'Chưa xác định được bài đã đăng hay chưa. Kiểm tra Page trước khi gửi lại.' : 'Không kết nối được Facebook. Kiểm tra token, phiên bản API và kết nối mạng.');
    error.uncertain = Boolean(body); throw error;
  } finally { clearTimeout(timeout); }
}
