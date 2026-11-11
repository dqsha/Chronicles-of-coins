// 0.30-0.31: меткость, привычная ошибка, сценарии, XP
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
const mk2=(cat,plan,fact,type,done,c,date)=>`S.pro.push({id:'q'+S.pro.length,type:'${type||'exp'}',cat:'${cat}',acc:'a',amount:${plan},date:'${date||done||'2026-11-01'}',note:'',rec:'none',st:${fact==null?"'miss'":"'done'"},fact:${fact==null?0:fact},c:'${c||'2026-10-01'}',done:'${done||'2026-11-05'}',u:1})`;
// пусто
chk('no stats rank new',run("proStats().n")===0&&run("proRank(proStats())")==='Новичок');
// 3 еды: +20%, +10%, +30% -> медиана +20%; 1 промах
run(mk2('food',100,120)+';'+mk2('food',100,110)+';'+mk2('food',100,130)+';'+mk2('food',100,null));
const st=run("proStats()");
chk('n=4 hits=1 (110 within 10%) acc 25',st.n===4&&st.hits===1&&st.acc===25);
chk('bias median 20%',near(st.cats.food.bias,0.2)&&st.cats.food.ok);
chk('leak over plan 20+10+30=60',near(st.leak,60));
// недостаточно данных по другой категории
run(mk2('cafe',100,200)+';'+mk2('cafe',100,200));
chk('cafe needs 3 (not ok)',run("proStats().cats.cafe.ok")===false);
// сценарии: ожидаемый с поправкой, пророчество на еду 1000 к 20 ноября
run("S.pro.push({id:'w1',type:'exp',cat:'food',acc:'a',amount:1000,date:'2026-11-20',note:'',rec:'none',st:'wait',fact:null,c:'2026-11-01',u:1})");
const sc=run("proScen('2026-11-30')");const base=run("freeMoney()");
chk('expected uses +20% habit',near(sc.exp,base-1200));
const mae=(0.2+0.1+0.3)/3;
chk('worst uses mae spread',near(sc.worst,base-1200*(1+mae)));
chk('best uses mae spread',near(sc.best,base-1200*(1-mae)));
// без данных разброс 10%
run("S.pro.push({id:'w2',type:'inc',cat:catsFor('inc')[0].id,acc:'a',amount:1000,date:'2026-11-21',note:'',rec:'none',st:'wait',fact:null,c:'2026-11-01',u:1})");
const sc2=run("proScen('2026-11-30')");chk('income spread 10% worst',near(sc2.worst,sc.worst+900)&&near(sc2.exp,sc.exp+1000));
// карточка и отчёт
run("UI.tab='plan';render()");chk('card shows accuracy and rank',/Меткость 17%/.test(els['#app'].innerHTML||'')||/Меткость 17%/.test(app()));
act('prorep');chk('report renders',/Меткость пророка/.test(lay())&&/17%/.test(lay())&&/Еда|Продукты/.test(lay()));
chk('report shows leak',/мимо плана/.test(lay()));
chk('report shows worst category',/недооцениваешь/.test(lay()));
// подсказка в форме и «учесть поправку»
run("UI.sheet=null;UI.form=null;openPro(null);UI.form.cat='food';UI.form.amount='1000'");
chk('form hint shown',/ошибаешься на \+20%/.test(lay()));
act('proapply');chk('apply habit -> 1200',run("UI.form.amount")==='1200');
// XP: попадание даёт XP только если пророчество создано заранее
run("UI.sheet=null;S.xp=0;NOW='2026-11-20'");
run("S.pro.push({id:'x1',type:'exp',cat:'food',acc:'a',amount:500,date:'2026-11-20',note:'',rec:'none',st:'wait',fact:null,c:'2026-11-10',u:1})");
const before=run("S.xp");act('prohit','x1');const gained=run("S.xp")-before;
chk('on-time hit gives at least 15 xp (plus record xp)',gained>=15);
run("S.pro.push({id:'x2',type:'exp',cat:'food',acc:'a',amount:500,date:'2026-11-20',note:'',rec:'none',st:'wait',fact:null,c:'2026-11-20',u:1})");
const b2=run("S.xp");act('prohit','x2');const g2=run("S.xp")-b2;
chk('same-day prophecy: no prophecy xp (record xp only)',g2<15);
// звания
chk('rank tiers',run("proRank({n:10,acc:70})")==='Провидец'&&run("proRank({n:20,acc:85})")==='Оракул'&&run("proRank({n:6,acc:40})")==='Подмастерье');
console.log(bad?('FAILED '+bad):'ALL OK');process.exit(bad?1:0);
