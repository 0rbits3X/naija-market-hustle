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
var tab="game",S,TOP=[],NAME="",AUTH=null,CODE="";
var PHR=["Good morning, oga! 👋","Fresh goods, come and buy! 🛒","Price don drop! 📉","Price don rise! 📈","Who wan trade? 🤝","Well done! 👏","I just got promoted! 🎉","Abeg, small discount?","Rain dey fall 🌧️","Market is busy today 🔥"];
var MK=[{id:"wuse",n:"Wuse Market",t:0,m:{}},{id:"garki",n:"Garki Market",t:1,m:{rice:.85,fish:1.1}},{id:"utako",n:"Utako Market",t:2,m:{tom:1.15,pep:1.1,fish:.9}},{id:"kubwa",n:"Kubwa Market",t:2,m:{yam:.75,pep:.8,rice:1.15,fish:1.2}}];
var BAD=/fuck|fvck|shit|bitch|dick|pussy|sex|porn|nude|rape|nigg|whore|asshole|ashawo|idiot|stupid/i;
function cleanName(s){s=String(s||"").replace(/[^A-Za-z0-9 _.\-]/g,"").replace(/\s+/g," ").trim().slice(0,14);return(s.length<2||BAD.test(s.replace(/[ _.\-]/g,"")))?"":s}
var MUTED=[],REPD={};try{MUTED=JSON.parse(localStorage.getItem("mh_mute")||"[]")}catch(e){}
function msgBad(t){t=String(t||"");var l=t.toLowerCase();
 if(/https?:|www\.|\.(com|ng|net|org|io|me|co|xyz)\b|t\.me|wa\.me|@/.test(l))return"Links and emails are not allowed.";
 if(t.replace(/\D/g,"").length>=7)return"Phone numbers are not allowed.";
 if(/\b(add me|dm me|inbox me|whatsapp|telegram|snapchat|snap|instagram|insta|tiktok|my number|call me)\b/.test(l))return"Do not share contacts. Keep chat in the game.";
 if(/(fuck|shit|bitch|pussy|porn|nigg|whore|asshole|ashawo|rape|nude)/.test(l.replace(/0/g,"o").replace(/[1!]/g,"i").replace(/3/g,"e").replace(/[4@]/g,"a").replace(/[5$]/g,"s").replace(/[^a-z]/g,"")))return"Please keep it clean and kind.";
 return""}
function sadWords(t){return /kill myself|want to die|end my life|suicide|hurt myself/i.test(t)}
function shown(s){return cleanName(s)||"Trader"}
function mk(id){for(var i=0;i<MK.length;i++)if(MK[i].id==id)return MK[i];return MK[0]}
function fareOf(){return 200+S.tier*300}
function okSave(o){if(!o||typeof o!="object"||!(o.day>=1)||!(o.cash>=0)||o.cash>1e10||!(o.tier>=0&&o.tier<TIERS.length)||!o.inv)return false;var n=0;for(var j=0;j<ITEMS.length;j++){var q=o.inv[ITEMS[j].id];if(!(q>=0))return false;n+=q}return n<=TIERS[o.tier|0].cap}
try{NAME=cleanName(localStorage.getItem("mh_name"))}catch(e){}
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
 if(!(window.CFG&&CFG.google===true))return '<div class="acct">Your game saves on this phone and online. Clearing your browser can lose it.</div>';
 if(AUTH&&AUTH.anon===false)return '<div class="acct">✅ Your progress is saved with Google.<button class="s" data-a="signout">Sign out</button></div>';
 return '<div class="acct"><b>Do not lose your progress.</b> Link Google to keep your business if you clear your browser or change phone.<button class="go" data-a="glink">Save with Google</button><button class="go" data-a="gsign" style="background:transparent;color:var(--fg);border:2px solid var(--line)">I already have an account</button></div>'}
