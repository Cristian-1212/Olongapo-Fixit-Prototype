'use strict';
const {tx,run,get,all,now,log}=require('./db');
const {hashPw}=require('./security');
const {createReport,setStatus}=require('./reports');
function seed(){if(get('SELECT id FROM users LIMIT 1'))return;tx(()=>{
 const B=[['Barretto',14.8386,120.2843],['East Bajac-Bajac',14.8296,120.2860],['West Bajac-Bajac',14.8330,120.2790],['East Tapinac',14.8300,120.2900],['West Tapinac',14.8280,120.2830],['Gordon Heights',14.8500,120.2900],['New Cabalan',14.8440,120.3010],['Kalaklan',14.8240,120.2780]];
 B.forEach(b=>run('INSERT INTO barangays(name,address,contact,lat,lng) VALUES(?,?,?,?,?)',b[0],'Brgy. '+b[0]+', Olongapo City','(047) 222-0010',b[1],b[2]));
 ['City Engineering Office','Public Services Office','Environment Office','Disaster Risk Reduction and Management Office','General Services Office'].forEach(n=>run('INSERT INTO depts(name) VALUES(?)',n));
 const U=(n,e,p,r,pos,b,d)=>run('INSERT INTO users(name,email,pw,role,pos,brgy,dept,phone,created) VALUES(?,?,?,?,?,?,?,?,?)',n,e,hashPw(p),r,pos,b,d,'09170000000',now());
 U('Super Admin','admin@fixit.ph','admin123','admin','System Admin');U('Juan Dela Cruz','captain@fixit.ph','demo123','brgy','Barangay Captain',1);U('Maria Santos','secretary@fixit.ph','demo123','brgy','Barangay Secretary',2);
 U('Pedro Reyes','engineer@fixit.ph','demo123','city','City Government Official',null,1);U('Ana Resident','resident@fixit.ph','demo123','res','Resident');U('Ben Resident','ben@fixit.ph','demo123','res','Resident');
 const ex=[['Pothole',1,'Large pothole near the barangay road entrance that vehicles avoid.','RESOLVED'],['Broken Streetlight',1,'Streetlight beside the road is damaged, the whole street is dark.','VERIFIED'],['Broken Streetlight',1,'Another streetlight bulb broken near the court, dark at night.','UNDER REVIEW'],['Garbage Problem',2,'Garbage piling up near the market, waste overflowing.','IN PROGRESS'],['Water Leak',3,'Pipe leak, water flowing on the street.','UNDER REVIEW'],['Other',7,'asdf','UNDER REVIEW'],['Flooding',1,'Flood water after rain not draining, canal clogged.','UNDER REVIEW'],['Broken Streetlight',1,'Streetlight lamp not working near the corner.','UNDER REVIEW']];
 ex.forEach((e,i)=>{const b=B[e[1]-1],c=createReport({uid:5+i%2,cat:e[0],brgy:e[1],desc:e[2],loc:'Near main road, Brgy '+b[0],lat:b[1]+(i%3)*0.0004,lng:b[2]+(i%2)*0.0004}),r=get('SELECT * FROM reports WHERE id=?',c.id);
  if(e[3]!=='UNDER REVIEW'){setStatus(r,e[3]==='RESOLVED'||e[3]==='IN PROGRESS'?'VERIFIED':e[3],'Demo data',2);if(e[3]==='IN PROGRESS'||e[3]==='RESOLVED')setStatus(r,'IN PROGRESS','Demo data',2);if(e[3]==='RESOLVED'){run('INSERT INTO ev(rid,descr,who,at) VALUES(?,?,?,?)',r.id,'Pothole filled and leveled.',2,now());setStatus(r,'RESOLVED','Pothole filled and leveled.',2)}}});
 all('SELECT id,status FROM reports ORDER BY id').forEach(r=>{const t=Date.now()-(9-r.id)*2.5*864e5;run('UPDATE reports SET created=? WHERE id=?',new Date(t).toISOString(),r.id);if(r.status==='RESOLVED')run('UPDATE reports SET resolved=? WHERE id=?',new Date(t+30*36e5).toISOString(),r.id)});
 log(0,'SEED','system',0,'Demo data created')})}
module.exports={seed};
