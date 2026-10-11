'use strict';
const http=require('http'),fs=require('fs'),path=require('path');
const {get}=require('./src/db'),{HE,bad,authUser,need}=require('./src/security');
const {getReport}=require('./src/reports'),{R}=require('./src/routes'),{seed}=require('./src/seed');
seed();
const PORT=+process.env.PORT||3000,PUB=path.join(__dirname,'public');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
const HDR={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"};
function send(res,code,body,type,extra){res.writeHead(code,{...HDR,'Content-Type':type||'application/json','Cache-Control':'no-store',...extra});res.end(type?body:JSON.stringify(body))}
function serveStatic(res,pathname){
 const file=path.normalize(path.join(PUB,pathname==='/'?'index.html':pathname));
 if(!file.startsWith(PUB+path.sep))return send(res,404,{error:'Not found.'});
 fs.readFile(file,(err,data)=>err?send(res,404,{error:'Not found.'}):send(res,200,data,MIME[path.extname(file)]||'application/octet-stream',{'Cache-Control':'no-cache'}))}
function serveImage(req,res,m){
 const u=need(authUser(req));let d;
 if(m[1]==='r'){getReport(u,m[2]);d=(get('SELECT photo AS d FROM reports WHERE id=?',Number(m[2]))||{}).d}
 else{const e=get('SELECT rid,img AS d FROM ev WHERE id=?',Number(m[2]));if(!e)bad('Not found.',404);getReport(u,e.rid);d=e.d}
 if(!d)bad('Not found.',404);send(res,200,Buffer.from(d.slice(23),'base64'),'image/jpeg',{'Cache-Control':'private, max-age=300'})}
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://x'),raw=[];let size=0,dead=false;
 req.on('data',d=>{size+=d.length;if(size>2e6){if(!dead){dead=true;send(res,413,{error:'Request too large.'})}}else raw.push(d)});
 req.on('end',()=>{if(dead)return;try{
  if(req.method==='GET'&&!url.pathname.startsWith('/api/'))return serveStatic(res,url.pathname);
  let m=req.method==='GET'&&url.pathname.match(/^\/api\/img\/([re])\/(\d+)$/);if(m)return serveImage(req,res,m);
  const h=R[req.method+' '+url.pathname];if(!h)return send(res,404,{error:'Not found.'});
  let b={};if(req.method==='POST'){if(!/application\/json/.test(req.headers['content-type']||''))bad('JSON required.',415);
   try{b=JSON.parse(Buffer.concat(raw).toString()||'{}')}catch(e){bad('Invalid JSON.')}if(!b||typeof b!=='object'||Array.isArray(b))bad('Invalid JSON.')}
  send(res,200,h({u:authUser(req),b,q:url.searchParams},req,res)||{ok:true})
 }catch(e){if(e instanceof HE)return send(res,e.c,{error:e.message});console.error(e);send(res,500,{error:'Server error. Please try again.'})}})});
server.listen(PORT,()=>console.log('Olongapo FixIt running on http://localhost:'+PORT));
module.exports=server;
