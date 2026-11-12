// 0.35.2: клавиатура не двигает окно, «?» гаснут после нажатия
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,localStorage:{getItem(){return null},setItem(){}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){},fetch:undefined};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);const app=()=>els['#app'].innerHTML,lay=()=>els['#layer'].innerHTML;
const act=(a,v)=>{ctx.__el={dataset:{v},disabled:false};run(`act('${a}',__el)`)};
const near=(a,b)=>Math.abs(a-b)<0.01;
run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:100000}];NOW='2026-11-11'");
run("S.hintSeen={};S.tx=[];UI.tab='plan';render()");
chk('new ? glows',app().indexOf('class="qm"')>0&&app().indexOf('qm seen')<0);
act('hint','pro');
chk('seen saved',run("S.hintSeen.pro")===1);
chk('seen ? is grey class',app().indexOf('qm seen')>0);
chk('other ? still glows',app().indexOf('class="qm"')>0);
act('hintok');
// merge: hintSeen объединяется
const mg=run("mergeStates({savedAt:2,epoch:'e',hintSeen:{a:1}},{savedAt:1,epoch:'e',hintSeen:{b:1}}).hintSeen");
chk('merge hintSeen union',mg.a===1&&mg.b===1);
// окно с клавиатурой: класс и переменная сохраняются при перерисовке
run("UI.kbStop=240;UI.F=newF('exp');openSheet('add')");
chk('kblock class kept on rerender',lay().indexOf('kblock')>0&&lay().indexOf('--stop:240px')>0);
run("closeSheet()");chk('kbStop cleared on close',run('UI.kbStop')===null);
run("UI.kbStop=null;UI.F=newF('exp');openSheet('add')");
chk('no kblock without keyboard',lay().indexOf('kblock')<0);
console.log(bad?'FAILED '+bad:'OK all');
