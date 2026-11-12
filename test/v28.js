// 0.35: подсказки «?» и короткие тексты
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
run("S.tx=[];UI.tab='plan';render()");
chk('plan has ? buttons',app().indexOf('data-act="hint"')>0);
chk('all hints have 4 parts',run("Object.keys(HINTS).every(k=>HINTS[k].length===4&&HINTS[k].every(t=>t&&t.length>2))"));
act('hint','pro');let L=lay();
chk('hint sheet has 3 sections',L.indexOf('Что это')>0&&L.indexOf('Как пользоваться')>0&&L.indexOf('Зачем это в жизни')>0&&L.indexOf('Пророчества')>0);
act('hintok');chk('hint closes',run('UI.sheet')===null);
// подсказка внутри окна возвращает обратно
act('gear');act('hint','gear');chk('hint over sheet',run("UI.sheet.kind")==='hint');
act('hintok');chk('back to inventory',run("UI.sheet&&UI.sheet.kind")==='gear');
chk('unknown key no button',run("hq('nope')")==='');
chk('tour mentions ?',run("TOURS.some(t=>/\\{y \\?\\}/.test(t.t))"));
console.log(bad?'FAILED '+bad:'OK all');
