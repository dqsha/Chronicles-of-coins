const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace(/\nstart\(\);\s*$/,'\n');
const els={};const el=k=>els[k]||(els[k]={innerHTML:'',classList:{add(){},remove(){}},dataset:{},focus(){},select(){},set textContent(v){this._t=v}});
const ctx=vm.createContext({console,window:{scrollTo(){},addEventListener(){},innerHeight:800,innerWidth:390,scrollY:0},document:{querySelector:el,addEventListener(){},body:{dataset:{},classList:{toggle(){}}}},localStorage:{getItem(){return null},setItem(){}},navigator:{clipboard:{writeText:()=>Promise.resolve()}},setTimeout,clearTimeout});
vm.runInContext(code,ctx);
const run=c=>vm.runInContext(c,ctx);
let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
run(`S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'Нал',type:'cash',bal0:5000},{id:'b',name:'Карта',type:'card',bal0:90000}];S.tourSeen=true;NOW=null;UI.tab='home';render()`);
const act=(a,v)=>{ctx.__el={dataset:{v},disabled:false};run(`act('${a}',__el)`)};
// repeat list
chk('empty repeat list',run('repeatList("exp").length')===0);
run(`for(let i=0;i<3;i++)S.tx.push({id:'x'+i,type:'exp',amount:1500,cat:'cafe',acc:'b',note:'кофе',ts:Date.now()-i*1000,date:today()});
S.tx.push({id:'y',type:'exp',amount:9000,cat:'food',acc:'a',note:'',ts:Date.now(),date:today()});
S.tx.push({id:'m',type:'exp',amount:50000,cat:'home',acc:'a',note:'аренда',mid:'q',ts:Date.now(),date:today()});`);
chk('repeat list sorted by frequency',run('repeatList("exp")[0].cat')==='cafe'&&run('repeatList("exp")[0].n')===3);
chk('repeat list skips mandatory payments',!run('repeatList("exp")').some(r=>r.cat==='home'));
chk('repeat list is per type',run('repeatList("inc").length')===0);
act('add');chk('repeat chips on add sheet',els['#layer'].innerHTML.includes('data-act="rep"')&&els['#layer'].innerHTML.includes('Повторить'));
act('rep','0');chk('rep fills cat, amount, account, note',run('UI.F.cat')==='cafe'&&run('UI.F.amount')==='1500'&&run('UI.F.acc')==='b'&&run('UI.F.note')==='кофе');
run(`UI.pct=curPct()`);const n0=run('S.tx.length');run('saveTxForm()');chk('saves repeated entry',run('S.tx.length')===n0+1&&run('S.tx[S.tx.length-1].amount')===1500);
// fx modes
chk('fx default full',run('fxMode()')==='full');
act('fx','soft');chk('fx soft stored',run('S.fx')==='soft'&&run('fxMode()')==='soft');
act('fx','off');chk('fx off',run('fxMode()')==='off');
act('fx','bogus');chk('fx bogus falls back to full',run('S.fx')==='full');
run(`S.calm=true`);chk('calm forces fx off',run('fxMode()')==='off');run(`S.calm=false`);
// fx job is created by gaining xp, same regardless of money amount
run(`S.fx='full';UI.fxJob=null;gainXp(10,'t');flush()`);chk('xp creates fx job',run('UI.fxJob')!==null&&run('UI.fxJob.xp')===10);
run(`S.fx='off';UI.fxJob=null;gainXp(10,'t');flush()`);chk('fx off: no job',run('UI.fxJob')===null);
run(`S.fx='full';UI.fxJob=null;say('hello');flush()`);chk('message only: no job',run('UI.fxJob')===null);
// runFx must not throw in a stub without animation support
run(`UI.fxJob={xp:10};runFx(null)`);chk('runFx safe without DOM animation',true);
// small and huge amounts give the same xp (reward for logging, not size)
run(`const xa=S.xp;S.dayRec={};addTx({type:'exp',amount:10,cat:'cafe',acc:'a'});const d1=S.xp-xa;S.dayRec={};const xb=S.xp;addTx({type:'exp',amount:5000000,cat:'cafe',acc:'a'});chk2=[d1,S.xp-xb]`);
chk('xp independent of amount',run('chk2[0]')===run('chk2[1]'));
// settings sheet has fx buttons
run(`UI.form={name:'',pet:'',import:'',err:''};openSheet('data')`);chk('settings has effects selector',els['#layer'].innerHTML.includes('data-act="fx"'));
console.log(bad?bad+' FAILED':'V05 OK');process.exit(bad?1:0);
