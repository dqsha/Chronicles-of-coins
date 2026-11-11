// 0.27: счета в валюте и главная валюта показа
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,localStorage:{getItem(){return null},setItem(){}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){},fetch:undefined};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);const app=()=>els['#app'].innerHTML,lay=()=>els['#layer'].innerHTML;
const act=(a,v)=>{ctx.__el={dataset:{v},disabled:false};run(`act('${a}',__el)`)};
const near=(a,b)=>Math.abs(a-b)<0.01;
run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:100000}];NOW='2026-11-11';S.rates={r:{USD:0.002,EUR:0.0016},at:'2026-11-11'}");
// новый долларовый счёт
run("UI.form={name:'Доллары',type:'cash',cur:'USD',bal:'500',err:''};openSheet('acc',{id:null});saveAcc()");
const d=run("S.accounts[1]");chk('usd account created',d.cur==='USD'&&d.bal0===500);
chk('native 500, tenge 250000',near(run("accBalNative(S.accounts[1])"),500)&&near(run("accBal(S.accounts[1])"),250000));
chk('total in tenge',near(run("totalBal()"),350000));
// трата в долларах со счёта в долларах
run("addTx({type:'exp',amount:10000,ocur:'USD',oamt:20,cat:'cafe',acc:S.accounts[1].id})");
chk('usd spend reduces native by 20',near(run("accBalNative(S.accounts[1])"),480));
// трата в тенге со счёта в долларах -> nat по курсу
run("addTx({type:'exp',amount:5000,cat:'food',acc:S.accounts[1].id})");chk('tenge spend on usd acc -> $10',near(run("accBalNative(S.accounts[1])"),470));
// курс меняется: нативный остаток тот же, тенге другие
run("S.rates.r.USD=0.0025");chk('rate change: native same, tenge recalculated',near(run("accBalNative(S.accounts[1])"),470)&&near(run("accBal(S.accounts[1])"),188000));
// перевод тенге -> доллары
run("addTx({type:'tr',amount:40000,acc:'a',to:S.accounts[1].id})");chk('transfer converts at record rate',near(run("accBalNative(S.accounts[1])"),570)&&near(run("accBalNative(S.accounts[0])"),100000-40000));
run("UI.tab='wallet';render()");chk('wallet row shows $ and ≈ tenge',app().includes('$570')&&app().includes('≈ '));
// валюту нельзя сменить у счёта с записями
run("openAcc(S.accounts[1].id);UI.form.cur='EUR';saveAcc()");chk('cannot change currency with records',String(run("UI.form.err")).includes('только пока'));
// новый расход по умолчанию в валюте выбранного счёта
run("S.lastAcc=S.accounts[1].id");chk('form defaults to account currency',run("newF('exp').cur")==='USD');
// главная валюта
run("UI.sheet=null;UI.tab='home';render()");const kzt=app();act('dispcur','USD');
chk('bank shown in dollars',app().includes('$')&&run("dCur()")==='USD');
act('dispcur','KZT');chk('back to tenge',run("dCur()")==='KZT'&&!('dispCur' in run("S")));
run("UI.form={name:'x',pet:'y',payday:'',import:'',err:''};openSheet('data')");chk('settings has display currency',lay().includes('data-act="dispcur"'));
console.log(bad?bad+' FAILED':'V21 OK');