/* ---- game state ---- */
function roll(loc){var p={},m=mk(loc||"wuse").m;ITEMS.forEach(function(i){p[i.id]=Math.max(100,Math.round(i.b*(m[i.id]||1)*(1+(Math.random()*2-1)*i.v)/50)*50)});return p}
function count(){return ITEMS.reduce(function(a,i){return a+S.inv[i.id]},0)}
function worth(){return S.cash+ITEMS.reduce(function(a,i){return a+S.inv[i.id]*S.prices[i.id]},0)}
function snap(){return{day:S.day,cash:Math.round(S.cash),inv:S.inv,tier:S.tier,best:Math.round(S.best),loc:S.loc}}
function applySave(o){if(!okSave(o))return;S.loc=mk(o.loc).t<=o.tier?mk(o.loc).id:"wuse";S.day=o.day;S.cash=o.cash;S.inv=o.inv;S.tier=o.tier;S.best=o.best||0;S.prices=roll(S.loc);S.prev=null;S.ev="Welcome back to your business!"}
function newGame(){S={day:1,cash:START*1000,inv:{},tier:0,best:0,prev:null,prices:roll("wuse"),loc:"wuse",ev:"You start as a roadside hawker. Buy low, sell high, and grow your business!"};
  ITEMS.forEach(function(i){S.inv[i.id]=0})}
function saveLocal(){try{localStorage.setItem("mh_save",JSON.stringify(snap()))}catch(e){}}
var sct;function saveCloud(){clearTimeout(sct);sct=setTimeout(doCloud,1500)}
function doCloud(){if(!sbOn()||!NAME)return;
 ensureAuth().then(function(){return fetch(SB_URL+"/rest/v1/rpc/mh_sync",{method:"POST",headers:H(1),body:JSON.stringify({p_name:cleanName(NAME)||"Trader",p_best:Math.round(S.best),p_save:snap()})})}).catch(function(){})}
function loadCloud(force){if(!sbOn())return;
 ensureAuth().then(function(){return fetch(SB_URL+"/rest/v1/players?id=eq."+AUTH.id+"&select=name,save,code",{headers:H(1)})})
 .then(function(r){return r.json()}).then(function(rows){var p=rows&&rows[0];if(!p||!p.save)return;if(p.code)CODE=p.code;
  if(!NAME&&cleanName(p.name)){NAME=cleanName(p.name);try{localStorage.setItem("mh_name",NAME)}catch(e){}}
  if(force||p.save.day>S.day){applySave(p.save);saveLocal()}render()}).catch(function(){})}
function buy(id,q){var p=S.prices[id];q=Math.min(q,Math.floor(S.cash/p),TIERS[S.tier].cap-count());if(q>0){S.cash-=q*p;S.inv[id]+=q}render()}
function sell(id,q){q=Math.min(q,S.inv[id]);if(q>0){S.cash+=q*S.prices[id];S.inv[id]-=q}render()}
function next(dest){var T=TIERS[S.tier],pre="";
 if(dest&&dest!=S.loc){var d=mk(dest),fare=fareOf();if(d.t>S.tier)return;if(S.cash<fare){S.ev="Not enough cash for the fare to "+d.n+".";render();return}
  S.cash-=fare;S.loc=d.id;S.prev=null;pre="You reached "+d.n+". "}
 else S.prev=S.prices;
 S.prices=roll(S.loc);S.ev="";
 S.cash-=Math.min(S.cash,T.fee);
 if(Math.random()<.4){var e=EVENTS[Math.floor(Math.random()*EVENTS.length)];S.ev=e.t.replace("Wuse",mk(S.loc).n.split(" ")[0]);
  if(e.f)for(var k in e.f)S.prices[k]=Math.round(S.prices[k]*e.f[k]/50)*50;
  if(e.lev){S.cash-=Math.min(S.cash,T.lev);S.ev+=" You paid "+money(T.lev)+"."}}
 S.day++;if(pre)S.ev=pre+S.ev;
 if(S.cash<500&&count()==0){S.cash+=3000;S.ev="A relative lent you ₦3,000 to restart your hustle."}
 var w=worth();if(w>S.best)S.best=w;
 while(S.tier<TIERS.length-1&&w>=TIERS[S.tier+1].need){S.tier++;S.ev="🎉 Promoted! You are now a "+TIERS[S.tier].n+" "+TIERS[S.tier].e+". More stall space, higher costs."}
 saveLocal();saveCloud();render()}
