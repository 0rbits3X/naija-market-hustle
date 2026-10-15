var MAX=30,CAP=60,START=20000,FEE=1000;
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
{t:"FCT task force levy: you paid ₦2,000.",fee:2000},
{t:"Gridlock on Airport Road: pepper and tomatoes are late and pricey.",f:{pep:1.5,tom:1.4}}];
var tab="game",S,best=0,LB=null,UID=null,TOP=[],saved=false,NAME="";
try{NAME=localStorage.getItem("mh_name")||""}catch(e){}
try{best=+localStorage.getItem("mh_best")||0}catch(e){}
var SB_URL=(window.CFG&&CFG.url)||"",SB_KEY=(window.CFG&&CFG.key)||"";
function sbOn(){return SB_URL.indexOf("http")==0&&SB_KEY.length>20}
function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json"}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function loadLB(){if(!sbOn())return;
 fetch(SB_URL+"/rest/v1/scores?select=name,score&order=score.desc&limit=10",{headers:sbH()})
 .then(function(r){return r.json()}).then(function(rows){if(Array.isArray(rows)){TOP=rows;if(tab=="board"||(S&&S.over))render()}}).catch(function(){})}
function saveScore(){var el=document.getElementById("nm"),n=((el&&el.value)||"").trim().slice(0,14)||"Trader",w=Math.round(worth());
 NAME=n;try{localStorage.setItem("mh_name",n)}catch(e){}
 var h=sbH();h["Prefer"]="return=minimal";
 fetch(SB_URL+"/rest/v1/scores",{method:"POST",headers:h,body:JSON.stringify({name:n,score:w})})
 .then(function(r){if(!r.ok)throw 0;saved=true;loadLB();render()})
 .catch(function(){alert("Could not save your score. Check your connection and try again.")})}
function lbHtml(){if(!sbOn())return "";
 var h='<div style="text-align:left;margin:16px 0">';
 if(!saved)h+='<input id="nm" maxlength="14" placeholder="Your name" value="'+esc(NAME)+'" style="width:100%;padding:12px;border-radius:9px;border:2px solid var(--line);background:var(--card);color:var(--fg);font:inherit"><button class="go" data-a="save">Save to leaderboard</button>';
 h+='<h3 style="margin:16px 0 6px">Top traders</h3>';
 if(!TOP.length)h+='<p class="sub">No scores yet. Be the first!</p>';
 TOP.forEach(function(t,i){h+='<div class="item" style="grid-template-columns:auto 1fr auto"><b>'+(i+1)+'</b><span>'+esc(t.name)+'</span><b>'+money(t.score)+'</b></div>'});
 return h+'</div>'}
if(sbOn())loadLB();
function tabsHtml(){return '<nav class="tabs">'+[["game","🛒 Market"],["board","🏆 Top"],["chat","💬 Chat"]].map(function(t){return '<button class="'+(tab==t[0]?"on":"")+'" data-a="tab" data-t="'+t[0]+'">'+t[1]+'</button>'}).join("")+'</nav>'}
function boardHtml(){if(!sbOn())return '<p class="sub">The leaderboard needs your Supabase keys. Add them in the file, then it will show here.</p>';
 var h='<h2 style="margin:8px 0">🏆 Top traders</h2>';
 if(!TOP.length)h+='<p class="sub">No scores yet. Finish a game to be the first!</p>';
 TOP.forEach(function(t,i){h+='<div class="item" style="grid-template-columns:auto 1fr auto"><b>'+(i+1)+'</b><span>'+esc(t.name)+'</span><b>'+money(t.score)+'</b></div>'});
 return h}
function chatHtml(){if(!sbOn())return '<p class="sub">Chat needs your Supabase keys. Add them in the file, then it will show here.</p>';
 return '<div id="msgs" class="msgs"></div><div class="row"><input id="cn" maxlength="14" placeholder="Name" value="'+esc(NAME)+'"><input id="ct" maxlength="200" placeholder="Say something..."></div><button class="go" data-a="send">Send</button><p class="note">Be kind. No links or personal info.</p>'}
function loadChat(){if(!sbOn()||tab!="chat")return;
 fetch(SB_URL+"/rest/v1/messages?select=name,body&order=created_at.desc&limit=40",{headers:sbH()})
 .then(function(r){return r.json()}).then(function(rows){var m=document.getElementById("msgs");if(!m||!Array.isArray(rows))return;
  m.innerHTML=rows.reverse().map(function(x){return '<div class="msg"><b>'+esc(x.name)+'</b> '+esc(x.body)+'</div>'}).join("")||'<p class="sub">No messages yet. Say hello!</p>';m.scrollTop=m.scrollHeight}).catch(function(){})}
function sendChat(){var t=document.getElementById("ct"),n=document.getElementById("cn"),txt=((t&&t.value)||"").trim().slice(0,200),nm=((n&&n.value)||"").trim().slice(0,14)||"Trader";
 if(!txt)return;if(/https?:|www\.|\.com/i.test(txt)){alert("Links are not allowed in chat.");return}
 NAME=nm;try{localStorage.setItem("mh_name",nm)}catch(e){}
 var h=sbH();h["Prefer"]="return=minimal";
 fetch(SB_URL+"/rest/v1/messages",{method:"POST",headers:h,body:JSON.stringify({name:nm,body:txt})}).then(function(r){if(!r.ok)throw 0;t.value="";loadChat()}).catch(function(){alert("Message not sent. Try again.")})}
