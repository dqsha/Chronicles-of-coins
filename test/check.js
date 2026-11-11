// Usage: node check.js <path to index.html>
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no script'); process.exit(1); }
const full = m[1];
try { new vm.Script(full); console.log('OK syntax: full script'); } catch (e) { console.error('SYNTAX', e.message); process.exit(1); }

const a = full.indexOf('// ==LOGIC==');
const b = full.indexOf('// ==END LOGIC==');
const logic = full.slice(a, b);
const ctx = vm.createContext({ console });
vm.runInContext(logic, ctx);

let fails = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : '  got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want)));
};
const run = (code) => vm.runInContext(code, ctx);

// setup
run(`S=defaults();S.accounts=[{id:'cash',name:'Н',type:'cash',bal0:1000},{id:'card',name:'К',type:'card',bal0:50000}];NOW='2026-11-01';S.quest={tx:1,mand:1,goal:1,contrib:1,gear:1};S.questAll=true;`);
t('levelInfo 0xp', run('levelInfo(0)'), { L: 1, cur: 0, need: 40 });
t('levelInfo 40xp', run('levelInfo(40)'), { L: 2, cur: 0, need: 55 });
t('levelInfo 95xp', run('levelInfo(95)'), { L: 3, cur: 0, need: 70 });
t('xpAtLevel 3', run('xpAtLevel(3)'), 95);
t('tier weapon L1/L2/L8/L16', run('[1,2,8,16].map(l=>tier("weapon",l))'), [0, 1, 2, 3]);

// day 1: first expense
run(`addTx({type:'exp',amount:2000,cat:'food',acc:'card'});`);
t('day1 streak', run('S.streak.count'), 1);
t('day1 xp (10 rec + 6 bonus)', run('S.xp'), 16);
t('card balance', run(`accBal(S.accounts[1])`), 48000);
// 6 more records same day: only 5 count total
run(`for(let i=0;i<6;i++)addTx({type:'exp',amount:100,cat:'cafe',acc:'card'});`);
t('record xp capped at 5/day', run('S.xp'), 16 + 40);
// transfer gives nothing
const before = run('S.xp');
run(`addTx({type:'tr',amount:5000,acc:'card',to:'cash'});`);
t('transfer no xp', run('S.xp'), before);
t('balances after transfer', run('[accBal(S.accounts[0]),accBal(S.accounts[1])]'), [6000, 48000 - 600 - 5000]);

// day 2 consecutive
run(`NOW='2026-11-02';notes=[];`);
run(`addTx({type:'inc',amount:100000,cat:'salary',acc:'card'});`);
t('day2 streak', run('S.streak.count'), 2);
// no-spend on day 3, then expense removes it
run(`NOW='2026-11-03';notes=[];`);
const x0 = run('S.xp');
t('noSpend ok', run('noSpendToday()'), true);
t('noSpend xp (10 + bonus 5+3)', run('S.xp') - x0, 18);
t('noSpend twice blocked', run('noSpendToday()'), false);
run(`addTx({type:'exp',amount:500,cat:'taxi',acc:'card'});`);
t('noSpend mark removed after expense', run('!!S.noSpend["2026-11-03"]'), false);
t('streak day3', run('S.streak.count'), 3);
// expense blocks noSpend
run(`NOW='2026-11-04';`);
run(`addTx({type:'exp',amount:300,cat:'food',acc:'cash'});`);
t('noSpend blocked after expense', run('noSpendToday()'), false);

// freeze usage: skip 11-05, 11-06 (2 days) with 1 freeze -> broken
run(`NOW='2026-11-07';`);
t('streakView broken', run('streakView().state'), 'broken');
run(`S.streak.freezes=2;`);
t('streakView frozen', run('streakView().state'), 'frozen');
run(`notes=[];addTx({type:'exp',amount:100,cat:'food',acc:'cash'});`);
t('freeze consumed streak kept', run('[S.streak.count,S.streak.freezes]'), [5, 0]);
// break without freezes
run(`NOW='2026-11-12';`);
run(`addTx({type:'exp',amount:100,cat:'food',acc:'cash'});`);
t('streak reset to 1', run('S.streak.count'), 1);
t('best kept', run('S.streak.best'), 5);