function share(){var t="I'm a "+TIERS[S.tier].n+" "+TIERS[S.tier].e+" in Naija Market Hustle with "+money(worth())+" on day "+S.day+". Can you beat me?";
 if(navigator.share){navigator.share({text:t,url:location.href}).catch(function(){})}
 else if(navigator.clipboard){navigator.clipboard.writeText(t+" "+location.href).then(function(){alert("Copied! Paste it to your friends.")}).catch(function(){})}}
/* ---- leaderboard + chat ---- */
function loadLB(){if(!sbOn())return;
 fetch(SB_URL+"/rest/v1/leaderboard?select=name,best,tier&order=best.desc&limit=20",{headers:H()})
 .then(function(r){return r.json()}).then(function(rows){if(Array.isArray(rows)){TOP=rows;if(tab=="board")render()}}).catch(function(){})}
function loadChat(){if(!sbOn()||tab!="chat")return;
 fetch(SB_URL+"/rest/v1/messages?select=id,name,body,uid&hidden=eq.false&order=created_at.desc&limit=40",{headers:H()})
 .then(function(r){return r.json()}).then(function(rows){var m=document.getElementById("msgs");if(!m||!Array.isArray(rows))return;
  m.innerHTML=rows.filter(function(x){return !msgBad(x.body)&&MUTED.indexOf(x.uid)<0&&!REPD[x.id]}).reverse().map(function(x){var me=AUTH&&x.uid==AUTH.id;return '<div class="msg"><b>'+esc(shown(x.name))+'</b> '+esc(String(x.body).slice(0,100))+(me?'':' <button class="r" data-a="rep" data-id="'+esc(x.id)+'" aria-label="Report">⚑</button><button class="r" data-a="mute" data-u="'+esc(x.uid)+'" aria-label="Mute">🔇</button>')+'</div>'}).join("")||'<p class="sub">No messages yet. Say hello!</p>';m.scrollTop=m.scrollHeight}).catch(function(){})}
var lastC=0;
function sendChat(i){var t=null,txt=(PHR[i]||"").trim();if(!txt||!NAME)return;
 var bad=msgBad(txt);if(bad){alert(bad);return}
 if(sadWords(txt)){alert("We are sorry you feel this way. Please talk to a parent, teacher or someone you trust today.");return}
 if(Date.now()-lastC<5000){alert("Small small! Wait a few seconds.");return}lastC=Date.now();
 ensureAuth().then(function(){var h=H(1);h["Prefer"]="return=minimal";
  return fetch(SB_URL+"/rest/v1/messages",{method:"POST",headers:h,body:JSON.stringify({name:cleanName(NAME)||"Trader",body:txt})})})
 .then(function(r){if(!r.ok)throw 0;if(t)t.value="";loadChat()}).catch(function(){alert("Message not sent. New players wait about 2 minutes, then try again.")})}
function reportMsg(id){if(!id||!confirm("Report this message?"))return;REPD[id]=1;
 ensureAuth().then(function(){var h=H(1);h["Prefer"]="return=minimal";return fetch(SB_URL+"/rest/v1/reports",{method:"POST",headers:h,body:JSON.stringify({message_id:String(id)})})}).catch(function(){});loadChat();alert("Thanks. We will check it.")}
