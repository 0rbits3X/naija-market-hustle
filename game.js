var TIERS=[
{n:"Roadside hawker",e:"🧺",need:0,cap:12,fee:150,lev:2000},
{n:"Market stall",e:"🛒",need:40000,cap:35,fee:600,lev:5000},
{n:"Shop owner",e:"🏪",need:150000,cap:100,fee:2000,lev:15000},
{n:"Wholesaler",e:"🚚",need:600000,cap:250,fee:6000,lev:40000},
{n:"Business tycoon",e:"🏢",need:2500000,cap:700,fee:18000,lev:100000}];
var START=8;
var ITEMS=[
{id:"tom",n:"Tomatoes",e:"🍅",b:800,v:.45},
{id:"rice",n:"Rice (bag)",e:"🍚",b:2500,v:.3},
{id:"yam",n:"Yam",e:"🍠",b:1500,v:.35},
{id:"pep",n:"Pepper",e:"🌶️",b:1200,v:.5},
{id:"fish",n:"Fish",e:"🐟",b:3000,v:.4}];
var EVENTS=[
{t:"Heavy rain in Abuja! Tomatoes and pepper are scarce today.",f:{tom:1.7,pep:1.6}},
{t:"Sallah is near: everyone wants rice and yam.",f:{rice:1.6,yam:1.3}},
{t:"Trucks from Benue arrived early. Yam is cheap today.",f:{yam:.6}},
{t:"Power cut in Wuse: fish is cheap, sell what you can.",f:{fish:.6}},
{t:"Gridlock on Airport Road: pepper and tomatoes are late and pricey.",f:{pep:1.5,tom:1.4}},
{t:"FCT task force levy!",lev:1}];
var SB_URL=(window.CFG&&CFG.url)||"",SB_KEY=(window.CFG&&CFG.key)||"";
var tab="game",S,TOP=[],NAME="",AUTH=null;
try{NAME=localStorage.getItem("mh_name")||""}catch(e){}
function sbOn(){return SB_URL.indexOf("http")==0&&SB_KEY.length>20}
function money(n){return "₦"+Math.round(n).toLocaleString("en-NG")}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function H(auth){var h={"apikey":SB_KEY,"Content-Type":"application/json"};h["Authorization"]="Bearer "+((auth&&AUTH)?AUTH.t:SB_KEY);return h}
/* ---- accounts (anonymous sign-in: no email needed) ---- */
function authSave(j){AUTH={anon:!!(j.user&&j.user.is_anonymous),t:j.access_token,r:j.refresh_token,id:j.user.id,exp:Date.now()+(j.expires_in-60)*1000};try{localStorage.setItem("mh_auth",JSON.stringify(AUTH))}catch(e){}}
function ensureAuth(){
 if(!sbOn())return Promise.reject();
 if(AUTH&&AUTH.exp>Date.now())return Promise.resolve();
 function go(ref){return fetch(SB_URL+(ref?"/auth/v1/token?grant_type=refresh_token":"/auth/v1/signup"),{method:"POST",headers:H(),body:JSON.stringify(ref?{refresh_token:AUTH.r}:{})})
  .then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){if(!j.access_token||!j.user)throw 0;authSave(j)})}
 if(AUTH&&AUTH.r)return go(true).catch(function(){AUTH=null;try{localStorage.removeItem("mh_auth")}catch(e){}return go(false)});
 return go(false)}
try{AUTH=JSON.parse(localStorage.getItem("mh_auth")||"null")}catch(e){AUTH=null}
/* ---- Google sign-in (links your anonymous account so progress is never lost) ---- */
function backUrl(){return encodeURIComponent(location.origin+location.pathname)}
function gLink(){ensureAuth().then(function(){return fetch(SB_URL+"/auth/v1/user/identities/authorize?provider=google&redirect_to="+backUrl(),{headers:H(1)})})
 .then(function(r){return r.json()}).then(function(j){if(j&&j.url){location.href=j.url}else throw 0})
 .catch(function(){alert("Google linking is not switched on yet. In Supabase, enable the Google provider and turn on Allow manual linking.")})}
function gSign(){try{localStorage.setItem("mh_restore","1")}catch(e){}location.href=SB_URL+"/auth/v1/authorize?provider=google&redirect_to="+backUrl()}
function signOut(){if(!confirm("Sign out? Your progress stays saved in your Google account."))return;
 try{["mh_auth","mh_save","mh_name","mh_restore"].forEach(function(k){localStorage.removeItem(k)})}catch(e){}location.reload()}