setInterval(loadChat,4000);
function render(){var a=document.getElementById("app");
 a.innerHTML='<div class="awn" aria-hidden="true"></div>'+tabsHtml()+(tab=="board"?boardHtml():tab=="chat"?chatHtml():gameHtml());
 if(tab=="chat")loadChat();if(window.mh3d&&S)mh3d.update(S.inv)}
function money(n){return "₦"+Math.round(n).toLocaleString("en-NG")}
function roll(){
  var p={};ITEMS.forEach(function(i){p[i.id]=Math.max(100,Math.round(i.b*(1+(Math.random()*2-1)*i.v)/50)*50)});
  return p}
function newGame(){S={day:1,cash:START,inv:{},prev:null,ev:"Welcome to Wuse Market! Buy low, sell high. You have 30 days to build your stall.",prices:roll(),over:false};
  ITEMS.forEach(function(i){S.inv[i.id]=0});render()}
function count(){return ITEMS.reduce(function(a,i){return a+S.inv[i.id]},0)}
function worth(){return S.cash+ITEMS.reduce(function(a,i){return a+S.inv[i.id]*S.prices[i.id]},0)}
function buy(id,q){var p=S.prices[id];q=Math.min(q,Math.floor(S.cash/p),CAP-count());if(q>0){S.cash-=q*p;S.inv[id]+=q}render()}
function sell(id,q){q=Math.min(q,S.inv[id]);if(q>0){S.cash+=q*S.prices[id];S.inv[id]-=q}render()}
function next(){
  S.prev=S.prices;S.prices=roll();S.ev="";
  S.cash-=Math.min(S.cash,FEE);
  if(Math.random()<.4){var e=EVENTS[Math.floor(Math.random()*EVENTS.length)];S.ev=e.t;
    if(e.f)for(var k in e.f)S.prices[k]=Math.round(S.prices[k]*e.f[k]/50)*50;
    if(e.fee)S.cash-=Math.min(S.cash,e.fee)}
  S.day++;
  if(S.day>MAX){S.over=true;loadLB();var w=worth();if(w>best){best=w;try{localStorage.setItem("mh_best",String(Math.round(w)))}catch(x){}}}
  render()}
function title(w){return w<20000?"Market wahala":w<40000?"Small hustler":w<80000?"Market boss":"Oga of Wuse Market"}
function share(){
  var w=Math.round(worth()),t="I finished Naija Market Hustle with "+money(w)+" ("+title(w)+"). Can you beat me?";
  if(navigator.share){navigator.share({text:t,url:location.href}).catch(function(){})}
  else if(navigator.clipboard){navigator.clipboard.writeText(t+" "+location.href).then(function(){alert("Copied! Paste it to your friends.")}).catch(function(){})}}
function gameHtml(){var h="";
  if(S.over){var w=Math.round(worth());
    h='<div class="end"><div class="sub">Day '+MAX+' complete</div><h2>'+title(w)+'</h2><div class="big">'+money(w)+'</div><p class="sub">Best score: '+money(best)+'</p>'+lbHtml()+'<button class="go" data-a="share">Share my score</button><button class="go s" data-a="again" style="background:transparent;color:var(--fg);border:2px solid var(--line)">Play again</button></div>';
  }else{
    h='<div class="top"><div><h1>Naija Market Hustle</h1><div class="sub">Day '+S.day+' of '+MAX+' · stall space '+count()+'/'+CAP+'</div></div><div class="cash">'+money(S.cash)+'</div></div>';
    h+='<div class="bar"><i style="width:'+((S.day-1)/MAX*100)+'%"></i></div>';
    if(S.ev)h+='<div class="ev">'+S.ev+'</div>';
    ITEMS.forEach(function(i){
      var p=S.prices[i.id],d="";
      if(S.prev){var c=p-S.prev[i.id];d=c>0?' <span class="up">▲ '+c+'</span>':c<0?' <span class="dn">▼ '+(-c)+'</span>':""}
      h+='<div class="item"><div><div class="nm"><span class="em">'+i.e+'</span> '+i.n+'</div><div class="own">You have '+S.inv[i.id]+'</div></div><div class="pr">'+money(p)+d+'</div><div class="btns">'+
      '<button data-a="b" data-i="'+i.id+'" data-q="1">Buy 1</button>'+
      '<button data-a="b" data-i="'+i.id+'" data-q="10">Buy 10</button>'+
      '<button class="s" data-a="s" data-i="'+i.id+'" data-q="1">Sell 1</button>'+
      '<button class="s" data-a="s" data-i="'+i.id+'" data-q="999">Sell all</button></div></div>'});
    h+='<button class="go" data-a="next">'+(S.day==MAX?"Finish the month":"Next day (stall fee "+money(FEE)+")")+'</button>';
    h+='<p class="note">Best score: '+money(best)+'. Naira in this game is pretend money and cannot be withdrawn.</p>'}
  return h}
document.getElementById("app").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;var a=b.dataset.a;
  if(a=="b")buy(b.dataset.i,+b.dataset.q);else if(a=="s")sell(b.dataset.i,+b.dataset.q);
  else if(a=="next")next();else if(a=="again"){saved=false;newGame()}else if(a=="save")saveScore();else if(a=="send")sendChat();else if(a=="tab"){tab=b.dataset.t;render();if(tab=="board")loadLB()}else if(a=="share")share()});
document.getElementById("app").addEventListener("keydown",function(e){if(e.key=="Enter"&&e.target.id=="ct")sendChat()});
newGame();
