// 0.21: скрытие на всех вкладках, сокращение больших сумм, свайп и левша
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,localStorage:{getItem(){return null},setItem(){}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){},fetch:undefined};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);const app=()=>els['#app'].innerHTML;
const act=(a,v)=>{ctx.__el={dataset:{v},disabled:false};run(`act('${a}',__el)`)};
run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:1234567890}];NOW='2026-11-10';S.tx.push({id:'1',type:'exp',amount:5000,cat:'food',acc:'a',to:null,date:'2026-11-05',note:'',mid:null,ts:1})");
// числа
chk('fmtC small stays full',run("fmtC(163000)")===run("fmt(163000)"));
chk('fmtC billions',run("fmtCt(1234567890)")===run("(1.23).toLocaleString('ru-RU')")+' млрд ₸');
chk('fmtC millions with limit',run("fmtCt(12500000)")===run("(12.5).toLocaleString('ru-RU')")+' млн ₸'&&run("fmtCt(2500000,1e6)").includes('млн'));
chk('fmtC negative',run("fmtCt(-3e9)").startsWith('−3 млрд'));
run("UI.tab='home';render()");chk('home bank compact',app().includes('млрд ₸')&&app().includes('title="'));
// скрытие на других вкладках
run("UI.tab='stats';UI.period='month';UI.mon='2026-11';render()");
chk('stats hide buttons',['s_kpi','s_chart','s_cats','s_days'].every(k=>app().includes('data-v="'+k+'"')));
act('hide','s_chart');chk('stats chart hidden',!app().includes('<h2>Доходы и расходы'));
run("UI.tab='wallet';render()");
chk('wallet hide buttons',['w_hist','w_goals','w_mand','w_chr'].every(k=>app().includes('data-v="'+k+'"')));
chk('accounts never hideable',app().includes('id="t-acc"')&&!app().includes('data-v="w_acc"'));
chk('button has visible text',app().includes('>скрыть</button>'));
// свайп
run("UI.tab='home';S.lefty=false");chk('right-hand: left swipe -> next',run("swipeTab(-100)")&&run("UI.tab")==='list');
chk('right swipe -> back',run("swipeTab(100)")&&run("UI.tab")==='home');
chk('no wrap past first',run("swipeTab(100)")===false&&run("UI.tab")==='home');
run("S.lefty=true");chk('lefty mirrored',run("swipeTab(100)")&&run("UI.tab")==='list');
run("UI.tab='wallet'");chk('lefty no wrap past last',run("swipeTab(100)")===false);
run("UI.form={name:'x',import:'',err:''};openSheet('data')");chk('lefty toggle in settings',els['#layer'].innerHTML.includes('Я левша: да'));
chk('compact is tappable',run("fmtC(5e9)").includes('data-act=\"fullnum\"'));
run("UI.tab='wallet';render()");chk('scene shows plain text',!/<div class="r">[^<]*&lt;span/.test(app()));
chk('dots in tabbar',els['#tabbar'].innerHTML.includes('tdots'));
run("S.hide={};UI.tab='stats';UI.period='month';UI.mon='2026-11';render()");chk('chart labels not clipped',(()=>{const m=app().match(/<text class="tx" x="([\d.]+)"[^>]*text-anchor="end">([^<]*)</);return m&&+m[1]>=m[2].length*6})());
console.log(bad?bad+' FAILED':'V17 OK');