function hashLogin(){
 var h=location.hash||"",q=h+"&"+(location.search||"");
 if(/error_description=/.test(q)){var m=decodeURIComponent((q.match(/error_description=([^&]+)/)||[])[1]||"").replace(/\+/g," ");
  history.replaceState(null,"",location.pathname);
  alert(/already|identity/i.test(m)?"That Google account already has a game. Tap 'I already have an account' to open it.":"Google sign-in failed: "+m);return Promise.resolve(false)}
 if(h.indexOf("access_token=")<0)return Promise.resolve(false);
 var p=new URLSearchParams(h.slice(1)),tok=p.get("access_token");
 history.replaceState(null,"",location.pathname+(location.search||""));
 return fetch(SB_URL+"/auth/v1/user",{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+tok}})
  .then(function(r){if(!r.ok)throw 0;return r.json()})
  .then(function(u){authSave({access_token:tok,refresh_token:p.get("refresh_token"),expires_in:+p.get("expires_in")||3600,user:u});return true})
  .catch(function(){alert("Google sign-in did not finish. Please try again.");return false})}
function acctHtml(){if(!sbOn())return "";
 if(AUTH&&AUTH.anon===false)return '<div class="acct">✅ Your progress is saved with Google.<button class="s" data-a="signout">Sign out</button></div>';
 return '<div class="acct"><b>Do not lose your progress.</b> Link Google to keep your business if you clear your browser or change phone.<button class="go" data-a="glink">Save with Google</button><button class="go" data-a="gsign" style="background:transparent;color:var(--fg);border:2px solid var(--line)">I already have an account</button></div>'}
/* ---- game state ---- */
function roll(){var p={};ITEMS.forEach(function(i){p[i.id]=Math.max(100,Math.round(i.b*(1+(Math.random()*2-1)*i.v)/50)*50)});return p}
function count(){return ITEMS.reduce(function(a,i){return a+S.inv[i.id]},0)}
function worth(){return S.cash+ITEMS.reduce(function(a,i){return a+S.inv[i.id]*S.prices[i.id]},0)}
function snap(){return{day:S.day,cash:Math.round(S.cash),inv:S.inv,tier:S.tier,best:Math.round(S.best)}}
function applySave(o){S.day=o.day;S.cash=o.cash;S.inv=o.inv;S.tier=o.tier;S.best=o.best||0;S.prices=roll();S.prev=null;S.ev="Welcome back to your business!"}
function newGame(){S={day:1,cash:START*1000,inv:{},tier:0,best:0,prev:null,prices:roll(),ev:"You start as a roadside hawker. Buy low, sell high, and grow your business!"};
  ITEMS.forEach(function(i){S.inv[i.id]=0})}
function saveLocal(){try{localStorage.setItem("mh_save",JSON.stringify(snap()))}catch(e){}}
function saveCloud(){if(!sbOn()||!NAME)return;
 ensureAuth().then(function(){var h=H(1);h["Prefer"]="resolution=merge-duplicates,return=minimal";
  return fetch(SB_URL+"/rest/v1/players?on_conflict=id",{method:"POST",headers:h,body:JSON.stringify({id:AUTH.id,name:NAME,best:Math.round(S.best),tier:S.tier,save:snap(),updated_at:new Date().toISOString()})})}).catch(function(){})}
function loadCloud(force){if(!sbOn())return;
 ensureAuth().then(function(){return fetch(SB_URL+"/rest/v1/players?id=eq."+AUTH.id+"&select=name,save",{headers:H(1)})})
 .then(function(r){return r.json()}).then(function(rows){var p=rows&&rows[0];if(!p||!p.save)return;
  if(!NAME&&p.name){NAME=p.name;try{localStorage.setItem("mh_name",NAME)}catch(e){}}
  if(force||p.save.day>S.day){applySave(p.save);saveLocal()}render()}).catch(function(){})}
