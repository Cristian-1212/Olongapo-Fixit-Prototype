'use strict';
const crypto=require('crypto');
const {get,run}=require('./db');
class HE extends Error{constructor(c,m){super(m);this.c=c}}
const bad=(m,c=400)=>{throw new HE(c,m)};
const hashPw=p=>{const s=crypto.randomBytes(16).toString('hex');return s+':'+crypto.scryptSync(p,s,32).toString('hex')};
const checkPw=(p,st)=>{const [s,h]=String(st).split(':');if(!s||!h)return false;const a=Buffer.from(h,'hex'),b=crypto.scryptSync(p,s,32);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const jpegOk=d=>{if(typeof d!=='string'||d.length>1200000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(d))return false;const b=Buffer.from(d.slice(23,60),'base64');return b[0]===0xFF&&b[1]===0xD8&&b[2]===0xFF};
const str=(v,min,max,label)=>{v=typeof v==='string'?v.trim():'';if(v.length<min||v.length>max)bad(v.length?label+' is too long (max '+max+' characters).':label+' is required.');return v};
const num=(v,a,b,l)=>{v=Number(v);if(!Number.isFinite(v)||v<a||v>b)bad(l+' is invalid.');return v};
function cookie(req,n){const m=(req.headers.cookie||'').split(/;\s*/).find(c=>c.startsWith(n+'='));return m?m.slice(n.length+1):null}
function authUser(req){const t=cookie(req,'sid');if(!t||!/^[a-f0-9]{64}$/.test(t))return null;const s=get('SELECT * FROM sessions WHERE tok=? AND exp>?',t,Date.now());if(!s)return null;const u=get('SELECT * FROM users WHERE id=? AND active=1',s.uid);return u||null}
function startSession(res,req,uid){const t=crypto.randomBytes(32).toString('hex');run('DELETE FROM sessions WHERE exp<?',Date.now());run('INSERT INTO sessions VALUES(?,?,?)',t,uid,Date.now()+6048e5);
 const sec=(process.env.NODE_ENV==='production'||req.headers['x-forwarded-proto']==='https')?'; Secure':'';res.setHeader('Set-Cookie',`sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${sec}`)}
const need=(u,roles)=>{if(!u)bad('Please log in.',401);if(roles&&!roles.includes(u.role))bad('Access denied.',403);return u};
module.exports={HE,bad,hashPw,checkPw,jpegOk,str,num,cookie,authUser,startSession,need};
