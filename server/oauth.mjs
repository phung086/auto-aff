import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { InvalidGrantError, InvalidTokenError, InvalidRequestError, UnsupportedGrantTypeError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
const secret = () => randomBytes(32).toString('base64url');
export const safeEqual = (a,b) => typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class OwnerOAuth {
  constructor(ownerCode, resource, now=()=>Date.now()) { this.ownerCode=ownerCode; this.resource=resource; this.now=now; this.clients=new Map();this.consents=new Map();this.codes=new Map();this.tokens=new Map(); this.clientsStore={getClient:id=>this.clients.get(id),registerClient:async client=>{if(this.clients.size>=100) throw new InvalidRequestError('Giới hạn đăng ký. Khởi động lại để xóa client cũ.'); if(client.redirect_uris.some(u=>new URL(u).protocol!=='https:')) throw new InvalidRequestError('Callback phải dùng HTTPS.'); const full={...client,client_id:randomUUID(),client_id_issued_at:Math.floor(this.now()/1000)};this.clients.set(full.client_id,full);return full;}}; }
  async authorize(client,params,res) {
    if(params.resource&&params.resource.toString()!==this.resource) throw new InvalidRequestError('Sai resource.');
    if((params.scopes||[]).some(s=>s!=='compose')) throw new InvalidRequestError('Chỉ hỗ trợ scope compose.');
    for(const [id,c] of this.consents) if(c.expires<this.now()) this.consents.delete(id);
    if(this.consents.size>=100) throw new InvalidRequestError('Quá nhiều yêu cầu kết nối.');
    const callback=new URL(params.redirectUri);
    if(callback.protocol!=='https:' || !client.redirect_uris.includes(params.redirectUri)) throw new InvalidRequestError('Callback không thuộc client đã đăng ký.');
    const nonce=secret();this.consents.set(nonce,{client,params,expires:this.now()+300000,attempts:0});
    // Chrome applies form-action to the redirect following consent as well.
    const formPolicy=`default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${callback.origin}; frame-ancestors 'none'`;
    // no-referrer makes the browser send Origin: null on this form POST.
    // Keep only the origin as referrer (no authorize query), preserving CSRF checks.
    res.set({'Cache-Control':'no-store','Content-Security-Policy':formPolicy,'Referrer-Policy':'strict-origin'}).send(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Kết nối LinkDesk</title><style>body{font:17px system-ui;max-width:560px;margin:10vh auto;padding:24px;line-height:1.6}input,button{font:inherit;padding:12px;margin-top:12px;width:100%;box-sizing:border-box}button{background:#245a43;color:white;border:0}</style><h1>Cho phép ChatGPT biên soạn</h1><p>Client: ${esc(client.client_name||client.client_id)}</p><p>Callback: ${esc(params.redirectUri)}</p><p>Quyền: đọc yêu cầu và ghi kết quả biên soạn của bạn. Không đọc mật khẩu Facebook hoặc tự cấp quyền đăng.</p><form method="post" action="/consent"><input type="hidden" name="nonce" value="${nonce}"><label>Mã trong file owner-code.txt tại máy<input name="code" type="password" required autocomplete="off"></label><button>Kết nối ChatGPT</button></form></html>`);
  }
  consent(nonce,code) { const item=this.consents.get(nonce); if(!item||item.expires<this.now()) throw new InvalidGrantError('Yêu cầu kết nối đã hết hạn.'); item.attempts++; if(item.attempts>5) {this.consents.delete(nonce);throw new InvalidGrantError('Quá số lần nhập.');} if(!safeEqual(code,this.ownerCode)) throw new InvalidGrantError('Mã chủ sở hữu không đúng.'); this.consents.delete(nonce); const authCode=secret();this.codes.set(authCode,{...item,expires:this.now()+60000});const target=new URL(item.params.redirectUri);target.searchParams.set('code',authCode);if(item.params.state) target.searchParams.set('state',item.params.state);return target.toString(); }
  getCode(client,code) {const c=this.codes.get(code);if(!c||c.client.client_id!==client.client_id||c.expires<this.now()) throw new InvalidGrantError('Mã không hợp lệ hoặc đã dùng.');return c;}
  async challengeForAuthorizationCode(client,code){return this.getCode(client,code).params.codeChallenge;}
  async exchangeAuthorizationCode(client,code,verifier,redirectUri,resource){const c=this.getCode(client,code);if(redirectUri!==c.params.redirectUri||resource&&resource.toString()!==this.resource) throw new InvalidGrantError('Sai callback hoặc resource.');this.codes.delete(code);const token=secret();this.tokens.set(token,{clientId:client.client_id,scopes:['compose'],expiresAt:Math.floor(this.now()/1000)+86400,resource:new URL(this.resource)});return {access_token:token,token_type:'Bearer',expires_in:86400,scope:'compose'};}
  async exchangeRefreshToken(){throw new UnsupportedGrantTypeError('Kết nối lại sau 24 giờ hoặc sau khi khởi động lại.');}
  async verifyAccessToken(token){const info=this.tokens.get(token);if(!info||info.expiresAt<=this.now()/1000) throw new InvalidTokenError('Kết nối hết hạn. Kết nối lại plugin.');return info;}
  async revokeToken(client,request){const token=this.tokens.get(request.token);if(token?.clientId===client.client_id)this.tokens.delete(request.token);}
}