function buy(id,q){var p=S.prices[id];q=Math.min(q,Math.floor(S.cash/p),TIERS[S.tier].cap-count());if(q>0){S.cash-=q*p;S.inv[id]+=q}render()}
function sell(id,q){q=Math.min(q,S.inv[id]);if(q>0){S.cash+=q*S.prices[id];S.inv[id]-=q}render()}
function next(){
 var T=TIERS[S.tier];S.prev=S.prices;S.prices=roll();S.ev="";
 S.cash-=Math.min(S.cash,T.fee);
 if(Math.random()<.4){var e=EVENTS[Math.floor(Math.random()*EVENTS.length)];S.ev=e.t;
  if(e.f)for(var k in e.f)S.prices[k]=Math.round(S.prices[k]*e.f[k]/50)*50;
  if(e.lev){S.cash-=Math.min(S.cash,T.lev);S.ev+=" You paid "+money(T.lev)+"."}}
 S.day++;
 if(S.cash<500&&count()==0){S.cash+=3000;S.ev="A relative lent you ₦3,000 to restart your hustle."}
 var w=worth();if(w>S.best)S.best=w;
 while(S.tier<TIERS.length-1&&w>=TIERS[S.tier+1].need){S.tier++;S.ev="🎉 Promoted! You are now a "+TIERS[S.tier].n+" "+TIERS[S.tier].e+". More stall space, higher costs."}
 saveLocal();saveCloud();render()}
function share(){var t="I'm a "+TIERS[S.tier].n+" "+TIERS[S.tier].e+" in Naija Market Hustle with "+money(worth())+" on day "+S.day+". Can you beat me?";
 if(navigator.share){navigator.share({text:t,url:location.href}).catch(function(){})}
 else if(navigator.clipboard){navigator.clipboard.writeText(t+" "+location.href).then(function(){alert("Copied! Paste it to your friends.")}).catch(function(){})}}
/* ---- leaderboard + chat ---- */
function loadLB(){if(!sbOn())return;
 fetch(SB_URL+"/rest/v1/players?select=name,best,tier&best=gt.0&order=best.desc&limit=20",{headers:H()})
 .then(function(r){return r.json()}).then(function(rows){if(Array.isArray(rows)){TOP=rows;if(tab=="board")render()}}).catch(function(){})}
function loadChat(){if(!sbOn()||tab!="chat")return;
 fetch(SB_URL+"/rest/v1/messages?select=name,body&order=created_at.desc&limit=40",{headers:H()})
 .then(function(r){return r.json()}).then(function(rows){var m=document.getElementById("msgs");if(!m||!Array.isArray(rows))return;
  m.innerHTML=rows.reverse().map(function(x){return '<div class="msg"><b>'+esc(x.name)+'</b> '+esc(x.body)+'</div>'}).join("")||'<p class="sub">No messages yet. Say hello!</p>';m.scrollTop=m.scrollHeight}).catch(function(){})}
function sendChat(){var t=document.getElementById("ct"),txt=((t&&t.value)||"").trim().slice(0,200);
 if(!txt||!NAME)return;if(/https?:|www\.|\.com/i.test(txt)){alert("Links are not allowed in chat.");return}
 ensureAuth().then(function(){var h=H(1);h["Prefer"]="return=minimal";
  return fetch(SB_URL+"/rest/v1/messages",{method:"POST",headers:h,body:JSON.stringify({name:NAME,body:txt})})})
 .then(function(r){if(!r.ok)throw 0;t.value="";loadChat()}).catch(function(){alert("Message not sent. Try again.")})}
setInterval(loadChat,4000);
/* ---- screens ---- */
function nameHtml(){return '<div class="end"><div class="big">🧺</div><h2>Welcome, trader!</h2><p class="sub">Pick a name. Your progress is saved to your account, so you can come back anytime.</p><div class="row"><input id="nm" maxlength="14" placeholder="Your trader name"></div><button class="go" data-a="start">Start hustling</button></div>'}
function gameHtml(){
 if(!NAME)return nameHtml();
 var T=TIERS[S.tier],N=TIERS[S.tier+1],w=worth(),h='<div class="top"><div><h1>'+T.e+' '+T.n+'</h1><div class="sub">Day '+S.day+' · stall space '+count()+'/'+T.cap+'</div></div><div class="cash">'+money(S.cash)+'</div></div>';
 if(N){var pc=Math.max(0,Math.min(100,(w-T.need)/(N.need-T.need)*100));h+='<div class="bar"><i style="width:'+pc+'%"></i></div><div class="sub">Next: '+N.e+' '+N.n+' at '+money(N.need)+' net worth (you have '+money(w)+')</div>'}
 else h+='<div class="bar"><i style="width:100%"></i></div><div class="sub">Top rank reached! Net worth '+money(w)+'</div>';
 if(S.ev)h+='<div class="ev">'+S.ev+'</div>';
 ITEMS.forEach(function(i){var p=S.prices[i.id],d="";
  if(S.prev){var c=p-S.prev[i.id];d=c>0?' <span class="up">▲ '+c+'</span>':c<0?' <span class="dn">▼ '+(-c)+'</span>':""}
  h+='<div class="item"><div><div class="nm"><span class="em">'+i.e+'</span> '+i.n+'</div><div class="own">You have '+S.inv[i.id]+'</div></div><div class="pr">'+money(p)+d+'</div><div class="btns">'+
  '<button data-a="b" data-i="'+i.id+'" data-q="1">Buy 1</button><button data-a="b" data-i="'+i.id+'" data-q="99999">Buy max</button>'+
  '<button class="s" data-a="s" data-i="'+i.id+'" data-q="1">Sell 1</button><button class="s" data-a="s" data-i="'+i.id+'" data-q="99999">Sell all</button></div></div>'});
 h+='<button class="go" data-a="next">Next day (fee '+money(T.fee)+')</button><button class="go" data-a="share" style="background:transparent;color:var(--fg);border:2px solid var(--line)">Share my progress</button>';
 h+=acctHtml();h+='<p class="note">Playing as '+esc(NAME)+'. Best net worth: '+money(S.best)+'. Naira here is pretend money and cannot be withdrawn.</p>';
 return h}
