const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace(/\ntry\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'\n');
const els={};const el=k=>els[k]||(els[k]={innerHTML:'',classList:{add(){},remove(){}},dataset:{},focus(){},select(){},set textContent(v){this._t=v}});
const ctx=vm.createContext({console,window:{scrollTo(){},addEventListener(){},innerHeight:800,innerWidth:390,scrollY:0},document:{querySelector:el,addEventListener(){},body:{dataset:{},classList:{toggle(){}}}},localStorage:{getItem(){return null},setItem(){}},navigator:{clipboard:{writeText:()=>Promise.resolve()}},setTimeout,clearTimeout});
vm.runInContext(code,ctx);const run=c=>vm.runInContext(c,ctx);
let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const act=(a,v)=>{ctx.__el={dataset:{v},disabled:false};run(`act('${a}',__el)`)};
run(`S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'Нал',type:'cash',bal0:5000},{id:'b',name:'Kaspi',type:'card',bal0:90000}];S.tourSeen=true;NOW='2026-11-10';UI.tab='list';render()`);
// history rows (as imported) + one manual
run(`const rows=[['2026-11-09',940,'YANDEX.GO'],['2026-11-08',830,'YANDEX.GO'],['2026-11-07',1500,'АНВАР'],['2026-11-06',1200,'ИП ТЕСТОВ']];
rows.forEach((r,i)=>S.tx.push({id:'h'+i,type:'exp',amount:r[1],cat:i<2?'taxi':'other',acc:'b',to:null,date:r[0],note:r[2],mid:null,ts:i,hist:true,imp:'k'+i}));
S.accounts[1].bal0+=940+830+1500+1200;
S.tx.push({id:'m1',type:'exp',amount:300,cat:'food',acc:'a',to:null,date:'2026-11-10',note:'хлеб',mid:null,ts:9});
S.tx.push({id:'t1',type:'tr',amount:1000,cat:null,acc:'a',to:'b',date:'2026-11-10',note:'',mid:null,ts:10});`);
const bal=()=>[run('accBal(S.accounts[0])'),run('accBal(S.accounts[1])')];
const b0=bal();
act('txopen','h2');chk('edit form shown for archive record',els['#layer'].innerHTML.includes('data-act="txsave"')&&els['#layer'].innerHTML.includes('data-act="ecat"')&&els['#layer'].innerHTML.includes('Из архива'));
chk('custom category button present',els['#layer'].innerHTML.includes('data-act="ecustomtoggle"'));
chk('no similar chip when unique',!els['#layer'].innerHTML.includes('data-act="eall"'));
// pick existing category
act('ecat','food');act('txsave');
chk('category changed to existing',run(`S.tx.find(x=>x.id==='h2').cat`)==='food');
chk('sheet closed after save',run('UI.sheet')===null);
// custom category created in place, then applied
act('txopen','h3');act('ecustomtoggle');chk('custom form visible',els['#layer'].innerHTML.includes('data-f="cname"'));
act('ecustomsave');chk('custom needs a name',run('UI.E.err').includes('название'));
run(`UI.E.cname='Парикмахер';UI.E.cicon='💈'`);act('ecustomsave');
chk('custom category created and selected',run(`S.customCats.length`)===1&&run('UI.E.cat')===run('S.customCats[0].id')&&run('S.customCats[0].kind')==='exp');
act('txsave');chk('record uses the new category',run(`S.tx.find(x=>x.id==='h3').cat`)===run('S.customCats[0].id'));
chk('new category appears in add form',(()=>{act('add');act('catopen');return els['#layer'].innerHTML.includes('Парикмахер')})());
run('UI.sheet=null');
// apply to all similar
run(`S.tx.find(x=>x.id==='h0').cat='other';S.tx.find(x=>x.id==='h1').cat='other'`);
act('txopen','h0');chk('similar chip shown with count',els['#layer'].innerHTML.includes('data-act="eall"')&&els['#layer'].innerHTML.includes('(1)'));
act('ecat','taxi');act('eall');act('txsave');
chk('all similar changed',run(`S.tx.find(x=>x.id==='h1').cat`)==='taxi'&&run(`S.tx.find(x=>x.id==='h0').cat`)==='taxi');
chk('rule remembered for next imports',run(`S.rules['YANDEX.GO']`)==='taxi');
chk('unrelated records untouched',run(`S.tx.find(x=>x.id==='m1').cat`)==='food');
// balances
chk('archive edits keep balances',JSON.stringify(bal())===JSON.stringify(b0));
run(`UI.pendingLvl=null`);
act('txopen','h1');run(`UI.E.amount='2000'`);act('txsave');
chk('archive amount edit keeps current balance',JSON.stringify(bal())===JSON.stringify(b0)&&run(`S.tx.find(x=>x.id==='h1').amount`)===2000);
act('txopen','h1');run(`UI.E.acc='a'`);act('txsave');
chk('archive account move keeps both balances',JSON.stringify(bal())===JSON.stringify(b0)&&run(`S.tx.find(x=>x.id==='h1').acc`)==='a');
act('txopen','m1');run(`UI.E.amount='500'`);act('txsave');
chk('manual record amount edit changes balance',Math.round(bal()[0]-b0[0])===-200);
// validation
act('txopen','m1');run(`UI.E.amount='0'`);act('txsave');chk('amount required',run('UI.E.err')==='Введите сумму'&&run('UI.sheet')!==null);
run(`UI.E.amount='500';UI.E.date='2030-01-01'`);act('txsave');chk('future date rejected',run('UI.E.err').includes('будущем'));
run(`UI.E.date='2026-11-09';UI.E.note='  батон  '`);act('txsave');chk('date and note saved',run(`S.tx.find(x=>x.id==='m1').date`)==='2026-11-09'&&run(`S.tx.find(x=>x.id==='m1').note`)==='батон');
// transfers: still view+delete only
act('txopen','t1');chk('transfer has no edit form',!els['#layer'].innerHTML.includes('data-act="txsave"')&&els['#layer'].innerHTML.includes('txdel'));
chk('hist flag and import key preserved',run(`S.tx.find(x=>x.id==='h2').hist===true&&S.tx.find(x=>x.id==='h2').imp==='k2'`));
// list view still renders
run(`UI.sheet=null;UI.tab='list';render()`);chk('list renders after edits',els['#app'].innerHTML.includes('батон'));
console.log(bad?bad+' FAILED':'V07 OK');process.exit(bad?1:0);
