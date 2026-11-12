// 0.38: серия заходов и выбор героя при знакомстве
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

// 0.39: банк не минусует платежи, «Уже оплачено», календарь, высокие окна
run("NOW='2026-11-12';S.onboarded=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:100000}];S.tx=[];S.goals=[];S.paid={};S.mand=[{id:'m1',name:'Рассрочка',amount:20000,day:20,cat:'home',acc:'a',debt:false,closed:false}];UI.tab='home';render()");
chk('bank shows accounts, not minus payments',run("bankNow()")===100000&&app().includes('После платежей месяца')&&run("freeMoney()")===80000);
act('mpaid','m1');
chk('already paid: no transaction, no deduction',run("S.tx.length")===0&&run("S.paid['m1|2026-11']")==='manual'&&run("unpaidSum()")===0&&run("totalBal()")===100000);
chk('after-payments row hidden when all paid',!app().includes('После платежей месяца'));
act('munpaid','m1');chk('unmark works',run("unpaidSum()")===20000);
run("UI.tab='plan';render()");chk('plan shows both buttons',app().includes('data-act="pay"')&&app().includes('data-act="mpaid"'));
act('pay','m1');chk('pay creates expense',run("S.tx.length")===1&&run("S.tx[0].amount")===20000);
// календарь
act('mandnew');chk('mand sheet: date button and tall',lay().includes('data-act="calopen"')&&lay().includes('addsheet'));
act('calopen');chk('calendar shown',lay().includes('class="mcal"')&&lay().includes('Ноябрь 2026'));
act('calm','2');chk('calendar next months',lay().includes('Январь 2027'));
act('calpick','2027-01-15');chk('date picked',run("UI.form.date")==='2027-01-15'&&run("UI.form.day")==='15'&&!lay().includes('class="mcal"'));
chk('future date hides already-paid chip',!lay().includes('data-act="mpaidnow"'));
run("UI.form.name='Кредит';UI.form.amount='15000'");act('mandsave');
const nm=run("JSON.stringify(S.mand.find(m=>m.name==='Кредит'))");
chk('saved with start month',nm.includes('"start":"2027-01"')&&nm.includes('"day":15'));
chk('future payment not in unpaid sum',run("unpaidSum()")===0);
run("UI.tab='plan';render()");chk('future row label',app().includes('с января 2027'));
run("NOW='2027-01-10'");chk('in start month it is due',run("unpaidSum()")===15000+20000);
run("NOW='2026-11-12'");
act('mandnew');run("UI.form.name='Интернет';UI.form.amount='5000'");act('mpaidnow');act('mandsave');
chk('created as already paid this month',run("S.paid[S.mand.find(m=>m.name==='Интернет').id+'|2026-11']")==='manual');
act('limitopen','food');chk('limit sheet is tall too',lay().includes('addsheet'));act('close');
// аудит 0.39.1
run("NOW='2026-11-12';S.mand=[{id:'r',name:'Аренда',amount:100000,day:5,cat:'home',acc:'a',debt:false,closed:false},{id:'d',name:'Рассрочка',amount:30000,day:10,cat:'credit',acc:'a',debt:true,left:45000,rate:0,closed:false}];S.paid={'r|2026-11':'manual','d|2026-11':'manual'};S.payday=null");
const ev=JSON.parse(run("JSON.stringify(mandEvents('2026-11-12','2027-02-28'))"));
chk('next-month payments in events',ev.some(e=>e.date==='2026-12-05'&&e.amount===100000));
chk('debt events stop when paid off',ev.filter(e=>e.mand==='d').map(e=>e.amount).join()==='30000,15000');
run("S.payday=10");chk('forecast subtracts payments before payday',run("forecast().bank")===run("freeMoney()")-100000-30000);
run("S.tx=[{id:'p1',type:'exp',amount:50000,cat:'home',acc:'a',date:'2026-11-01',mid:'r',ts:1},{id:'e1',type:'exp',amount:3000,cat:'food',acc:'a',date:'2026-11-01',ts:2},{id:'e2',type:'exp',amount:3000,cat:'food',acc:'a',date:'2026-11-03',ts:3},{id:'e3',type:'exp',amount:3000,cat:'food',acc:'a',date:'2026-11-05',ts:4}]");
chk('average spend ignores mandatory payments',Math.round(run("avgDaily('2026-11-12')"))===Math.round(9000/11));
run("S.goals=[];addGoal({name:'Велик',icon:'🚲',target:50000,deadline:'2027-05-01'});addContrib(S.goals[0].id,50000)");
const txn=run("S.tx.length");act('buyopen',run("S.goals[0].id"));chk('buy sheet has already-bought',lay().includes('data-act="buyprev"'));
act('buyprev');chk('goal closed without expense',run("S.goals[0].closed")===true&&run("S.tx.length")===txn);
console.log(bad?'FAILED '+bad:'ALL OK');process.exit(bad?1:0);
