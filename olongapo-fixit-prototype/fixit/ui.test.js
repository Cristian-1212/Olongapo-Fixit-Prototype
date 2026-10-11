// UI smoke test (needs: npm i -D jsdom). Boots the server on a temp DB and drives the real pages.
process.env.PORT=process.env.PORT||3112;process.env.DB_FILE='/tmp/ui.db';
const fs=require('fs');for(const f of ['','-wal','-shm'])try{fs.unlinkSync('/tmp/ui.db'+f)}catch(e){}
const srv=require('./server.js'),{JSDOM,VirtualConsole}=require('jsdom'),assert=require('assert');
const base='http://localhost:'+process.env.PORT+'/',errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function open(){const jar={};const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/not implemented/i.test(e.message))errors.push('jsdom: '+e.message)});vc.on('error',m=>errors.push('console: '+m));
 const dom=await JSDOM.fromURL(base,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.fetch=async(u,o={})=>{const r=await fetch(new URL(u,base),{...o,headers:{...(o.headers||{}),cookie:jar.c||''}});const sc=r.headers.get('set-cookie');if(sc)jar.c=sc.split(';')[0].startsWith('sid=;')?'':sc.split(';')[0];return r};
  w.scrollTo=()=>{};w.alert=m=>errors.push('alert: '+m);w.confirm=()=>true;w.prompt=()=>'newpass1';
  w.addEventListener('error',e=>errors.push('window: '+e.message))}});
 const w=dom.window;await until(()=>w.document.getElementById('app').innerHTML.length>50);return w}
async function until(f,t=4000){const s=Date.now();while(Date.now()-s<t){try{if(f())return}catch(e){}await sleep(40)}throw new Error('timeout: '+f)}
async function visit(w,h,allowErr){const before=w.document.getElementById('app').innerHTML;if(w.location.hash===h)w.route();else w.location.hash=h;await sleep(30);await until(()=>!w.document.getElementById('app').classList.contains('busy'));await sleep(60);
 const html=w.document.getElementById('app').innerHTML;assert(html.length>30,'empty page '+h);assert(allowErr||!/class="card err"/.test(html),'error page '+h+': '+html.slice(0,200));return html}
const $=(w,id)=>w.document.getElementById(id);
async function login(w,e,p){console.log('login',e,w.location.hash);await visit(w,'#/login');$(w,'le').value=e;$(w,'lp').value=p;w.doLogin();await until(()=>w.location.hash==='#/dash'&&w.eval('ME'));await sleep(200)}
(async()=>{
 await sleep(300);
 // public
 let w=await open();for(const h of ['#/','#/track','#/community','#/login','#/register'])await visit(w,h);
 $(w,'tc')||await visit(w,'#/track');$(w,'tc').value='OF-2026-000001';await w.doTrack();await sleep(200);assert(/OF-2026-000001/.test($(w,'tr').innerHTML),'track');
 await visit(w,'#/dash');assert.equal(w.location.hash,'#/login','guard redirect');
 $(w,'le').value='admin@fixit.ph';$(w,'lp').value='wrong';await w.doLogin();await sleep(300);assert(/Invalid/.test($(w,'lm').textContent),'bad login msg');
 // admin
 w=await open();await login(w,'admin@fixit.ph','admin123');
 for(const h of ['#/dash','#/reports','#/ai','#/map','#/analytics','#/barangays','#/b/1','#/users','#/aiperf','#/logs','#/notifs','#/r/1','#/r/3'])await visit(w,h);
 assert(w.document.body.classList.contains('auth'),'sidebar layout');
 await visit(w,'#/barangays');$(w,'bn').value='UI Test Brgy';$(w,'bla').value='14.83';$(w,'blo').value='120.28';await w.addB();await sleep(400);assert(/UI Test Brgy/.test($(w,'app').innerHTML),'barangay added');
 await visit(w,'#/users');$(w,'on').value='UI Official';$(w,'oe').value='ui@x.ph';$(w,'opw').value='secret1';$(w,'or').value='brgy';$(w,'ob').value='3';await w.addO();await sleep(400);assert(/ui@x.ph/.test($(w,'app').innerHTML),'official added');
 await w.rstU(7);await sleep(300);await w.togU(7);await sleep(300);await w.togU(7);await sleep(300);
 await visit(w,'#/reports');$(w,'fs').value='VERIFIED';w.applyF('');await sleep(100);assert(/OF-2026-000002/.test($(w,'app').innerHTML),'filter');
 await visit(w,'#/logout');await until(()=>!w.eval('ME'));
 // barangay official: full report lifecycle
 w=await open();await login(w,'captain@fixit.ph','demo123');
 for(const h of ['#/dash','#/reports','#/ai','#/map','#/analytics','#/notifs','#/r/3'])await visit(w,h);
 assert(!/OF-2026-000005/.test(await visit(w,'#/reports')),'other barangay report visible');
 await visit(w,'#/r/5',true);assert(/access denied|not found/i.test($(w,'app').innerHTML),'cross-barangay detail blocked');
 await visit(w,'#/r/3');$(w,'rm').value='Confirmed on site';await w.act(3,'VERIFIED');await sleep(500);assert(/VERIFIED/.test($(w,'app').innerHTML),'verified');
 $(w,'as').value='d1';await w.assign(3);await sleep(500);assert(/City Engineering/.test($(w,'app').innerHTML),'assigned');
 await w.act(3,'IN PROGRESS');await sleep(500);
 $(w,'rr').value='Fixed';await w.resolve(3);await sleep(300);assert(/photo are required|required/i.test($(w,'am').textContent),'resolve needs photo');
 await visit(w,'#/logout');await until(()=>!w.eval('ME'));
 // resident: submit + track
 w=await open();await login(w,'resident@fixit.ph','demo123');
 for(const h of ['#/dash','#/reports','#/new','#/notifs','#/track','#/r/1'])await visit(w,h);
 assert(!/AI Verification/.test(await visit(w,'#/r/1')),'resident sees AI');
 await visit(w,'#/new');$(w,'nc').value='Pothole';$(w,'nd').value='Big pothole in front of the school gate';$(w,'nb').value='1';w.useBrgy();await w.subRep();await sleep(500);
 const ok=$(w,'app').innerHTML;assert(/successfully submitted/.test(ok),'submit: '+ok.slice(0,150));
 await visit(w,'#/new');await w.subRep();await sleep(200);assert(/select a barangay/i.test($(w,'nm').textContent),'barangay required');
 await visit(w,'#/notifs');await sleep(100);
 // city + register
 w=await open();await login(w,'engineer@fixit.ph','demo123');for(const h of ['#/dash','#/reports','#/ai','#/map','#/analytics'])await visit(w,h);
 await visit(w,'#/users',true);assert(/Access denied/.test($(w,'app').innerHTML),'city blocked from users');
 w=await open();await visit(w,'#/register');$(w,'rn').value='Reg User';$(w,'re').value='reg@x.ph';$(w,'rp').value='abc123';$(w,'rc').value='abc123';await w.doReg();await until(()=>w.eval('ME'));await visit(w,'#/dash');
 console.log(errors.length?'ERRORS:\n'+errors.join('\n'):'no runtime errors');
 assert.equal(errors.length,0);console.log('UI TESTS PASSED');srv.close();process.exit(0)
})().catch(e=>{console.error('UI FAIL:',e.stack);console.error(errors.join('\n'));process.exit(1)});
