(() => {
"use strict";
const $ = s => document.querySelector(s);
const desktop = $("#desktop"), windowsEl = $("#windows"), toastEl = $("#toast");
const DB_NAME = "mac-mobile-desktop", STORE = "items";
let db, z = 10, currentFolder = "root", selectedId = null, noteSaveTimer;
const apps = {
  finder:{title:"Finder",icon:"▣"}, notes:{title:"Notes",icon:"▤"},
  terminal:{title:"Terminal",icon:"⌘"}, browser:{title:"Browser",icon:"◎"},
  calculator:{title:"Calculator",icon:"＋"}, settings:{title:"System Settings",icon:"⚙"}
};
function toast(msg){toastEl.textContent=msg;toastEl.classList.add("show");setTimeout(()=>toastEl.classList.remove("show"),2100)}
function openDB(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{const d=req.result; if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:"id"});s.createIndex("parent","parent",{unique:false});}};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
function tx(mode="readonly"){return db.transaction(STORE,mode).objectStore(STORE)}
function getAll(){return new Promise((res,rej)=>{const r=tx().getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(item){return new Promise((res,rej)=>{const r=tx("readwrite").put(item);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function del(id){return new Promise((res,rej)=>{const r=tx("readwrite").delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function uid(){return "f_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
async function seed(){
 const all=await getAll(); if(all.length) return;
 await put({id:"welcome",parent:"root",name:"Welcome.txt",type:"file",mime:"text/plain",content:"Welcome to Mac Desktop!\\n\\nYour files are stored locally in this browser using IndexedDB.\\nUse Finder to create folders and files, and Settings to export a backup.",updated:Date.now()});
 await put({id:"documents",parent:"root",name:"Documents",type:"folder",updated:Date.now()});
 await put({id:"notes-folder",parent:"root",name:"Notes",type:"folder",updated:Date.now()});
}
function openApp(app){
 if(!apps[app])return;
 const existing=document.querySelector(`[data-window="${app}"]`);
 if(existing){existing.style.zIndex=++z;return}
 const win=document.createElement("section");win.className="window";win.dataset.window=app;win.style.zIndex=++z;
 win.innerHTML=`<div class="titlebar"><div class="traffic"><button class="close" aria-label="關閉"></button><button class="min" aria-label="最小化"></button><button class="zoom" aria-label="最大化"></button></div><div class="window-title">${apps[app].title}</div></div><div class="window-body" id="body-${app}"></div>`;
 windowsEl.append(win);win.addEventListener("pointerdown",()=>win.style.zIndex=++z);
 win.querySelector(".close").onclick=()=>win.remove();
 win.querySelector(".min").onclick=()=>win.classList.add("hidden");
 win.querySelector(".zoom").onclick=()=>win.classList.toggle("maximized");
 $("#active-app").textContent=apps[app].title;
 renderApp(app);
}
async function renderApp(app){
 const body=$("#body-"+app); if(!body)return;
 if(app==="finder") await renderFinder(body);
 if(app==="notes") await renderNotes(body);
 if(app==="terminal") renderTerminal(body);
 if(app==="browser") renderBrowser(body);
 if(app==="calculator") renderCalculator(body);
 if(app==="settings") renderSettings(body);
}
async function renderFinder(body){
 const all=await getAll(), folder=all.find(x=>x.id===currentFolder);
 const items=all.filter(x=>x.parent===currentFolder).sort((a,b)=>a.type===b.type?a.name.localeCompare(b.name):a.type==="folder"?-1:1);
 body.innerHTML=`<div class="toolbar"><button class="action" id="up">← 返回</button><button class="action primary" id="new-folder">＋ 資料夾</button><button class="action" id="new-file">＋ 文字檔</button><button class="action" id="rename">重新命名</button><button class="action danger" id="delete">刪除</button></div><div class="breadcrumb">位置：${escapeHTML(folder?.name||"桌面")}</div><div class="file-grid" id="file-grid"></div>`;
 body.querySelector("#up").disabled=currentFolder==="root";
 body.querySelector("#up").onclick=()=>{currentFolder=folder?.parent||"root";renderFinder(body)};
 body.querySelector("#new-folder").onclick=async()=>{const name=prompt("資料夾名稱","新資料夾");if(name?.trim()){await put({id:uid(),parent:currentFolder,name:name.trim(),type:"folder",updated:Date.now()});renderFinder(body)}};
 body.querySelector("#new-file").onclick=async()=>{const name=prompt("檔案名稱","未命名.txt");if(name?.trim()){await put({id:uid(),parent:currentFolder,name:name.trim(),type:"file",mime:"text/plain",content:"",updated:Date.now()});renderFinder(body)}};
 body.querySelector("#rename").onclick=async()=>{if(!selectedId)return toast("請先選取檔案");const item=all.find(x=>x.id===selectedId);if(!item)return;const name=prompt("新名稱",item.name);if(name?.trim()){item.name=name.trim();item.updated=Date.now();await put(item);selectedId=null;renderFinder(body)}};
 body.querySelector("#delete").onclick=async()=>{if(!selectedId)return toast("請先選取檔案");const item=all.find(x=>x.id===selectedId);if(!item)return;if(!confirm(`確定刪除「${item.name}」？`))return;await deleteTree(selectedId,all);selectedId=null;renderFinder(body)};
 const grid=body.querySelector("#file-grid");
 if(!items.length){grid.innerHTML='<div class="empty">這個資料夾是空的</div>';return}
 items.forEach(item=>{const b=document.createElement("button");b.className="file-card"+(selectedId===item.id?" selected":"");b.innerHTML=`<span class="glyph">${item.type==="folder"?"📁":iconFor(item.name)}</span><span class="fname">${escapeHTML(item.name)}</span>`;b.onclick=()=>{selectedId=item.id;grid.querySelectorAll(".file-card").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")};b.ondblclick=()=>{if(item.type==="folder"){currentFolder=item.id;selectedId=null;renderFinder(body)}else openFile(item)};grid.append(b)});
}
async function deleteTree(id,all){for(const x of all.filter(v=>v.parent===id)){if(x.type==="folder")await deleteTree(x.id,all);else await del(x.id)}await del(id)}
function iconFor(n){const e=n.split(".").pop().toLowerCase();return e==="html"?"🌐":e==="json"?"🧩":e==="pdf"?"📕":e==="png"||e==="jpg"||e==="jpeg"?"🖼️":"📄"}
async function openFile(item){
 if(item.name.toLowerCase().endsWith(".html")){const w=window.open("about:blank","_blank");if(w){w.document.open();w.document.write(item.content||"");w.document.close()}else toast("瀏覽器封鎖了新視窗");return}
 const body=document.createElement("div");body.innerHTML=`<div class="toolbar"><button class="action primary" id="save">儲存</button><button class="action" id="export">匯出檔案</button></div><input class="note-title" id="filename" value="${escapeAttr(item.name)}"><textarea class="editor" id="content"></textarea>`;
 const win=document.createElement("section");win.className="window";win.dataset.window="editor";win.style.zIndex=++z;win.innerHTML=`<div class="titlebar"><div class="traffic"><button class="close"></button></div><div class="window-title">文字編輯器</div></div><div class="window-body"></div>`;win.querySelector(".window-body").append(body);windowsEl.append(win);win.querySelector(".close").onclick=()=>win.remove();
 body.querySelector("#content").value=item.content||"";
 body.querySelector("#save").onclick=async()=>{item.name=body.querySelector("#filename").value.trim()||item.name;item.content=body.querySelector("#content").value;item.updated=Date.now();await put(item);toast("已儲存")};
 body.querySelector("#export").onclick=()=>download(item.name,body.querySelector("#content").value,"text/plain");
}
async function renderNotes(body){
 const all=await getAll(), note=all.find(x=>x.id==="quick-note")||{id:"quick-note",parent:"notes-folder",name:"我的筆記.txt",type:"file",mime:"text/plain",content:""};
 body.innerHTML=`<input class="note-title" id="note-title" value="${escapeAttr(note.name)}" aria-label="筆記標題"><textarea class="editor" id="note-content" placeholder="開始輸入筆記…"></textarea><div style="font-size:11px;color:#758095;margin-top:8px" id="save-status">自動儲存至此 iPhone</div>`;
 body.querySelector("#note-content").value=note.content||"";
 const save=async()=>{note.name=body.querySelector("#note-title").value.trim()||"我的筆記.txt";note.content=body.querySelector("#note-content").value;note.updated=Date.now();await put(note);body.querySelector("#save-status").textContent="已儲存 · "+new Date().toLocaleTimeString()};
 body.querySelectorAll("input,textarea").forEach(el=>el.addEventListener("input",()=>{clearTimeout(noteSaveTimer);body.querySelector("#save-status").textContent="正在儲存…";noteSaveTimer=setTimeout(save,350)}));
}
function renderTerminal(body){
 body.innerHTML=`<div class="terminal-view"><div id="term-output">Mac Desktop Terminal [網頁模擬版]<br>輸入 help 查看可用指令。<br><br></div><form class="terminal-input"><span>guest@iphone %</span><input id="term-command" autocomplete="off" autocapitalize="off" spellcheck="false"></form></div>`;
 const out=body.querySelector("#term-output"),form=body.querySelector("form"),input=body.querySelector("input");
 form.onsubmit=async e=>{e.preventDefault();const c=input.value.trim();if(!c)return;out.innerHTML+=`<div class="terminal-line">guest@iphone % ${escapeHTML(c)}</div>`;input.value="";let msg="";
  if(c==="help")msg="help, date, time, ls, pwd, clear, echo [文字], open finder, open notes";
  else if(c==="date")msg=new Date().toLocaleDateString();
  else if(c==="time")msg=new Date().toLocaleTimeString();
  else if(c==="pwd")msg="/Users/guest/Desktop";
  else if(c==="ls"){const a=await getAll();msg=a.map(x=>x.name).join("    ")||"(empty)"}
  else if(c==="clear"){out.innerHTML="";return}
  else if(c.startsWith("echo "))msg=c.slice(5);
  else if(c==="open finder"){openApp("finder");msg="Opening Finder…"}
  else if(c==="open notes"){openApp("notes");msg="Opening Notes…"}
  else msg="command not found: "+c+" (輸入 help 查看指令)";
  out.innerHTML+=`<div class="terminal-line">${escapeHTML(msg)}</div>`;body.querySelector(".terminal-view").scrollTop=99999;
 };
}
function renderBrowser(body){
 body.innerHTML=`<form class="browser-bar"><input id="url" type="url" placeholder="輸入網址，例如 https://example.com"><button class="action primary">前往</button></form><iframe class="browser-frame" title="網頁預覽" sandbox="allow-forms allow-scripts allow-same-origin allow-popups"></iframe><p style="font-size:10px;color:#778195">部分網站禁止在內嵌視窗顯示。遇到此情況請使用「在 Safari 開啟」。</p>`;
 body.querySelector("form").onsubmit=e=>{e.preventDefault();let u=body.querySelector("#url").value.trim();if(!/^https?:\/\//i.test(u))u="https://"+u;try{new URL(u);body.querySelector("iframe").src=u}catch{toast("網址格式不正確")}};
}
function renderCalculator(body){
 body.innerHTML=`<div class="calc"><div class="calc-display" id="calc-display">0</div>${["7","8","9","÷","4","5","6","×","1","2","3","−","0",".","=","＋","C"].map(x=>`<button class="${["÷","×","−","＋","="].includes(x)?"op":""}" data-key="${x}">${x}</button>`).join("")}</div>`;
 let expr="",display=body.querySelector("#calc-display");
 body.querySelectorAll("button").forEach(b=>b.onclick=()=>{const k=b.dataset.key;if(k==="C"){expr="";display.textContent="0";return}if(k==="="){try{const safe=expr.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/＋/g,"+");if(!/^[0-9+\-*/(). ]+$/.test(safe))throw 0;const result=Function('"use strict";return ('+safe+')')();if(!Number.isFinite(result))throw 0;expr=String(result);display.textContent=expr}catch{display.textContent="錯誤";expr=""}return}expr+=k;display.textContent=expr});
}
function renderSettings(body){
 body.innerHTML=`<h3 style="margin:2px 0 12px">一般設定</h3><div class="settings-row"><span>深色視窗</span><input type="checkbox" id="dark"></div><div class="settings-row"><span>桌面名稱</span><strong>Mac Desktop</strong></div><div class="settings-row"><span>儲存空間</span><button class="action" id="storage">檢查</button></div><hr style="border:0;border-top:1px solid #e4e8ee;margin:15px 0"><h3>資料備份</h3><div class="toolbar"><button class="action primary" id="backup">匯出全部資料</button><button class="action" id="restore">匯入備份</button></div><p style="font-size:11px;color:#748094;line-height:1.5">資料預設保存在此 iPhone 的 Safari 網站儲存空間。清除 Safari 網站資料、移除網站資料或瀏覽器儲存空間被系統清理時，可能造成資料遺失。重要檔案請定期匯出備份。</p><button class="action" id="privacy">儲存說明</button>`;
 body.querySelector("#dark").checked=document.body.classList.contains("dark-ui");
 body.querySelector("#dark").onchange=e=>document.body.classList.toggle("dark-ui",e.target.checked);
 body.querySelector("#backup").onclick=async()=>{const data={app:"Mac Desktop",version:1,exported:new Date().toISOString(),items:await getAll()};download("mac-desktop-backup.json",JSON.stringify(data,null,2),"application/json")};
 body.querySelector("#restore").onclick=()=>$("#import-file").click();
 body.querySelector("#storage").onclick=async()=>{const a=await getAll();let bytes=new Blob([JSON.stringify(a)]).size;toast(`${a.length} 個項目，約 ${(bytes/1024).toFixed(1)} KB（估算）`)};
 body.querySelector("#privacy").onclick=()=>alert("此桌面不會將檔案上傳到伺服器。檔案儲存在本機瀏覽器 IndexedDB。請定期使用匯出功能備份。");
}
$("#import-file").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data.items))throw 0;for(const item of data.items){if(item.id&&item.name&&item.type)await put(item)}toast("備份匯入完成");const w=document.querySelector('[data-window="settings"]');if(w)renderSettings(w.querySelector(".window-body"))}catch{alert("備份檔案格式不正確")}e.target.value=""};
function download(name,text,mime){const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escapeAttr(s){return escapeHTML(s)}
function updateClock(){const d=new Date();$("#clock").textContent=d.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})}
function buildShortcuts(){const data=[["finder","▣","Macintosh HD"],["notes","▤","Notes"],["settings","⚙","設定"]];$("#desktop-icons").innerHTML=data.map(([a,i,n])=>`<button class="desktop-shortcut" data-app="${a}">${i}<span>${n}</span></button>`).join("");}
async function start(){
 try{db=await openDB();await seed();buildShortcuts();document.querySelectorAll("[data-app]").forEach(b=>b.addEventListener("click",()=>openApp(b.dataset.app)));$("#file-menu").onclick=()=>openApp("finder");$("#view-menu").onclick=()=>toast("提示：點擊 Dock 圖示開啟應用程式");updateClock();setInterval(updateClock,15000);$("#boot").classList.add("hidden");desktop.classList.remove("hidden");openApp("finder");if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});}
 catch(err){$("#boot").innerHTML="<div>無法啟動桌面</div><p style='font-size:12px'>請使用支援 IndexedDB 的 Safari，並透過 HTTPS 開啟。</p>";console.error(err)}
}
start();
})();