function muteUser(u){if(!u||!confirm("Hide all messages from this player?"))return;MUTED.push(u);try{localStorage.setItem("mh_mute",JSON.stringify(MUTED))}catch(e){}loadChat()}
setInterval(function(){if(!document.hidden)loadChat()},10000);
/* ---- screens ---- */
function nameHtml(){return '<div class="end"><div class="big">🧺</div><h2>Welcome, trader!</h2><p class="sub">Pick a name. Your progress is saved to your account, so you can come back anytime.</p><div class="row"><input id="nm" maxlength="14" placeholder="Your trader name"></div><button class="go" data-a="start">Start hustling</button></div>'}
function gameHtml(){
 if(!NAME)return nameHtml();
 var T=TIERS[S.tier],N=TIERS[S.tier+1],w=worth(),h='<div class="top"><div><h1>'+T.e+' '+T.n+'</h1><div class="sub">Day '+S.day+' · '+mk(S.loc).n+' · space '+count()+'/'+T.cap+'</div></div><div class="cash">'+money(S.cash)+'</div></div>';
 if(N){var pc=Math.max(0,Math.min(100,(w-T.need)/(N.need-T.need)*100));h+='<div class="bar"><i style="width:'+pc+'%"></i></div><div class="sub">Next: '+N.e+' '+N.n+' at '+money(N.need)+' net worth (you have '+money(w)+')</div>'}
 else h+='<div class="bar"><i style="width:100%"></i></div><div class="sub">Top rank reached! Net worth '+money(w)+'</div>';
 if(S.ev)h+='<div class="ev">'+S.ev+'</div>';
 ITEMS.forEach(function(i){var p=S.prices[i.id],d="";
  if(S.prev){var c=p-S.prev[i.id];d=c>0?' <span class="up">▲ '+c+'</span>':c<0?' <span class="dn">▼ '+(-c)+'</span>':""}
  h+='<div class="item"><div><div class="nm"><span class="em">'+i.e+'</span> '+i.n+'</div><div class="own">You have '+S.inv[i.id]+'</div></div><div class="pr">'+money(p)+d+'</div><div class="btns">'+
  '<button data-a="b" data-i="'+i.id+'" data-q="1">Buy 1</button><button data-a="b" data-i="'+i.id+'" data-q="99999">Buy max</button>'+
  '<button class="s" data-a="s" data-i="'+i.id+'" data-q="1">Sell 1</button><button class="s" data-a="s" data-i="'+i.id+'" data-q="99999">Sell all</button></div></div>'});
 h+=locsHtml()+'<button class="go" data-a="next">Next day (fee '+money(T.fee)+')</button><button class="go" data-a="share" style="background:transparent;color:var(--fg);border:2px solid var(--line)">Share my progress</button>';
 h+=acctHtml();h+='<p class="note">Playing as '+esc(NAME)+'. Best net worth: '+money(S.best)+'. Naira here is pretend money and cannot be withdrawn.</p>';
 return h}
function locsHtml(){return '<div class="locs"><div class="sub">Travel to another market (takes 1 day, fare '+money(fareOf())+'). Buy cheap here, sell dear there!</div>'+MK.filter(function(m){return m.id!=S.loc}).map(function(m){return '<button class="s" data-a="go" data-m="'+m.id+'"'+(m.t>S.tier?' disabled':'')+'>'+(m.t>S.tier?'🔒 ':'')+m.n.split(" ")[0]+'</button>'}).join("")+'</div>'}
function boardHtml(){if(!sbOn())return '<p class="sub">The leaderboard needs your Supabase keys in config.js.</p>';
 var h='<h2 style="margin:8px 0">🏆 Top traders</h2>';
 if(!TOP.length)h+='<p class="sub">No players yet. Play a few days to appear here!</p>';
 TOP.forEach(function(t,i){h+='<div class="item" style="grid-template-columns:auto 1fr auto"><b>'+(i+1)+'</b><span>'+(TIERS[t.tier]?TIERS[t.tier].e:"")+' '+esc(shown(t.name))+'</span><b>'+money(t.best)+'</b></div>'});
 return h}
function chatHtml(){if(!sbOn())return '<p class="sub">Chat needs your Supabase keys in config.js.</p>';
 if(!NAME)return '<p class="sub">Pick a trader name on the Market tab first.</p>';
 return '<div id="msgs" class="msgs"></div><div class="sub">Tap a phrase to say it:</div><div class="locs">'+PHR.map(function(p,i){return '<button class="s" data-a="send" data-p="'+i+'">'+p+'</button>'}).join("")+'</div><p class="note">Chat uses ready-made phrases only, so it stays safe. Tap ⚑ to report, 🔇 to mute.</p>'}
