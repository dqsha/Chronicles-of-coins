// 0.31: новая структура вкладок и лёгкая главная
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
// новичок: только банк и кнопки
run("UI.tab='home';render()");let hh=app();
chk('fresh home: bank + buttons',hh.includes('id="t-free"')&&hh.includes('data-act="add" data-v="exp"'));
chk('fresh home: no today/hero/attention',!hh.includes('herostrip')&&!hh.includes('<h2>Сегодня')&&!hh.includes('t-attn'));
chk('fresh home: first-step hint',hh.includes('Запиши первую операцию'));
// после первой записи появляются сегодня и герой
run("addTx({type:'exp',amount:1000,cat:'food',acc:'a'});render()");hh=app();
chk('after first record: today + hero strip',hh.includes('<h2>Сегодня')&&hh.includes('herostrip'));
chk('daily allowance on bank card',hh.includes('Можно тратить в день'));
// блок «Внимание» только когда есть что показать
chk('no attention when all calm',!hh.includes('t-attn'));
run("S.pro.push({id:'p1',type:'exp',cat:'food',acc:'a',amount:500000,date:'2026-11-11',note:'',rec:'none',st:'wait',fact:null,c:'2026-11-01',u:1});render()");
chk('attention card compact',app().includes('t-attn')&&app().includes('data-act="attn"')&&!app().includes('Пророчеств ждут'));act('attn');chk('attention sheet shows gap and due prophecy',lay().includes('Кассовый разрыв')&&lay().includes('Пророчеств ждут'));act('close');
act('tab','plan');chk('attention button leads to plan',run('UI.tab')==='plan'&&app().includes('t-pro'));
// группы вкладок
chk('tab groups',run("tabGroup('stats')")==='list'&&run("tabGroup('wallet')")==='list'&&run("tabGroup('plan')")==='plan');
run("UI.tab='stats';render()");chk('records switcher on stats, Анализ active',/class="on" data-act="tab" data-v="stats"/.test(app())&&app().includes('data-v="wallet"')&&app().includes('data-v="list"'));
run("UI.tab='wallet';render()");chk('wallet is Счета',app().includes('Счета')&&app().includes('t-acc'));
chk('bottom bar has 4 tabs in new order',['home','list','plan','hero'].every(t=>els['#tabbar'].innerHTML.includes('data-v="'+t+'"')));
run("UI.tab='hero';render()");chk('hero tab has camp and chronicle, no duplicate settings',app().includes('Сокровищница героя')&&!app().includes('data-act="data"')&&app().includes('class="card hero"'));
// свайп по новым группам: из «Анализ» вправо в «План»
run("S.lefty=false;UI.tab='stats'");chk('swipe from stats goes to plan',run("swipeTab(-100)")&&run("UI.tab")==='plan');
console.log(bad?('FAILED '+bad):'ALL OK');process.exit(bad?1:0);
