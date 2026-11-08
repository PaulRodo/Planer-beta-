/* Статьи с тестами для планера. Подключение: <script src="articles.js"></script> перед </body> в index.html. */
(function(){
var WORKER_URL="https://planer.p41286529.workers.dev";      // адрес Worker, например https://planer.xxx.workers.dev (пусто = без синхронизации «прочитано»)
var MIN_READ=0.3;       // доля времени чтения, до которой тест закрыт
var BONUS=20;           // бонус XP за тест без ошибок
var items=[], loaded=false, cur=null, pending=null, bottom=false, t0=0;

var page=document.createElement("div"); page.id="pageArt"; page.hidden=true;
$("pageChal").parentNode.insertBefore(page,$("pageChal"));
var btn=document.createElement("button"); btn.className="tab"; btn.id="tabArt"; btn.setAttribute("role","tab");
btn.setAttribute("aria-selected","false"); btn.textContent="Статьи";
$("tabChal").insertAdjacentElement("afterend",btn);
TABS.art=["tabArt","pageArt"];
btn.addEventListener("click",function(){ showTab("art"); });
try{ posInd(); }catch(e){}

var st=document.createElement("style");
st.textContent=".art-r{max-width:680px;margin:0 auto}.art-r h1{font-size:1.4rem;margin:.4em 0}.art-r h2{font-size:1.15rem;margin:1.6em 0 .4em}"
+".art-r h3{font-size:1.02rem}.art-r p,.art-r li{line-height:1.7}.art-r blockquote{margin:12px 0;padding:10px 14px;border-left:4px solid var(--accent);background:var(--soft);border-radius:8px}"
+".art-q{margin:14px 0}.art-q .chk{display:block;margin:6px 0}.art-e{color:var(--muted);font-size:.9rem;margin-top:4px}.art-c{margin-bottom:12px}"
+"#tabArt.hasnew::after{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--warn);margin-left:4px;vertical-align:super}";
st.textContent+=".art-ph{min-height:56px;margin:10px 0 8px}.art-top{display:flex;align-items:center;gap:10px;padding:8px 0}"
+".art-top.stuck{position:fixed;left:0;right:0;top:calc(var(--tg-safe-area-inset-top,env(safe-area-inset-top,0px)) + var(--tg-content-safe-area-inset-top,0px));z-index:50;padding:8px 16px;background:color-mix(in srgb,var(--surface) 94%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 2px 12px rgba(0,0,0,.12);animation:artIn .2s ease}"
+"@keyframes artIn{from{transform:translateY(-100%);opacity:0}to{transform:none;opacity:1}}"
+".art-b{width:40px;height:40px;border-radius:50%;border:1px solid var(--border);background:var(--surface);font-size:1.5rem;line-height:1;flex:none}"
+".art-t{flex:1;min-width:0;text-align:center}.art-t small{display:block;color:var(--accent);font-weight:800;letter-spacing:.05em;font-size:.7rem}"
+".art-t b{display:block;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
+".art-p{position:relative;width:40px;height:40px;flex:none}.art-p svg{width:100%;height:100%}.art-p circle{fill:none;stroke-width:3.2}.art-p .bg{stroke:var(--soft)}"
+".art-p .fg{stroke:var(--accent);stroke-linecap:round;stroke-dasharray:0 100;transition:stroke-dasharray .15s}"
+".art-p span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800}";
st.textContent+=".art-fig{margin:16px 0;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--soft)}.art-fig img{max-width:100%;border-radius:8px;display:block;margin:0 auto}"
+".art-fig figcaption{margin-bottom:8px}.art-fig small{display:block;color:var(--muted);margin-top:8px;font-size:.78rem}"
+".bc{display:grid;grid-template-columns:minmax(90px,36%) 1fr auto;gap:8px;align-items:center;margin:6px 0;font-size:.88rem}"
+".bt{height:12px;background:var(--border);border-radius:6px;overflow:hidden}.bt i{display:block;height:100%;background:var(--accent);border-radius:6px}"
+".fl{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.fs{padding:6px 10px;border-radius:999px;background:var(--surface);border:1px solid var(--border);font-size:.88rem}.fa{color:var(--accent)}";
document.head.appendChild(st);

var _show=showTab; showTab=function(n){ _show(n); if(n==="art") render(); };

function A(){ if(!S.g.art||typeof S.g.art!=="object") S.g.art={}; return S.g.art; }
function xp(){ var s=0,a=(S.g&&S.g.art)||{}; Object.keys(a).forEach(function(k){ s+=+(a[k]&&a[k][1])||0; }); return s; }
function fd(d){ var p=d.split("-"); return +p[2]+" "+MONTHS_GEN[p[1]-1]; }

function chart(j){
  var d=j.data||[], mx=j.max||Math.max.apply(null,d.map(function(r){ return +r[1]||0; }).concat([1])), u=j.unit||"";
  return '<figure class="art-fig">'+(j.title?'<figcaption><b>'+esc(j.title)+'</b></figcaption>':'')+d.map(function(r){
    return '<div class="bc"><span class="bl">'+esc(r[0])+'</span><span class="bt"><i style="width:'+Math.max(2,Math.min(100,100*r[1]/mx))+'%"></i></span><b class="bv">'+(+r[1])+esc(u)+'</b></div>';
  }).join("")+(j.src?'<small>'+esc(j.src)+'</small>':'')+'</figure>';
}
function flow(j){
  var s=(j.steps||[]).map(function(t,i){ return '<span class="fs">'+(i+1)+'. '+esc(t)+'</span>'; }).join('<b class="fa">→</b>');
  return '<figure class="art-fig">'+(j.title?'<figcaption><b>'+esc(j.title)+'</b></figcaption>':'')+'<div class="fl">'+s+(j.loop?'<b class="fa">↻</b>':'')+'</div>'+(j.src?'<small>'+esc(j.src)+'</small>':'')+'</figure>';
}
function widget(kind,txt){ try{ var j=JSON.parse(txt); return kind==="chart"?chart(j):flow(j); }catch(e){ return ""; } }
function md(src,base){
  var out=[],list=null,para=[];
  function inl(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g,"$1<i>$2</i>"); }
  function fp(){ if(para.length){ out.push("<p>"+inl(para.join(" "))+"</p>"); para=[]; } }
  function fl(){ if(list){ out.push("</"+list+">"); list=null; } }
  src.replace(/\r/g,"").split("\n").forEach(function(l){
    var m;
    if(!l.trim()){ fp(); fl(); return; }
    if((m=l.match(/^@@(chart|flow)\s+(.*)$/))){ fp(); fl(); out.push(widget(m[1],m[2])); return; }
    if((m=l.match(/^!\[([^\]]*)\]\(([\w.\/-]+)\)$/))&&m[2].indexOf("..")<0){ fp(); fl(); out.push('<figure class="art-fig"><img loading="lazy" src="'+(base||"")+m[2]+'" alt="'+esc(m[1])+'"><figcaption>'+esc(m[1])+'</figcaption></figure>'); return; }
    if((m=l.match(/^(#{2,3})\s+(.*)/))){ fp(); fl(); out.push("<h"+m[1].length+">"+inl(m[2])+"</h"+m[1].length+">"); return; }
    if((m=l.match(/^>\s?(.*)/))){ fp(); fl(); out.push("<blockquote>"+inl(m[1])+"</blockquote>"); return; }
    if((m=l.match(/^(?:-|\d+\.)\s+(.*)/))){ fp(); var t=/^\d/.test(l)?"ol":"ul"; if(list!==t){ fl(); out.push("<"+t+">"); list=t; } out.push("<li>"+inl(m[1])+"</li>"); return; }
    fl(); para.push(l.trim());
  });
  fp(); fl(); return out.join("");
}

function fetchAll(cb){
  if(loaded) return cb();
  var d=new Date(), ms=[];
  for(var i=0;i<3;i++){ ms.push(d.getFullYear()+"-"+pad(d.getMonth()+1)); d.setMonth(d.getMonth()-1,1); }
  Promise.all(ms.map(function(m){
    return fetch("content/"+m+"/manifest.json",{cache:"no-cache"}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; });
  })).then(function(js){
    items=[]; js.forEach(function(j){ if(j&&j.articles) j.articles.forEach(function(a){ a._m=j.month; items.push(a); }); });
    items.sort(function(a,b){ return a.date<b.date?1:-1; }); loaded=true; cb();
  });
}
function dot(){ btn.classList.toggle("hasnew",items.some(function(a){ return a.date<=todayKey&&!A()[a.id]; })); }

function render(){
  if(pending){ var p=pending; pending=null; return openArt(p); }
  if(cur) return openArt(cur.id);
  fetchAll(function(){
    dot();
    var h='<p class="sub">Статьи открываются по расписанию. После каждой короткий тест, за прочтение даётся XP.</p>';
    if(!items.length) h+='<div class="empty">Статей пока нет.</div>';
    items.forEach(function(a){
      var done=A()[a.id], lock=a.date>todayKey;
      h+='<section class="card art-c"><div class="head"><h2>'+esc(a.title)+'</h2><span class="gmuted">'
        +(lock?"🔒 "+fd(a.date):done?"✓ "+done[0]+"/"+a.quiz.length:"≈ "+a.readMin+" мин")+'</span></div>'
        +'<div class="gmuted" style="margin-bottom:8px">'+(done?"Получено "+done[1]+" XP":"+"+a.xp+" XP")+'</div>'
        +(lock?"":'<button class="btn" data-id="'+esc(a.id)+'">'+(done?"Перечитать":"Читать")+'</button>')+'</section>';
    });
    page.innerHTML=h;
  });
}
page.addEventListener("click",function(e){
  var b=e.target.closest("button"); if(!b) return;
  if(b.dataset.id) openArt(b.dataset.id);
  if(b.id==="artBack"){ cur=null; render(); }
});

function openArt(id){
  fetchAll(function(){
    var a=items.filter(function(x){ return x.id===id; })[0];
    if(!a||a.date>todayKey){ cur=null; return render(); }
    cur=a; bottom=false; t0=Date.now();
    page.innerHTML='<div class="art-r"><i id="artProbe" style="position:fixed;left:0;width:0;height:0;top:calc(var(--tg-safe-area-inset-top,env(safe-area-inset-top,0px)) + var(--tg-content-safe-area-inset-top,0px))"></i><div class="art-ph"><div class="art-top"><button class="art-b" id="artBack" aria-label="К списку">‹</button>'
      +'<div class="art-t"><small>'+esc((a.cat||"Статья").toUpperCase())+'</small><b>'+esc(a.title)+'</b></div>'
      +'<div class="art-p"><svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15.9155"/><circle class="fg" id="artRing" cx="18" cy="18" r="15.9155" transform="rotate(-90 18 18)"/></svg><span id="artPct">0%</span></div></div></div>'
      +'<div class="gmuted">⏱ '+a.readMin+' мин чтения · +'+a.xp+' XP</div><h1>'+esc(a.title)+'</h1><div id="artBody">Загрузка…</div></div>';
    window.scrollTo(0,0);
    fetch("content/"+a._m+"/"+a.file,{cache:"no-cache"}).then(function(r){ if(!r.ok) throw 0; return r.text(); }).then(function(t){
      if(cur!==a) return;
      $("artBody").innerHTML=md(t,"content/"+a._m+"/")+'<div id="artEnd"></div><div id="artQuiz"></div>'; watch(a); prog();
    }).catch(function(){ $("artBody").textContent="Не удалось загрузить статью."; });
  });
}

function prog(){
  var b=$("artBody"); if(!b||!cur||!$("artPct")) return;
  var ph=document.querySelector(".art-ph"), tp=document.querySelector(".art-top"), pr=$("artProbe");
  if(ph&&tp&&pr) tp.classList.toggle("stuck",ph.getBoundingClientRect().top<pr.getBoundingClientRect().top);
  var r=b.getBoundingClientRect(), tot=r.height-window.innerHeight*0.6, v=Math.round(Math.max(0,Math.min(1,tot>0?-r.top/tot:1))*100);
  $("artPct").textContent=v+"%"; $("artRing").setAttribute("stroke-dasharray",v+" 100");
}
window.addEventListener("scroll",prog,{passive:true}); window.addEventListener("resize",prog);
function watch(a){
  var need=a.readMin*60*MIN_READ*1000;
  if("IntersectionObserver" in window) new IntersectionObserver(function(es,o){ if(es[0].isIntersecting){ bottom=true; o.disconnect(); } }).observe($("artEnd"));
  else bottom=true;
  (function tick(){
    if(cur!==a||!$("artQuiz")) return;
    var left=need-(Date.now()-t0);
    if(bottom&&left<=0){ quiz(a); markRead(a); return; }
    $("artQuiz").innerHTML='<p class="gmuted">'+(bottom?"Тест откроется через "+Math.ceil(left/1000)+" с. Пока можно перечитать ключевые места.":"Дочитай статью до конца, чтобы открыть тест.")+'</p>';
    setTimeout(tick,1000);
  })();
}
function markRead(a){
  var tg=window.Telegram&&Telegram.WebApp; if(!WORKER_URL||!tg||!tg.initData) return;
  fetch(WORKER_URL+"/read",{method:"POST",headers:{"Content-Type":"application/json","X-Init-Data":tg.initData},body:JSON.stringify({id:a.id})}).catch(function(){});
}

function quiz(a){
  var h='<h2>Проверь себя</h2>';
  a.quiz.forEach(function(q,i){
    var ix=q.options.map(function(_,k){ return k; }).sort(function(){ return Math.random()-.5; });
    h+='<div class="art-q" data-i="'+i+'"><b>'+(i+1)+'. '+esc(q.q)+'</b>'+ix.map(function(k){
      return '<label class="chk"><input type="radio" name="q'+i+'" value="'+k+'"> '+esc(q.options[k])+'</label>'; }).join("")+'<div class="art-e"></div></div>';
  });
  $("artQuiz").innerHTML=h+'<button class="btn" id="artGo">Проверить</button><div id="artRes" style="margin-top:10px"></div>';
  $("artGo").onclick=function(){ grade(a); };
}
function grade(a){
  var n=a.quiz.length, ok=0, els=a.quiz.map(function(q,i){ return document.querySelector('.art-q[data-i="'+i+'"]'); });
  if(els.some(function(el){ return !el.querySelector("input:checked"); })){ $("artRes").textContent="Ответь на все вопросы."; return; }
  a.quiz.forEach(function(q,i){
    var good=+els[i].querySelector("input:checked").value===q.correct; if(good) ok++;
    els[i].querySelector(".art-e").innerHTML=(good?"✅ ":"❌ ")+esc(q.explain);
  });
  var pass=ok>=Math.max(1,n-1), first=pass&&!A()[a.id];
  if(first){
    var gain=a.xp+(ok===n?BONUS:0); A()[a.id]=[ok,gain]; save();
    try{ toast10("📖 +"+gain+" XP"); checkLevel(levelInfo()); if(window.renderGame) renderGame(); }catch(e){}
    dot();
  }
  $("artRes").innerHTML=pass?"Засчитано: "+ok+"/"+n+(first?"":" (XP за эту статью уже получен)"):"Пока не засчитано: "+ok+"/"+n+". Перечитай статью и попробуй ещё раз.";
}

var m=(location.search+location.hash).match(/article=([\w-]+)/);
if(m){ pending=m[1]; showTab("art"); } else fetchAll(dot);
window.Art={xp:xp};
})();