/* ---- gifts (small, limited, no text) ---- */
var GMSG={low_level:"You can send gifts once you reach Market stall level.",too_big:"Amount must be from ₦100 up to a small limit for your level.",not_found:"No trader has that code.",self:"You cannot send a gift to yourself.",daily_limit:"Gift limit for today reached. Try again tomorrow.",inbox_full:"That trader has too many gifts waiting. Try later.",auth:"Try again in a moment."};
function sendGift(){var c=((document.getElementById("gc")||{}).value||"").trim().toUpperCase(),n=Math.floor(+((document.getElementById("ga")||{}).value)||0);
 if(!/^[A-F0-9]{6}$/.test(c)){alert("Type the 6-character code of your friend.");return Promise.resolve()}
 if(n<100){alert("Smallest gift is "+money(100)+".");return Promise.resolve()}
 if(n>S.cash){alert("You do not have that much cash.");return Promise.resolve()}
 return ensureAuth().then(function(){return fetch(SB_URL+"/rest/v1/rpc/mh_send",{method:"POST",headers:H(1),body:JSON.stringify({p_code:c,p_amount:n})})})
  .then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(res){
   if(res==="ok"){S.cash-=n;saveLocal();saveCloud();alert("Sent "+money(n)+"! 🎁");render()}else alert(GMSG[res]||"Gift not sent.")}).catch(function(){alert("Gift not sent. Check your network.")})}
function claimGifts(){return ensureAuth().then(function(){return fetch(SB_URL+"/rest/v1/rpc/mh_claim",{method:"POST",headers:H(1),body:"{}"})})
 .then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(n){n=+n||0;if(n>0){S.cash+=n;saveLocal();saveCloud();render();alert("You got "+money(n)+" in gifts! 🎉")}else alert("No gifts waiting.")}).catch(function(){alert("Could not check gifts. Try again.")})}
function giftHtml(){if(!sbOn())return '<p class="sub">Gifts need online mode.</p>';
 if(!NAME)return '<p class="sub">Pick a trader name on the Market tab first.</p>';
 return '<h2 style="margin:8px 0">🎁 Help a friend</h2><p class="sub">Your trader code: <b>'+esc(CODE||"(play one day to get it)")+'</b>. Share it only with friends you know.</p><div class="row"><input id="gc" maxlength="6" placeholder="Friend code" autocapitalize="characters"><input id="ga" type="number" inputmode="numeric" placeholder="Amount"></div><button class="go" data-a="gsend">Send gift</button><button class="go" data-a="gget" style="background:transparent;color:var(--fg);border:2px solid var(--line)">Collect my gifts</button><p class="note">Gifts are small and limited each day. You need Market stall level to send. Naira here is pretend money and cannot be withdrawn.</p>'}
/* ---- friends rooms: free text, private, join by 6-character code ---- */
var ROOMS=[],CUR="",rTimer=null;
var RERR={links:"Links are not allowed.",phone:"Phone numbers are not allowed.",contact:"Do not share contacts. Keep chat in the game.",rude:"Please keep it clean and kind.",slow_mode:"Small small! Wait a moment.",empty:"Type something first.",not_member:"You are not in this room.",login:"Try again in a moment.",too_many_rooms:"You have too many rooms. Leave one first.",no_room:"No room has that code.",full:"That room is full (20 people).",try_again:"Try again."};
function rpc(fn,args){return ensureAuth().then(function(){return fetch(SB_URL+"/rest/v1/rpc/"+fn,{method:"POST",headers:H(1),body:JSON.stringify(args||{})})}).then(function(r){return r.json().catch(function(){return null}).then(function(j){if(!r.ok)throw(j&&j.message)||"fail";return j})})}
function rGet(path){return ensureAuth().then(function(){return fetch(SB_URL+"/rest/v1/"+path,{headers:H(1)})}).then(function(r){if(!r.ok)throw 0;return r.json()})}
function loadRooms(){if(!sbOn())return;rGet("room_members?select=room_code&order=joined_at.asc").then(function(a){ROOMS=a.map(function(x){return x.room_code});if(tab=="room"&&!CUR)render()}).catch(function(){})}
function loadRoom(){if(!sbOn()||tab!="room"||!CUR)return;
 rGet("room_messages?select=id,uid,name,body&room_code=eq."+encodeURIComponent(CUR)+"&order=created_at.desc&limit=50").then(function(rows){
  var m=document.getElementById("rmsgs");if(!m||tab!="room")return;
  m.innerHTML=rows.filter(function(x){return MUTED.indexOf(x.uid)<0&&!msgBad(x.body)}).reverse().map(function(x){var me=AUTH&&x.uid==AUTH.id;return '<div class="msg"><b>'+esc(shown(x.name))+'</b> '+esc(String(x.body).slice(0,200))+(me?'':' <button class="r" data-a="rmute" data-u="'+esc(x.uid)+'" aria-label="Mute">🔇</button>')+'</div>'}).join("")||'<p class="sub">No messages yet. Say hello!</p>';m.scrollTop=m.scrollHeight}).catch(function(){})}