function boardHtml(){if(!sbOn())return '<p class="sub">The leaderboard needs your Supabase keys in config.js.</p>';
 var h='<h2 style="margin:8px 0">🏆 Top traders</h2>';
 if(!TOP.length)h+='<p class="sub">No players yet. Play a few days to appear here!</p>';
 TOP.forEach(function(t,i){h+='<div class="item" style="grid-template-columns:auto 1fr auto"><b>'+(i+1)+'</b><span>'+(TIERS[t.tier]?TIERS[t.tier].e:"")+' '+esc(t.name)+'</span><b>'+money(t.best)+'</b></div>'});
 return h}
function chatHtml(){if(!sbOn())return '<p class="sub">Chat needs your Supabase keys in config.js.</p>';
 if(!NAME)return '<p class="sub">Pick a trader name on the Market tab first.</p>';
 return '<div id="msgs" class="msgs"></div><div class="row"><input id="ct" maxlength="200" placeholder="Say something as '+esc(NAME)+'..."></div><button class="go" data-a="send">Send</button><p class="note">Be kind. No links or personal info.</p>'}
function tabsHtml(){return '<nav class="tabs">'+[["game","🛒 Market"],["board","🏆 Top"],["chat","💬 Chat"]].map(function(t){return '<button class="'+(tab==t[0]?"on":"")+'" data-a="tab" data-t="'+t[0]+'">'+t[1]+'</button>'}).join("")+'</nav>'}
function render(){var a=document.getElementById("app");
 a.innerHTML='<div class="awn" aria-hidden="true"></div>'+tabsHtml()+(tab=="board"?boardHtml():tab=="chat"?chatHtml():gameHtml());
 if(tab=="chat")loadChat();if(window.mh3d&&S)mh3d.update(S.inv,TIERS[S.tier].cap/2)}
document.getElementById("app").addEventListener("click",function(e){
 var b=e.target.closest("button");if(!b)return;var a=b.dataset.a;
 if(a=="b")buy(b.dataset.i,+b.dataset.q);else if(a=="s")sell(b.dataset.i,+b.dataset.q);
 else if(a=="next")next();else if(a=="share")share();else if(a=="send")sendChat();
 else if(a=="start"){var v=((document.getElementById("nm")||{}).value||"").trim().slice(0,14);if(!v){alert("Please type a name.");return}NAME=v;try{localStorage.setItem("mh_name",v)}catch(x){}saveCloud();render()}
 else if(a=="glink")gLink();else if(a=="gsign")gSign();else if(a=="signout")signOut();
 else if(a=="tab"){tab=b.dataset.t;render();if(tab=="board")loadLB()}});
document.getElementById("app").addEventListener("keydown",function(e){if(e.key=="Enter"){if(e.target.id=="ct")sendChat();if(e.target.id=="nm")document.querySelector('[data-a="start"]').click()}});
newGame();
try{var sv=JSON.parse(localStorage.getItem("mh_save")||"null");if(sv&&sv.day)applySave(sv)}catch(e){}
render();
hashLogin().then(function(ok){var f=false;try{f=ok&&localStorage.getItem("mh_restore")=="1";localStorage.removeItem("mh_restore")}catch(e){}loadCloud(f);loadLB()});