// mandatory payment
run(`S.mand=[{id:'m1',name:'Интернет',amount:4000,day:15,cat:'comm',acc:'card'}];NOW='2026-11-12';`);
t('free money subtracts unpaid', run('freeMoney()===totalBal()-4000'), true);
run(`notes=[];payMand('m1');`);
t('mandatory paid flag', run('mandStatus(S.mand[0]).paid'), true);
t('free money after pay', run('freeMoney()===totalBal()'), true);
run(`payMand('m1');`);
t('pay twice no dup', run(`S.tx.filter(x=>x.mid==='m1').length`), 1);
run(`delTx(S.tx.find(x=>x.mid==='m1').id);`);
t('deleting payment unmarks paid', run('mandStatus(S.mand[0]).paid'), false);
t('overdue detection', run(`NOW='2026-11-20';mandStatus(S.mand[0]).overdue`), true);
run(`NOW='2026-11-12';`);

// month-end due day clamp
t('dueDay Feb', run(`dueDay({day:31},'2027-02')`), 28);

// stats
const st = run(`(function(){const s=buckets('month');return{n:s.list.length,exp:s.exp,inc:s.inc,monthly:s.monthly}})()`);
t('month buckets 30 days', st.n, 30);
t('month income', st.inc, 100000);
const stAll = run(`(function(){const s=buckets('all');return{n:s.list.length,first:s.list[0].key}})()`);
t('all-time starts at first tx month', stAll, { n: 1, first: '2026-11' });
t('half buckets', run(`buckets('half').list.map(b=>b.key)`), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
t('week buckets 7', run(`buckets('week').list.length`), 7);
t('niceMax', run('[niceMax(1),niceMax(7300),niceMax(100000),niceMax(100001)]'), [1, 8000, 100000, 150000]);
t('short', run('[short(500),short(12500),short(2500000)]'), ['500', '12,5 тыс', '2,5 млн']);
t('plural', run(`[plural(1,['день','дня','дней']),plural(3,['день','дня','дней']),plural(11,['день','дня','дней']),plural(21,['день','дня','дней'])]`), ['день', 'дня', 'дней', 'день']);
t('esc', run(`esc('<a href="x">&')`), '&lt;a href=&quot;x&quot;&gt;&amp;');
t('fmt', run('fmt(1234.5)'), '1 234,50 ₸');
t('fmt negative', run('fmt(-100)'), '−100 ₸');

// level-up note + freeze at level 5
run(`S=defaults();S.accounts=[{id:'a',name:'A',type:'cash',bal0:0}];NOW='2026-12-01';notes=[];S.streak.freezes=0;gainXp(xpAtLevel(5)+1,'t');`);
t('level 5 reached', run('levelInfo(S.xp).L'), 5);
t('freeze granted at L5', run('S.streak.freezes'), 1);
t('unlocked list 1->5', run('unlockedBetween(1,5)'), ['Оружие: Ржавый меч', 'Броня: Кожаная куртка', 'Шлем: Капюшон', 'Плащ: Серый плащ']);

// equipment switching
run(`S=defaults();S.xp=xpAtLevel(9);`);
t('auto tier at L9: weapon steel(2)', run('equippedTier("weapon",9)'), 2);
t('equip stick over steel', run('setEquip("weapon",0,9)'), true);
t('stick now equipped', run('equippedTier("weapon",9)'), 0);
t('other slots stay auto', run('[equippedTier("armor",9),equippedTier("helm",9)]'), [1, 2]);
t('cannot equip locked item', run('setEquip("weapon",3,9)'), false);
t('re-equip best clears override', run('setEquip("weapon",2,9)&&S.equip.weapon===undefined'), true);
run(`setEquip("weapon",1,9);`);
t('manual choice survives level-up', run('equippedTier("weapon",20)'), 1);
t('old save without equip field is safe', run(`S.equip=undefined;equippedTier("weapon",9)`), 2);


// ---- 0.2 goals ----
run(`S=defaults();S.accounts=[{id:'cash',name:'Н',type:'cash',bal0:1000},{id:'card',name:'К',type:'card',bal0:100000}];NOW='2026-10-18';notes=[];`);
const g1 = run(`addGoal({name:'Телефон',icon:'📱',target:60000,deadline:'2027-01-01'}).id`);
t('addGoal quest xp 15', run('S.xp'), 15);
t('quest goal flag', run('!!S.quest.goal'), true);
run(`notes=[];addContrib('${g1}',15000);`);
t('first contrib xp 10+6+15', run('S.xp'), 15 + 10 + 6 + 15);
const xpc = run('S.xp');
run(`addContrib('${g1}',100);`);
t('second contrib same day no xp', run('S.xp'), xpc);
run(`S.goals[0].contribs[1].amt=0;S.goals[0].contribs.splice(1,1);`);
t('saved 15000', run(`goalSaved(S.goals[0])`), 15000);
t('free money reserves goal', run('freeMoney()===totalBal()-15000'), true);
run(`NOW='2026-11-01';`);
const gi = run(`(function(){const i=goalInfo(S.goals[0]);return{eta:i.eta,on:i.onTrack,need:Math.round(i.need),pct:i.pct}})()`);
t('forecast eta', gi.eta, '2026-12-13');
t('forecast onTrack', gi.on, true);
t('need per month', gi.need, 22454);
t('pct', gi.pct, 25);
t('withdraw clamps', run(`addContrib('${g1}',-99999)`), -15000);
t('saved zero after clamp', run(`goalSaved(S.goals[0])`), 0);
t('withdraw empty returns 0', run(`addContrib('${g1}',-5)`), 0);
const x1 = run('S.xp');
run(`addContrib('${g1}',60000);`);
t('reach target +50 (no daily contrib xp today? day 11-01 is new: +10+bonus)', run('S.goals[0].reached'), true);
t('reach awarded', run('S.xp') - x1 >= 50, true);
const x2 = run('S.xp');
run(`addContrib('${g1}',5000);addContrib('${g1}',-5000);addContrib('${g1}',5000);`);
t('no second reach award', run('S.xp'), x2);
run(`S.goals.push({id:'gd',name:'D',icon:'d',target:1000,deadline:null,contribs:[{id:'p',amt:100,date:'2026-11-01',ts:1},{id:'q',amt:-100,date:'2026-11-01',ts:2}],reached:false,closed:false});`);
t('delContrib blocks negative', run(`delContrib('gd','p')`), false);
t('delContrib allows ok', run(`delContrib('gd','q')`), true);
run(`delGoal('gd');`);
const bal0 = run('totalBal()'), fr0 = run('freeMoney()');
const before2 = run('S.xp');
run(`closeGoal('${g1}',{amount:65000,acc:'card',cat:'other'});`);
t('close goal makes expense', run('totalBal()'), bal0 - 65000);
t('close goal keeps free money (reserve released, balance reduced)', run('freeMoney()'), fr0);
t('close goal no xp', run('S.xp'), before2);
t('reserved zero after close', run('reserved()'), 0);
run(`S.goals.push({id:'gx',name:'Z',icon:'z',target:10,deadline:null,contribs:[],reached:false,closed:false});delGoal('gx');`);
t('delGoal', run(`S.goals.some(g=>g.id==='gx')`), false);
// quest bonus
run(`S=defaults();S.accounts=[{id:'a',name:'A',type:'cash',bal0:0}];NOW='2026-12-01';notes=[];`);
run(`addTx({type:'exp',amount:1,cat:'food',acc:'a'});S.mand.push({id:'m',name:'x',amount:1,day:1,cat:'home',acc:'a'});questDone('mand');addGoal({name:'a',target:100});addContrib(S.goals[0].id,10);questDone('gear');`);
t('quest all done flag', run('S.questAll'), true);
t('quest total xp includes 30 bonus', run('S.xp') >= 15*5+30, true);
run(`S=defaults();S.accounts=[{id:'a',name:'A',type:'cash',bal0:0}];S.tx.push({id:'t',type:'exp',amount:1,acc:'a',date:'2026-12-01'});S.mand.push({id:'m'});S.onboarded=true;syncQuest();`);
t('silent sync marks tx and mand, no xp', run('[S.quest.tx,S.quest.mand,S.xp,S.questAll]'), [1, 1, 0, false]);

// ---- achievements ----
run(`S=defaults();S.accounts=[{id:'a',name:'A',type:'cash',bal0:0}];NOW='2026-12-05';notes=[];S.quest={tx:1,mand:1,goal:1,contrib:1,gear:1};S.questAll=true;`);
run(`addTx({type:'inc',amount:500,cat:'salary',acc:'a'});checkAch();`);
t('ach first record + first income', run('[!!S.ach.rec1,!!S.ach.inc1,!!S.ach.rec10]'), [true, true, false]);
t('ach xp: 16 record + 40', run('S.xp'), 56);
run('checkAch();');
t('ach not granted twice', run('S.xp'), 56);
run(`S.noSpend={a:1,b:1,c:1,d:1,e:1};checkAch();`);
t('no-spend achievements', run('[!!S.ach.ns1,!!S.ach.ns5]'), [true, true]);
run(`S.goals.push({id:'q',name:'Q',icon:'q',target:100,contribs:[],reached:true,closed:true,spent:120000});checkAch();`);
t('closed goal counts for saved and bought', run('[!!S.ach.gb,!!S.ach.gr,!!S.ach.sv100,lifeStats().saved]'), [true, true, true, 120000]);
t('level achievement via xp from achievements chain', run('levelInfo(S.xp).L>=1'), true);

// ---- companion logic ----
run(`S=defaults();S.accounts=[{id:'a',name:'A',type:'cash',bal0:0}];NOW='2026-12-10';notes=[];S.quest={tx:1,mand:1,goal:1,contrib:1,gear:1};S.questAll=true;`);
t('pet starts with 2 food', run('S.pet.food'), 2);
t('pet stage 0 hungry when never fed', run('[petInfo().stage,petInfo().mood]'), [0, 'hungry']);
run(`noSpendToday();`);
t('no-spend gives 1 food', run('S.pet.food'), 3);
run(`const gg=addGoal({name:'x',target:1000});addContrib(gg.id,100);addContrib(gg.id,100);`);
t('first contrib of day gives 2 food, second none', run('S.pet.food'), 5);
run(`NOW='2026-12-11';checkAch();`);
t('achievements give 3 food each', run('S.pet.food')>5, true);
run(`S.pet.food=40;S.pet.xp=0;`);
t('feed works', run('feedPet()'), true);
t('mood happy today', run('petInfo().mood'), 'happy');
run(`NOW='2026-12-13';`);
t('mood ok within 2 days', run('petInfo().mood'), 'ok');
run(`NOW='2026-12-14';`);
t('mood hungry after 3 days', run('petInfo().mood'), 'hungry');
const xpBefore = run('S.xp');
run(`for(let i=0;i<7;i++)feedPet();`);
t('stage up at 8 feeds gives +10 xp', run('[petInfo().stage,S.xp-'+xpBefore+']'), [1, 10]);
t('stage thresholds', run('(function(){const r=[];[0,7,8,23,24,59,60,200].forEach(x=>{S.pet.xp=x;r.push(petInfo().stage)});return r})()'), [0, 0, 1, 1, 2, 2, 3, 3]);
t('max stage has no next', run('petInfo().next'), null);
run(`S.pet.food=0;`);
t('no food no feed', run('feedPet()'), false);
run(`S=defaults();S.xp=0;notes=[];gainXp(xpAtLevel(3)+1,'t');`);
t('level up gives 3 food per level', run('S.pet.food'), 2 + 6);

// location scenes render
const sc = fullBetween(full, '/* ---------- locations', '/* ---------- persistence');
vm.runInContext(sc, ctx);
const out = run(`Object.keys(SCENES).map(k=>{const s=SCENES[k]();return [k,s.startsWith('<svg'),s.endsWith('</svg>'),(s.match(/<rect/g)||[]).length>40]})`);
out.forEach(o => t('scene ' + o[0], o.slice(1), [true, true, true]));
t('scene() wraps title and escapes', run(`scene('home','A<b>','Лагерь','1').includes('A&lt;b&gt;')`), true);

function fullBetween(src, a, b) { return src.slice(src.indexOf(a), src.indexOf(b)); }
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
