'use strict';
const {all,get,run,tx,now,histAdd,notify}=require('./db');
const {bad}=require('./security');
const {MSG}=require('./config');
const {runAI}=require('./ai');
function createReport(d){return tx(()=>{
 const id=Number(run(`INSERT INTO reports(uid,cat,brgy,descr,photo,loc,lat,lng,status,created) VALUES(?,?,?,?,?,?,?,?,'SUBMITTED',?)`,d.uid,d.cat,d.brgy,d.desc,d.photo||null,d.loc||'',d.lat,d.lng,now()).lastInsertRowid);
 const code='OF-'+new Date().getFullYear()+'-'+String(id).padStart(6,'0');run('UPDATE reports SET code=? WHERE id=?',code,id);
 histAdd(id,'SUBMITTED','Report submitted by resident',d.uid);
 const ai=runAI(get('SELECT * FROM reports WHERE id=?',id));
 run('UPDATE reports SET ai=?,status=? WHERE id=?',JSON.stringify(ai),'UNDER REVIEW',id);
 histAdd(id,'AI ANALYZING','AI preliminary check: '+ai.result+' ('+ai.conf+'%)',0);histAdd(id,'UNDER REVIEW','Awaiting official review',0);
 notify(d.uid,id,`Your report ${code} has been submitted.`);
 all('SELECT id FROM users WHERE role=? AND brgy=? AND active=1','brgy',d.brgy).forEach(o=>notify(o.id,id,`New report ${code} in your barangay.`));
 return {id,code,ai}})}
function setStatus(r,s,rem,who){run('UPDATE reports SET status=?,resolved=CASE WHEN ?=\'RESOLVED\' THEN ? ELSE resolved END WHERE id=?',s,s,now(),r.id);histAdd(r.id,s,rem,who);notify(r.uid,r.id,`${r.code}: ${MSG[s]||s}`)}
const scope=u=>u.role==='admin'?['1=1',[]]:u.role==='brgy'?['brgy=?',[u.brgy]]:u.role==='city'?['(dept=? OR assignee=?)',[u.dept,u.id]]:['uid=?',[u.id]];
const RC='id,code,uid,cat,brgy,descr,loc,lat,lng,status,assignee,dept,created,resolved,ai,(photo IS NOT NULL AND photo<>\'\') AS ph';
function getReport(u,id){const [w,p]=scope(u);const r=get(`SELECT * FROM reports WHERE id=? AND ${w}`,Number(id),...p);if(!r)bad('Report not found or access denied.',404);return r}
function shape(rows,u){if(!rows.length)return[];const ids=rows.map(r=>r.id),ph=ids.map(()=>'?').join(','),st=u.role!=='res';
 const grp=(sql)=>{const m={};all(sql,...ids).forEach(x=>(m[x.rid]=m[x.rid]||[]).push(x));return m};
 const H=grp(`SELECT rid,s,rem,who,at FROM hist WHERE rid IN(${ph}) ORDER BY id`),E=grp(`SELECT id,rid,descr,who,at,(img IS NOT NULL AND img<>'') AS has FROM ev WHERE rid IN(${ph}) ORDER BY id`),O=grp(`SELECT rid,d,who,rem,at,ai,conf FROM ovr WHERE rid IN(${ph}) ORDER BY id`);
 return rows.map(r=>({id:r.id,code:r.code,uid:r.uid,cat:r.cat,brgy:r.brgy,desc:r.descr,photo:!!r.ph,loc:r.loc,lat:r.lat,lng:r.lng,status:r.status,assignee:r.assignee,dept:r.dept,created:r.created,resolved:r.resolved,
  ai:st?JSON.parse(r.ai):undefined,ovr:st?(O[r.id]||[]).map(o=>({d:o.d,by:o.who,rem:o.rem,at:o.at,ai:o.ai,conf:o.conf})):[],
  hist:(H[r.id]||[]).map(h=>({s:h.s,rem:h.rem,by:h.who,at:h.at})),ev:(E[r.id]||[]).map(e=>({id:e.id,desc:e.descr,by:e.who,at:e.at,img:!!e.has}))}))}
const pub=x=>({id:x.id,name:x.name,role:x.role,pos:x.pos,brgy:x.brgy,dept:x.dept,active:!!x.active});
function state(u){const S={barangays:all('SELECT * FROM barangays ORDER BY id').map(b=>({...b,active:!!b.active})),depts:all('SELECT * FROM depts ORDER BY id').map(d=>({...d,active:!!d.active})),users:[],reports:[],notifs:[],logs:[]};
 if(!u)return{me:null,S};
 const [w,p]=scope(u);S.reports=shape(all(`SELECT ${RC} FROM reports WHERE ${w} ORDER BY id`,...p),u);
 const m=new Map();all("SELECT * FROM users WHERE role IN('brgy','city')").forEach(x=>m.set(x.id,pub(x)));
 if(u.role==='admin')all('SELECT * FROM users ORDER BY id').forEach(x=>m.set(x.id,{...pub(x),email:x.email,phone:x.phone,created:x.created}));
 else{if(u.role!=='res')S.reports.forEach(r=>{if(!m.has(r.uid)){const x=get('SELECT * FROM users WHERE id=?',r.uid);if(x)m.set(x.id,pub(x))}});m.set(u.id,{...pub(u),email:u.email,phone:u.phone,created:u.created})}
 S.users=[...m.values()];
 S.notifs=all('SELECT id,uid,rid,msg,read,at FROM notifs WHERE uid=? ORDER BY id DESC LIMIT 100',u.id).map(n=>({...n,read:!!n.read}));
 if(u.role==='admin')S.logs=all('SELECT u,a,e,eid AS id,dsc,at FROM logs ORDER BY id DESC LIMIT 200');
 return{me:u.id,S}}
module.exports={createReport,setStatus,scope,RC,getReport,shape,pub,state};