function roomsHtml(){if(!sbOn())return '<p class="sub">Friends rooms need online mode.</p>';
 if(!NAME)return '<p class="sub">Pick a trader name on the Market tab first.</p>';
 if(CUR)return '<h2 style="margin:8px 0">👥 Room '+esc(CUR)+'</h2><p class="sub">Share this code only with friends you know.</p><div id="rmsgs" class="msgs"></div><div class="row"><input id="rt" maxlength="200" placeholder="Say something..." autocomplete="off"><button class="go" data-a="rsay" style="width:auto;padding:0 16px">Send</button></div><button class="go" data-a="rback" style="background:transparent;color:var(--fg);border:2px solid var(--line)">Back to my rooms</button><button class="go" data-a="rleave" style="background:transparent;color:var(--fg);border:2px solid var(--line)">Leave this room</button><p class="note">No links, phone numbers or contacts. Tap 🔇 to hide someone. Leave the room if anyone is unkind and tell a parent or teacher.</p>';
 return '<h2 style="margin:8px 0">👥 Friends rooms</h2><p class="sub">Chat freely with friends in a private room. Only people with the code can join.</p>'+(ROOMS.length?'<div class="locs">'+ROOMS.map(function(c){return '<button class="s" data-a="ropen" data-c="'+esc(c)+'">Room '+esc(c)+'</button>'}).join("")+'</div>':'<p class="sub">You are not in any room yet.</p>')+'<button class="go" data-a="rnew">Make a new room</button><div class="row"><input id="rj" maxlength="6" placeholder="Friend\'s room code" autocapitalize="characters"><button class="go" data-a="rjoin" style="width:auto;padding:0 16px">Join</button></div><p class="note">Rooms hold up to 20 people. Messages are deleted after a week.</p>'}
function roomOpen(c){CUR=c;render()}
function roomNew(){rpc("mh_room_create").then(function(c){if(ROOMS.indexOf(c)<0)ROOMS.push(c);roomOpen(c)}).catch(function(e){alert(RERR[e]||"Could not make a room. Try again.")})}
function roomJoin(){var c=((document.getElementById("rj")||{}).value||"").trim().toUpperCase();
 if(!/^[A-Z0-9]{6}$/.test(c)){alert("Type the 6-character room code.");return}
 rpc("mh_room_join",{p_code:c}).then(function(res){if(res=="ok"){if(ROOMS.indexOf(c)<0)ROOMS.push(c);roomOpen(c)}else alert(RERR[res]||"Could not join.")}).catch(function(e){alert(RERR[e]||"Could not join. Check your network.")})}
function roomLeave(){if(!CUR||!confirm("Leave this room?"))return;var c=CUR;
 rpc("mh_room_leave",{p_code:c}).then(function(){ROOMS=ROOMS.filter(function(x){return x!=c});CUR="";render()}).catch(function(){alert("Could not leave. Try again.")})}
