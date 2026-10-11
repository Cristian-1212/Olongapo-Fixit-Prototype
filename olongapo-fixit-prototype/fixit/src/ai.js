'use strict';
const {get}=require('./db');
const {KW}=require('./config');
function runAI(r){let sc=50;
 const photo=r.photo?(sc+=15,'Photo provided; visual check is heuristic only (no image model connected)'):(sc-=15,'Insufficient visual evidence');
 const d=(r.descr||'').toLowerCase(),k=KW[r.cat]||[];let desc;
 if(d.trim().length<15){sc-=20;desc='Description too short or unclear'}else if(!k.length||k.some(w=>d.includes(w))){sc+=20;desc='Description matches category'}else{sc-=5;desc='Description does not clearly match category'}
 const b=get('SELECT * FROM barangays WHERE id=?',r.brgy);let loc;
 if(r.lat==null||r.lat<14.75||r.lat>14.95||r.lng<120.2||r.lng>120.4){sc-=20;loc='LOCATION REQUIRES REVIEW'}
 else if(b&&Math.hypot(r.lat-b.lat,r.lng-b.lng)>0.03){sc-=8;loc='LOCATION REQUIRES REVIEW: far from selected barangay'}else{sc+=10;loc='Location appears valid'}
 const dup=get(`SELECT code FROM reports WHERE id<>? AND cat=? AND brgy=? AND status NOT IN('RESOLVED','REJECTED') AND abs(lat-?)<0.002 AND abs(lng-?)<0.002 LIMIT 1`,r.id,r.cat,r.brgy,r.lat,r.lng);
 let dp='No obvious duplicate detected';if(dup){sc-=10;dp='Possible duplicate of '+dup.code}
 sc=Math.max(5,Math.min(95,sc));const res=sc>=75?'LIKELY VALID':sc>=55?'NEEDS REVIEW':sc>=30?'SUSPICIOUS':'LIKELY INVALID';
 return{result:res,conf:sc,photo,desc,loc,dup:dp,manual:res!=='LIKELY VALID',model:'rule-based-heuristic-v1',expl:res==='LIKELY VALID'?'Proceed to official verification.':res==='NEEDS REVIEW'?'Manual verification recommended.':'MANUAL REVIEW REQUIRED'}}
module.exports={runAI};
