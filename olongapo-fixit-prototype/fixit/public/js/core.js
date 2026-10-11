/* Core: helpers, API client, navigation */
const $=s=>document.getElementById(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS=['Broken Streetlight','Pothole','Damaged Road','Garbage Problem','Water Leak','Fallen Tree','Flooding','Blocked Drainage','Damaged Sidewalk','Damaged Public Facility','Road Obstruction','Other'];
const STAT=['SUBMITTED','AI ANALYZING','UNDER REVIEW','VERIFIED','ASSIGNED','IN PROGRESS','RESOLVED','REJECTED'];
let S={barangays:[],depts:[],users:[],reports:[],notifs:[],logs:[]},P={stats:{},list:[]},ME=null;
async function api(p,b){const o=b===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)};let r;try{r=await fetch('/api/'+p,o)}catch(e){throw new Error('Cannot reach the server. Check your connection.')}let j={};try{j=await r.json()}catch(e){}if(!r.ok)throw new Error(j.error||'Request failed ('+r.status+')');return j}
async function refresh(){const j=await api('state');S=j.S;ME=j.me?S.users.find(u=>u.id===j.me)||null:null}
let toastTimer;
function toast(m,type){const t=$('toast');t.textContent=m;t.className='toast show '+(type||'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.className='toast'},3800)}
async function guarded(f,mid,ok){try{await f();if(ok)toast(ok,'ok')}catch(e){const m=mid&&$(mid);if(m)m.textContent=e.message;toast(e.message,'err')}}
const uname=id=>id===0?'System':(S.users.find(u=>u.id===id)||{}).name||'—';
const bname=id=>(S.barangays.find(b=>b.id===id)||{}).name||'—';
const dname=id=>(S.depts.find(b=>b.id===id)||{}).name||'—';
function visible(u){if(!u)return[];const R=S.reports;
 if(u.role==='admin')return R;if(u.role==='brgy')return R.filter(r=>r.brgy===u.brgy);
 if(u.role==='city')return R.filter(r=>r.dept===u.dept||r.assignee===u.id);return R.filter(r=>r.uid===u.id)}
const can=r=>visible(ME).some(x=>x.id===r.id);
const staff=()=>ME&&['admin','brgy','city'].includes(ME.role);
const slug=s=>String(s).toLowerCase().replace(/[^a-z]+/g,'-');
const badge=s=>`<span class="bd s-${slug(s)}">${esc(s)}</span>`,abadge=s=>`<span class="bd a-${slug(s)}">${esc(s)}</span>`;
const fd=d=>d?new Date(d).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}):'—';
const fdate=d=>d?new Date(d).toLocaleDateString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium'}):'—';
function go(h){location.hash=h}
function goto(h){if(location.hash===h)route();else location.hash=h}
const ROLE={admin:'Super Admin',brgy:'Barangay Official',city:'City Official',res:'Resident'};
const ICON={Dashboard:'📊',Home:'🏠',Reports:'📋','My Reports':'📋','AI Queue':'🤖',Map:'🗺️',Analytics:'📈',Barangays:'🏘️',Users:'👥','AI Performance':'🧠',Logs:'🧾','Report a Problem':'➕',Alerts:'🔔',Track:'🔎'};
const STAFF=[['Dashboard','#/dash'],['Reports','#/reports'],['AI Queue','#/ai'],['Map','#/map'],['Analytics','#/analytics']];
const LINKS={admin:STAFF.concat([['Barangays','#/barangays'],['Users','#/users'],['AI Performance','#/aiperf'],['Logs','#/logs']]),brgy:STAFF,city:STAFF,res:[['Home','#/dash'],['Report a Problem','#/new'],['My Reports','#/reports'],['Track','#/track']]};
const PUBNAV=[['Home','#/'],['Track','#/track'],['Community','#/community'],['Login','#/login'],['Register','#/register']];
function nav(){
 const cur=location.hash||'#/',lk=(l,n)=>`<a class="lk ${cur===l[1]?'on':''}" href="${l[1]}">${ICON[l[0]]||'•'} ${l[0]}${n?`<span class="n">${n}</span>`:''}</a>`;
 document.body.classList.toggle('auth',!!ME);document.body.classList.remove('menu');
 if(ME){$('side').innerHTML=`<div class="sidehead"><b>${esc(ME.name)}</b><small>${ROLE[ME.role]}${ME.role==='brgy'&&ME.brgy?' · '+esc(bname(ME.brgy)):''}${ME.role==='city'&&ME.dept?' · '+esc(dname(ME.dept)):''}</small></div>`+LINKS[ME.role].map(l=>lk(l)).join('')+lk(['Alerts','#/notifs'],unread())+'<a class="lk out" href="#/logout">🚪 Logout</a>';$('pnav').innerHTML='';$('who').textContent=ME.name}
 else{$('side').innerHTML='';$('who').textContent='';$('pnav').innerHTML=PUBNAV.map(l=>`<a class="${cur===l[1]?'on':''}" href="${l[1]}">${l[0]}</a>`).join('')}}
