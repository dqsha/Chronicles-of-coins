// 0.22: огромные суммы, предел ввода, нет служебного кода в тексте
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,localStorage:{getItem(){return null},setItem(){}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){},fetch:undefined};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);const app=()=>els['#app'].innerHTML;
run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:5e22}];NOW='2026-11-10'");
for(let i=0;i<5;i++)run(`S.tx.push({id:'t${i}',type:'exp',amount:1000,cat:'food',acc:'a',to:null,date:'2026-11-0${i+1}',note:'',mid:null,ts:${i}})`);
chk('absurd number capped',run("fmtCt(5e22)").replace(/\u00a0/g,' ')==='999+ трлн ₸');
['home','list','stats','wallet','plan','hero'].forEach(t=>{run(`UI.tab='${t}';render()`);const txt=app().replace(/<[^>]+>/g,'');
  chk(t+': no html code in text',!/data-act|class=|&lt;span/.test(txt));chk(t+': no 15+ digit numbers',!/\d{1,3}( \d{3}){5,}/.test(txt))});
run("UI.F={type:'exp',amount:'2000000000000',cat:'food',acc:'a',date:'2026-11-10',note:'',err:''};UI.sheet={k:'tx'}");
run("try{saveTxForm()}catch(e){}");chk('input over limit rejected',String(run("UI.F.err")).includes('Слишком большая'));
console.log(bad?bad+' FAILED':'V18 OK');
