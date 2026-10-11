process.env.PORT=3111;process.env.DB_FILE=process.env.DB_FILE||'/tmp/t.db';
const srv=require('./server.js');
const assert=require('assert');
const J=(jar)=>async(m,p,b)=>{const r=await fetch('http://localhost:3111/api/'+p,{method:m,headers:{'Content-Type':'application/json',cookie:jar.c||''},body:b?JSON.stringify(b):undefined});const sc=r.headers.get('set-cookie');if(sc)jar.c=sc.split(';')[0];let j;try{j=await r.json()}catch(e){j=null}return{s:r.status,j}};
const user=async(e,pw)=>{const jar={},f=J(jar);const r=await f('POST','login',{email:e,password:pw});assert.equal(r.s,200,e);return f};
const JPG='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//aAAgBAQAAPwA=';
(async()=>{
 await new Promise(r=>setTimeout(r,300));
 const anon=J({});assert.equal((await anon('GET','state')).j.me,null);assert.equal((await anon('POST','report',{})).s,401);
 assert.equal((await anon('POST','login',{email:'admin@fixit.ph',password:'bad'})).s,401);
 const admin=await user('admin@fixit.ph','admin123'),cap=await user('captain@fixit.ph','demo123'),sec=await user('secretary@fixit.ph','demo123'),city=await user('engineer@fixit.ph','demo123'),ana=await user('resident@fixit.ph','demo123'),ben=await user('ben@fixit.ph','demo123');
 const st=async f=>(await f('GET','state')).j.S;
 const A=await st(admin),C=await st(cap),Sc=await st(sec),Ci=await st(city),An=await st(ana),Be=await st(ben);
 console.log('reports admin/cap/sec/city/ana/ben',A.reports.length,C.reports.length,Sc.reports.length,Ci.reports.length,An.reports.length,Be.reports.length);
 assert(C.reports.every(r=>r.brgy===1)&&Sc.reports.every(r=>r.brgy===2));assert(An.reports.every(r=>r.uid===An.users.find(u=>u.email==='resident@fixit.ph').id));
 assert(An.reports.every(r=>!r.ai)&&!An.users.some(u=>u.role==='admin'||u.email&&u.email!=='resident@fixit.ph'),'resident leak');
 assert(!JSON.stringify(C).includes('pw'),'pw leak');assert.equal(C.logs.length,0);
 // cross-barangay access
 const other=A.reports.find(r=>r.brgy===2);assert.equal((await cap('POST','act',{id:other.id,s:'VERIFIED'})).s,404);
 const benRep=An.reports[0];assert.equal((await ben('GET','state')).j.S.reports.some(r=>r.id===benRep.id),false);
 assert.equal((await ana('POST','act',{id:benRep.id,s:'VERIFIED'})).s,403);assert.equal((await ana('POST','user/add',{})).s,403);assert.equal((await cap('GET','state')).s,200);
 // image access
 const ir=await fetch('http://localhost:3111/api/img/r/1');assert.equal(ir.status,401);
 // create report
 let r=await ana('POST','report',{cat:'Pothole',brgy:1,desc:'Deep pothole on the road near school',loc:'x',lat:14.8386,lng:120.2843,photo:JPG});assert.equal(r.s,200,JSON.stringify(r.j));const id=r.j.id;console.log('created',r.j.code);
 assert.equal((await ana('POST','report',{cat:'Nope',brgy:1,desc:'abcdef',lat:14.8,lng:120.2})).s,400);
 assert.equal((await ana('POST','report',{cat:'Pothole',brgy:1,desc:'abcdef',lat:14.8,lng:120.2,photo:'data:image/jpeg;base64,AAAA'})).s,400);
 assert.equal((await ana('POST','report',{cat:'Pothole',brgy:1,desc:'<script>x</script>',lat:'abc',lng:1})).s,400);
 assert.equal((await cap('POST','assign',{id,to:'d1'})).s,400);
 assert.equal((await cap('POST','act',{id,s:'IN PROGRESS'})).s,400);
 assert.equal((await cap('POST','act',{id,s:'REJECTED'})).s,400);
 assert.equal((await cap('POST','act',{id,s:'VERIFIED',rem:'ok'})).s,200);
 assert.equal((await cap('POST','assign',{id,to:'d1'})).s,200);
 assert.equal((await sec('POST','assign',{id,to:'d1'})).s,404);
 const cs=await st(city);assert(cs.reports.some(x=>x.id===id),'city sees assigned');
 assert.equal((await city('POST','act',{id,s:'IN PROGRESS'})).s,200);
 assert.equal((await city('POST','resolve',{id,rem:'Fixed'})).s,400);
 assert.equal((await city('POST','resolve',{id,rem:'Fixed',img:JPG})).s,200);
 assert.equal((await cap('POST','act',{id,s:'REJECTED',rem:'x'})).s,400);
 const rs=(await st(ana)).reports.find(x=>x.id===id);assert.equal(rs.status,'RESOLVED');assert(rs.ev[0].img);
 const nn=(await st(ana)).notifs;console.log('notifs',nn.length);assert(nn.length>=4);
 const im=await fetch('http://localhost:3111/api/img/r/'+id,{headers:{cookie:''}});assert.equal(im.status,401);
 const tr=await anon('GET','track?code='+r.j.code);assert(tr.j.found&&tr.j.resolution&&!JSON.stringify(tr.j).includes('resident'));
 const pu=await anon('GET','public');assert(pu.j.list.length>0&&!('descr' in pu.j.list[0]));
 // admin ops
 assert.equal((await admin('POST','barangay/add',{name:'Test Brgy',lat:14.83,lng:120.28})).s,200);assert.equal((await admin('POST','barangay/add',{name:'test brgy',lat:14.83,lng:120.28})).s,409);
 assert.equal((await admin('POST','user/add',{name:'O',email:'o@x.ph',password:'secret1',role:'brgy',brgy:3,pos:'Barangay Staff'})).s,200);
 assert.equal((await admin('POST','user/add',{name:'O',email:'o@x.ph',password:'secret1',role:'brgy',brgy:3})).s,409);
 const nu=await user('o@x.ph','secret1');assert.equal((await nu('GET','state')).j.S.reports.every(r=>r.brgy===3),true);
 const uid=(await st(admin)).users.find(u=>u.email==='o@x.ph').id;assert.equal((await admin('POST','user/toggle',{id:uid})).s,200);assert.equal((await nu('GET','state')).j.me,null);
 assert.equal((await admin('POST','user/toggle',{id:1})).s,400);
 const reg=J({});assert.equal((await reg('POST','register',{name:'New',email:'new@x.ph',password:'abc123'})).s,200);assert.equal((await reg('GET','state')).j.S.users.find(u=>u.email==='new@x.ph').role,'res');
 assert.equal((await ana('POST','logout',{})).s,200);assert.equal((await ana('GET','state')).j.me,null);
 const html=await (await fetch('http://localhost:3111/')).text();assert(html.includes('Olongapo FixIt'));
 console.log('ALL TESTS PASSED');srv.close();process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