const unread=()=>ME?S.notifs.filter(n=>n.uid===ME.id&&!n.read).length:0;
function counts(R){const o={};STAT.forEach(s=>o[s]=R.filter(r=>r.status===s).length);return o}
function bars(o){const m=Math.max(1,...Object.values(o));return Object.entries(o).map(([k,v])=>`<div>${esc(k)}: ${v}</div><div class="bar"><i style="width:${Math.max(5,v/m*100)}%">${v}</i></div>`).join('')||'<p class="mu">No data</p>'}
function group(R,f){const o={};R.forEach(r=>{const k=f(r);o[k]=(o[k]||0)+1});return o}
function guard(roles){if(!ME){go('#/login');return false}if(roles&&!roles.includes(ME.role)){$('app').innerHTML='<div class="card err">Access denied.</div>';return false}return true}
function readImg(file){return new Promise((ok,no)=>{if(!file)return ok('');if(!/^image\/(jpeg|png|webp)$/.test(file.type))return no(new Error('Only JPG, PNG or WEBP images allowed.'));if(file.size>5e6)return no(new Error('Image must be under 5 MB.'));
 const fr=new FileReader();fr.onerror=()=>no(new Error('Could not read image.'));fr.onload=()=>{const i=new Image();i.onerror=()=>no(new Error('Invalid image.'));i.onload=()=>{const s=Math.min(1,500/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*s;c.height=i.height*s;c.getContext('2d').drawImage(i,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.6))};i.src=fr.result};fr.readAsDataURL(file)})}
let PH='';
async function prev(id,pv){try{PH=await readImg($(id).files[0]);$(pv).innerHTML=PH?`<img class="ph" src="${PH}">`:''}catch(e){PH='';$(pv).innerHTML='<span class="err">'+esc(e.message)+'</span>';$(id).value=''}}
const BB=[14.78,14.90,120.22,120.34];
const px=(la,lo,w,h)=>[(lo-BB[2])/(BB[3]-BB[2])*w,(BB[1]-la)/(BB[1]-BB[0])*h];
function tbl(R,full){return `<div class="card tw"><table><tr><th>Report ID</th><th>Category</th><th>Barangay</th>${full?'<th>Resident</th>':''}<th>Date</th>${staff()?'<th>AI</th><th>Conf.</th>':''}<th>Status</th>${full?'<th>Assigned</th>':''}<th></th></tr>${R.map(r=>`<tr><td>${esc(r.code)}</td><td>${esc(r.cat)}</td><td>${esc(bname(r.brgy))}</td>${full?`<td>${esc(uname(r.uid))}</td>`:''}<td>${esc(fdate(r.created))}</td>${staff()?`<td>${abadge(r.ai.result)}</td><td>${r.ai.conf}%</td>`:''}<td>${badge(r.status)}</td>${full?`<td>${esc(r.assignee?uname(r.assignee):r.dept?dname(r.dept):'—')}</td>`:''}<td><button class="btn" onclick="go('#/r/${r.id}')">View</button></td></tr>`).join('')||'<tr><td colspan="9" class="mu">No reports.</td></tr>'}</table></div>`}
