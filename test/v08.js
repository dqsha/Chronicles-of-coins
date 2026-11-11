const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace(/\ntry\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'\n');
const cloud={};const CS={setItems(o,cb){Object.assign(cloud,o);cb(null,true)},removeItems(k,cb){k.forEach(x=>delete cloud[x]);cb(null,true)},getItem(k,cb){cb(null,cloud[k]||'')},getItems(ks,cb){const r={};ks.forEach(k=>r[k]=cloud[k]);cb(null,r)}};
function mk(ls){const els={};const el=k=>els[k]||(els[k]={innerHTML:'',classList:{add(){},remove(){}},dataset:{},focus(){},select(){}});
 return vm.createContext({console,window:{Telegram:{WebApp:{initData:'x',CloudStorage:CS,ready(){},expand(){},setHeaderColor(){},setBackgroundColor(){}}},scrollTo(){},addEventListener(){},innerHeight:800,innerWidth:390,scrollY:0},document:{querySelector:el,getElementById:()=>null,addEventListener(){},body:{dataset:{},classList:{toggle(){}}}},localStorage:{getItem:k=>ls[k]||null,setItem:(k,v)=>{ls[k]=v}},navigator:{},setTimeout:(f,t)=>setTimeout(f,t),clearTimeout});}
let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
(async()=>{
const ls1={};const c1=mk(ls1);vm.runInContext(code,c1);const r1=x=>vm.runInContext(x,c1);
r1(`S=defaults();S.onboarded=true;S.name='Тест';S.accounts=[{id:'a',name:'Нал',type:'cash',bal0:5000}];for(let i=0;i<120;i++)S.tx.push({id:'t'+i,type:'exp',amount:100+i,cat:'food',acc:'a',date:'2026-11-09',note:'Магазин номер '+i,ts:i});save();cloudPush(true)`);
chk('cloud has chunks',+cloud.hm_n>1);
// new device: empty local
const ls2={};const c2=mk(ls2);vm.runInContext(code,c2);
await new Promise(ok=>vm.runInContext('cloudSync',c2)(ok));
const o=JSON.parse(ls2['hronika-monet-v1']||'null');
chk('restored from cloud',o&&o.name==='Тест'&&o.tx.length===120);
// shrink: fewer chunks removes old
r1(`S.tx=S.tx.slice(0,5);save();cloudPush(true)`);
chk('stale chunks removed',Object.keys(cloud).filter(k=>/^hm_\d/.test(k)).length===+cloud.hm_n);
// newer local wins
const ls3={'hronika-monet-v1':JSON.stringify({name:'Локал',savedAt:Date.now()+99999,onboarded:true})};const c3=mk(ls3);vm.runInContext(code,c3);
await new Promise(ok=>vm.runInContext('cloudSync',c3)(ok));
chk('newer local kept',JSON.parse(ls3['hronika-monet-v1']).name==='Локал');
console.log(bad?'V08 BAD':'V08 OK');})();
