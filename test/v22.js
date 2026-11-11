// 0.29: пророчества
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
const A=(a,v)=>act(a,v);
// создание через форму
act('pronew');chk('sheet opens',run("UI.sheet&&UI.sheet.kind")==='pro');
run("UI.form.type='inc';UI.form.cat=catsFor('inc')[0].id;UI.form.amount='400000';UI.form.date='2026-11-15';UI.form.note='Зарплата';UI.form.rec=true");
act('prosave');chk('prophecy saved',run("S.pro.length")===1&&run("S.pro[0].st")==='wait'&&run("S.pro[0].rec")==='month');
// расход, который уходит в минус
run("UI.form=null;openPro(null);UI.form.amount='150000';UI.form.date='2026-11-13';UI.form.note='Ремонт';");act('prosave');
chk('two prophecies',run("S.pro.length")===2);
// остаток: 100000 + 400000 - 150000 к 20 ноября
chk('balance at 20th',near(run("proBalanceAt('2026-11-20')"),350000));
// разрыв: 100000 - 150000 < 0 с 13-го, дно -50000
const g=run("proGap(60)");chk('gap found on 13th, deficit 50000',g&&g.date==='2026-11-13'&&g.deficit===50000);
chk('home warns about gap',/t-attn/.test(app())&&/Кассовый разрыв/.test(app()));run("UI.tab='plan';render()");chk('plan shows prophecies and gap',/Пророчества/.test(app())&&/Кассовый разрыв/.test(app()));run("UI.tab='home';render()");
// срок наступил: 13-го ремонт «сбылся иначе» на 180000
run("NOW='2026-11-13'");
const id2=run("S.pro.find(p=>p.note==='Ремонт').id");
act('prodiff',id2);run("UI.form.fact='180000'");act('prodiffsave');
chk('tx written with fact amount',run("S.tx.filter(x=>x.type==='exp'&&x.amount===180000).length")===1);
chk('status done, fact kept',run("S.pro.find(p=>p.note==='Ремонт').st")==='done'&&run("S.pro.find(p=>p.note==='Ремонт').fact")===180000);
chk('balance dropped by fact',near(run("totalBal()"),-80000+0)||near(run("totalBal()"),100000-180000));
// «сбылось» по зарплате 15-го, повторение создаёт следующую
run("NOW='2026-11-15'");
const id1=run("S.pro.find(p=>p.note==='Зарплата'&&p.st==='wait').id");
act('prohit',id1);
chk('salary tx 400000',run("S.tx.filter(x=>x.type==='inc'&&x.amount===400000).length")===1);
const nx=run("S.pro.filter(p=>p.note==='Зарплата'&&p.st==='wait')");
chk('next month salary created',nx.length===1&&nx[0].date==='2026-12-15');
// не сбылось
act('pronew');run("UI.form.amount='20000';UI.form.date='2026-11-16';UI.form.note='Подарок'");act('prosave');
run("NOW='2026-11-16'");const id3=run("S.pro.find(p=>p.note==='Подарок').id");act('promiss',id3);
chk('miss: no tx, status miss',run("S.pro.find(p=>p.note==='Подарок').st")==='miss'&&run("S.tx.filter(x=>x.amount===20000).length")===0);
// повторное нажатие не удваивает запись
act('prohit',id1);chk('no double tx',run("S.tx.filter(x=>x.type==='inc'&&x.amount===400000).length")===1);
// удаление и слияние
const idn=nx[0].id;run("UI.form=null;openPro('"+idn+"')");act('prodel');
chk('deleted prophecy gone, tombstone set',run("S.pro.every(p=>p.id!=='"+idn+"')")&&run("!!S.del['"+idn+"']"));
const mg=run("(()=>{const a=defaults(),b=defaults();a.savedAt=2;b.savedAt=1;a.pro=[{id:'x',st:'wait',u:1}];b.pro=[{id:'x',st:'done',u:5},{id:'y',st:'wait',u:1}];const o=mergeStates(a,b);return o.pro.map(p=>p.id+':'+p.st).sort().join(',')})()");
chk('merge: newer wins, union',mg==='x:done,y:wait');
// скрытие блока
run("UI.tab='plan';S.hide.pro=1;render()");chk('hide works',!/id="t-pro"/.test(app()));
// огромная сумма отклоняется
run("S.hide={};UI.form=null;openPro(null);UI.form.amount='99999999999999';UI.form.date='2026-12-01'");act('prosave');
chk('huge amount rejected',/максимум/.test(lay())||run("UI.form.err")!=='');
console.log(bad?('FAILED '+bad):'ALL OK');process.exit(bad?1:0);
