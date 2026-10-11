/* App bootstrap: router and startup */
let routeN=0;
async function route(){
 const h=location.hash||'#/',p=h.split('/'),v=p[1]||'',A=$('app'),n=++routeN;A.classList.add('busy');
 try{
  await Promise.all([refresh(),api('public').then(x=>{P=x})]);if(n!==routeN)return;
  if(v==='logout'){await api('logout',{});ME=null;S.reports=[];toast('You have been logged out.');return go('#/')}
  if(ME&&(v==='login'||v==='register'))return go('#/dash');
  nav();window.scrollTo(0,0);
  const V={'':home,track:track,community:community,login:login,register:register,dash:dash,reports:reports,new:newRep,notifs:notifs,ai:()=>reports('ai'),map:mapV,analytics:analytics,barangays:barangays,users:users,aiperf:aiperf,logs:logs,r:()=>detail(+p[2]),b:()=>bprofile(+p[2])};
  await (V[v]||home)();
 }catch(e){nav();A.innerHTML='<div class="card err">'+esc(e.message)+'</div>'}
 finally{if(n===routeN)A.classList.remove('busy')}}
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.target.tagName!=='INPUT')return;const c=e.target.closest('[data-enter]');if(c&&typeof window[c.dataset.enter]==='function'){e.preventDefault();window[c.dataset.enter]()}});
addEventListener('hashchange',route);
route();
