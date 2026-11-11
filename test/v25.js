// 0.20: слияние копий с двух устройств
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
const store={};const cloud={};
const CS={getItem(k,cb){cb(null,cloud[k])},getItems(ks,cb){const o={};ks.forEach(k=>o[k]=cloud[k]);cb(null,o)},setItem(k,v,cb){cloud[k]=String(v);cb&&cb(null,true)},removeItems(ks,cb){ks.forEach(k=>delete cloud[k]);cb&&cb()}};
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,localStorage:{getItem(k){return k in store?store[k]:null},setItem(k,v){store[k]=String(v)},removeItem(k){delete store[k]}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false}),Telegram:{WebApp:{CloudStorage:CS,initData:'x'}}},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){},fetch:undefined};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);
const T=(id,amt,ts)=>({id,type:'exp',amount:amt,cat:'food',acc:'a',to:null,date:'2026-11-05',note:'',mid:null,ts:ts||1});
const base={accounts:[{id:'a',name:'Карта',type:'card',bal0:1000}],onboarded:true,epoch:'',del:{},paid:{},noSpend:{},dayRec:{}};
// 0.32: синхронизация счетов/платежей/целей и живая подтяжка облака
const A=(id)=>({id,name:id,type:'card',bal0:0});
const ph=Object.assign({},base,{savedAt:100,accounts:[A('a'),A('ph')],goals:[{id:'g1',name:'Отпуск'}],mand:[{id:'m1',name:'Интернет'}],customCats:[{id:'c1',name:'Кот',kind:'exp'}],ach:{first:1},tx:[]});
store['hronika-synced']='1';const pc=Object.assign({},base,{savedAt:200,accounts:[A('a'),A('pc')],goals:[],mand:[{id:'m2',name:'Аренда'}],customCats:[{id:'c2',name:'Спорт',kind:'exp'}],ach:{lvl5:1},tx:[],del:{g1:150}});
ctx.__a=ph;ctx.__b=pc;const mg=run('mergeStates(__a,__b)');
chk('accounts union',['a','ph','pc'].every(i=>mg.accounts.some(x=>x.id===i))&&mg.accounts.length===3);
chk('mand union',mg.mand.length===2);
chk('deleted goal stays deleted',mg.goals.length===0);
chk('customCats union',mg.customCats.length===2);
chk('ach union',mg.ach.first&&mg.ach.lvl5);
// удаление оставляет надгробие
run("S=defaults();S.onboarded=true;S.goals=[{id:'gx',name:'x'}];delGoal('gx')");
chk('delGoal tombstone',run("!!S.del.gx&&S.goals.length===0"));
// живая подтяжка: в облаке появилась запись с другого устройства
run("S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'К',type:'card',bal0:0}];S.savedAt=100;S.tx=[]");
const other=Object.assign({},base,{savedAt:300,tx:[T('far',99)]});const str=JSON.stringify(other);
cloud.hm_n='1';cloud.hm_0=str;
run("cloudLive(false)");
chk('live pull brings record',run("S.tx.some(x=>x.id==='far')"));
chk('local copy kept in localStorage',JSON.parse(store['hronika-monet-v1']).tx.some(x=>x.id==='far'));
// своя запись не теряется и уходит в облако
run("S.tx.push({id:'mine',type:'exp',amount:1,cat:'food',acc:'a',date:'2026-11-06',ts:2});S.savedAt=400;cloudLive(true)");
const back=JSON.parse(Array.from({length:+cloud.hm_n},(_,i)=>cloud['hm_'+i]).join(''));
chk('push merges both',back.tx.some(x=>x.id==='mine')&&back.tx.some(x=>x.id==='far'));
// 0.32.1: настоящий Telegram умеет только setItem
chk('no setItems used',!/setItems/.test(require('fs').readFileSync(process.argv[2],'utf8')));
// первая встреча двух независимых устройств: вопрос, а не слепое слияние
delete store['hronika-synced'];
run("S=defaults();S.onboarded=true;S.accounts=[{id:'x',name:'Карта',type:'card',bal0:0}];S.tx=[{id:'loc',type:'exp',amount:1,cat:'food',acc:'x',date:'2026-11-06',ts:1}];S.savedAt=10;UI.sheet=null");
cloud.hm_n='1';cloud.hm_0=JSON.stringify(Object.assign({},base,{savedAt:300,tx:[T('far',99)]}));
run("cloudLive(false)");
chk('asks on first meet',run("UI.sheet&&UI.sheet.kind==='syncask'")&&run("S.tx.length===1"));
run("act('synccloud',{dataset:{}})");
chk('take cloud replaces',run("S.tx.length===1&&S.tx[0].id==='far'")&&store['hronika-synced']==='1');
// пустое устройство молча берёт облако
delete store['hronika-synced'];run("S=defaults();S.onboarded=true;S.accounts=[{id:'x',name:'К',type:'card',bal0:0}];S.tx=[];UI.sheet=null;cloudLive(false)");
chk('empty device adopts cloud',run("S.tx.some(x=>x.id==='far')&&!UI.sheet"));
// пустое облако: пишем своё
delete store['hronika-synced'];Object.keys(cloud).forEach(k=>delete cloud[k]);
run("S.tx=[{id:'solo',type:'exp',amount:1,cat:'food',acc:'x',date:'2026-11-06',ts:1}];cloudLive(false)");
chk('empty cloud gets written',cloud.hm_n==='1'&&cloud.hm_0.indexOf('solo')>0);
console.log(bad?'FAILED '+bad:'ALL OK');
