// 0.18: расходы без переводов и кредитов, тихий журнал ошибок
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,localStorage:{getItem(){return null},setItem(){}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){},fetch:undefined};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);

chk('no red error box', !/#7a1f1f/.test(h) && /hm-errlog/.test(h));
run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:500000}];NOW='2026-11-10'");
const tx=(id,cat,amt)=>`S.tx.push({id:'${id}',type:'exp',amount:${amt},cat:'${cat}',acc:'a',to:null,date:'2026-11-05',note:'',mid:null,ts:1})`;
run(tx('1','food',10000));run(tx('2','xfer',5000));run(tx('3','credit',20000));
run("UI.tab='stats';UI.period='month';UI.mon='2026-11';render()");
const html=els['#app'].innerHTML;
chk('total still includes all', html.includes(run('fmt(35000)')));
chk('line without transfers and credits', html.includes('обычные '+run('fmt(10000)')));
chk('parts named', html.includes('переводы 5 тыс')&&html.includes('кредиты 20 тыс'));
run("S.tx=S.tx.filter(x=>x.cat==='food');render()");
chk('no extra line when none', !els['#app'].innerHTML.includes('обычные '));
console.log(bad?bad+' FAILED':'V14 OK');
