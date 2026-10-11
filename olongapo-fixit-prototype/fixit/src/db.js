'use strict';
const path=require('path');
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(process.env.DB_FILE||path.join(__dirname,'..','fixit.db'));
db.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS barangays(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,address TEXT,contact TEXT,lat REAL NOT NULL,lng REAL NOT NULL,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS depts(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,pw TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN('admin','brgy','city','res')),pos TEXT,brgy INTEGER REFERENCES barangays(id),dept INTEGER REFERENCES depts(id),phone TEXT,active INTEGER DEFAULT 1,created TEXT);
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,code TEXT UNIQUE,uid INTEGER NOT NULL REFERENCES users(id),cat TEXT NOT NULL,brgy INTEGER NOT NULL REFERENCES barangays(id),descr TEXT NOT NULL,photo TEXT,loc TEXT,lat REAL,lng REAL,status TEXT NOT NULL,assignee INTEGER REFERENCES users(id),dept INTEGER REFERENCES depts(id),created TEXT,resolved TEXT,ai TEXT);
CREATE TABLE IF NOT EXISTS hist(id INTEGER PRIMARY KEY,rid INTEGER NOT NULL REFERENCES reports(id),s TEXT,rem TEXT,who INTEGER,at TEXT);
CREATE TABLE IF NOT EXISTS ev(id INTEGER PRIMARY KEY,rid INTEGER NOT NULL REFERENCES reports(id),img TEXT,descr TEXT,who INTEGER,at TEXT);
CREATE TABLE IF NOT EXISTS ovr(id INTEGER PRIMARY KEY,rid INTEGER NOT NULL REFERENCES reports(id),d TEXT,who INTEGER,rem TEXT,at TEXT,ai TEXT,conf INTEGER);
CREATE TABLE IF NOT EXISTS notifs(id INTEGER PRIMARY KEY,uid INTEGER NOT NULL,rid INTEGER,msg TEXT,read INTEGER DEFAULT 0,at TEXT);
CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY,u INTEGER,a TEXT,e TEXT,eid TEXT,dsc TEXT,at TEXT);
CREATE TABLE IF NOT EXISTS sessions(tok TEXT PRIMARY KEY,uid INTEGER NOT NULL,exp INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ix_r_b ON reports(brgy);CREATE INDEX IF NOT EXISTS ix_r_u ON reports(uid);`);
const nn=v=>v===undefined?null:v;
const all=(s,...p)=>db.prepare(s).all(...p.map(nn)),get=(s,...p)=>db.prepare(s).get(...p.map(nn)),run=(s,...p)=>db.prepare(s).run(...p.map(nn));
let depth=0;const tx=f=>{if(depth){return f()}depth=1;db.exec('BEGIN');try{const r=f();db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}finally{depth=0}};
const now=()=>new Date().toISOString();
function log(u,a,e,eid,dsc){run('INSERT INTO logs(u,a,e,eid,dsc,at) VALUES(?,?,?,?,?,?)',u,a,e,String(eid),dsc,now())}
function notify(uid,rid,msg){if(uid)run('INSERT INTO notifs(uid,rid,msg,at) VALUES(?,?,?,?)',uid,rid,msg,now())}
function histAdd(rid,s,rem,who){run('INSERT INTO hist(rid,s,rem,who,at) VALUES(?,?,?,?,?)',rid,s,rem,who,now())}
module.exports={db,nn,all,get,run,tx,now,log,notify,histAdd};