var lastR=0;
function roomSay(){var t=document.getElementById("rt"),txt=((t||{}).value||"").trim();if(!txt||!CUR)return;
 var bad=msgBad(txt);if(bad){alert(bad);return}
 if(sadWords(txt)){alert("We are sorry you feel this way. Please talk to a parent, teacher or someone you trust today.");return}
 if(Date.now()-lastR<2000){alert("Small small! Wait a moment.");return}lastR=Date.now();
 rpc("mh_room_say",{p_code:CUR,p_name:cleanName(NAME)||"Trader",p_body:txt}).then(function(){if(t)t.value="";loadRoom()}).catch(function(e){alert(RERR[e]||"Message not sent. Check your network.")})}
function roomMute(u){if(!u||!confirm("Hide all messages from this player?"))return;MUTED.push(u);try{localStorage.setItem("mh_mute",JSON.stringify(MUTED))}catch(e){}loadRoom()}
function tabsHtml(){return '<nav class="tabs">'+[["game","🛒 Market"],["board","🏆 Top"],["chat","💬 Chat"],["room","👥 Friends"],["gift","🎁 Gifts"]].map(function(t){return '<button class="'+(tab==t[0]?"on":"")+'" data-a="tab" data-t="'+t[0]+'">'+t[1]+'</button>'}).join("")+'</nav>'}
function render(){var a=document.getElementById("app");
 clearInterval(rTimer);a.innerHTML='<div class="awn" aria-hidden="true"></div>'+tabsHtml()+(tab=="board"?boardHtml():tab=="chat"?chatHtml():tab=="room"?roomsHtml():tab=="gift"?giftHtml():gameHtml());
 if(tab=="chat")loadChat();if(tab=="room"&&CUR){loadRoom();rTimer=setInterval(function(){if(!document.hidden)loadRoom()},7000)}if(window.mh3d&&S)mh3d.update(S.inv,TIERS[S.tier].cap/2)}
document.getElementById("app").addEventListener("click",function(e){
 var b=e.target.closest("button");if(!b)return;var a=b.dataset.a;
 if(a=="b")buy(b.dataset.i,+b.dataset.q);else if(a=="s")sell(b.dataset.i,+b.dataset.q);
 else if(a=="next")next();else if(a=="go")next(b.dataset.m);else if(a=="share")share();else if(a=="send")sendChat(+b.dataset.p);else if(a=="sendt")sendChat(-1);else if(a=="rep")reportMsg(b.dataset.id);else if(a=="mute")muteUser(b.dataset.u);
 else if(a=="start"){var v=cleanName((document.getElementById("nm")||{}).value);if(!v){alert("Use 2 to 14 letters or numbers, and keep it clean.");return}NAME=v;try{localStorage.setItem("mh_name",v)}catch(x){}saveCloud();render()}
 else if(a=="rnew")roomNew();else if(a=="rjoin")roomJoin();else if(a=="ropen")roomOpen(b.dataset.c);else if(a=="rback"){CUR="";render()}else if(a=="rleave")roomLeave();else if(a=="rsay")roomSay();else if(a=="rmute")roomMute(b.dataset.u);
 else if(a=="gsend")sendGift();else if(a=="gget")claimGifts();else if(a=="glink")gLink();else if(a=="gsign")gSign();else if(a=="signout")signOut();
 else if(a=="tab"){tab=b.dataset.t;if(tab!="room")CUR="";render();if(tab=="board")loadLB();if(tab=="room")loadRooms()}});
document.getElementById("app").addEventListener("keydown",function(e){if(e.key=="Enter"){if(e.target.id=="ct")sendChat(-1);if(e.target.id=="rt")roomSay();if(e.target.id=="rj")roomJoin();if(e.target.id=="nm")document.querySelector('[data-a="start"]').click()}});
newGame();
try{var sv=JSON.parse(localStorage.getItem("mh_save")||"null");if(sv&&sv.day)applySave(sv)}catch(e){}
render();
hashLogin().then(function(ok){var f=false;try{f=ok&&localStorage.getItem("mh_restore")=="1";localStorage.removeItem("mh_restore")}catch(e){}loadCloud(f);loadLB()});
