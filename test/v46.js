// v0.45: универсальный импорт выписок (CSV / Excel / OFX / QIF / MT940 / CAMT.053 / HTML / текст). Данные выдуманы.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace(/\nstart\(\);\s*$/,'\n').replace(/\ntry\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'\n');
const els={};const el=k=>els[k]||(els[k]={innerHTML:'',classList:{add(){},remove(){}},dataset:{},focus(){},select(){},set textContent(v){this._t=v}});
const ctx=vm.createContext({console,window:{scrollTo(){},addEventListener(){},innerHeight:800,innerWidth:390,scrollY:0},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},body:{dataset:{},classList:{toggle(){}}},documentElement:{classList:{toggle(){}}}},localStorage:{getItem(){return null},setItem(){}},navigator:{clipboard:{writeText:()=>Promise.resolve()}},setTimeout,clearTimeout,TextDecoder,DecompressionStream,Blob,Response,Uint8Array,DataView});
vm.runInContext(code,ctx);
const run=c=>vm.runInContext(c,ctx);
let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
// v0.46: основная валюта, просмотр банка в другой валюте, английский язык
const act=(a,v)=>{ctx.__el={dataset:{v},disabled:false};run(`act('${a}',__el)`)};
ctx.__t='';const T=t=>{ctx.__t=t;return run('trText(__t)')};
run("S.lang='en';trCompile()");
chk('exact',T('Банк сейчас')==='Bank now');
chk('template with plural',T('5 дней подряд')==='5 days in a row'&&T('1 день подряд')==='1 day in a row');
chk('money template',T('осталось оплатить 36 000 ₸')==='36 000 ₸ left to pay'||T('осталось оплатить 36 000 ₸').startsWith('36'));
chk('parts with dot',T('Зарплата · Карта')==='Salary · Card');
chk('fragments',/Enough until/.test(T('Хватит до 5 декабря. Держись в 1 000 ₸ в день.')));
chk('user data kept',T('Магнум')==='Магнум');
chk('raw tour',run("trRaw(TOURS[2].t)").includes('{r Expense}'));
chk('plural en',run("plural(1,['день','дня','дней'])")==='день'&&run("plural(3,['день','дня','дней'])")==='дней');
chk('date en',run("fmtDate('2026-12-05')")==='Dec 5');
run("S.lang='ru'");chk('date ru',run("fmtDate('2026-12-05')")==='5 декабря');
// основная валюта
chk('default base KZT',run('BASE')==='KZT');
run("S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'Card',type:'card',bal0:1000}]");
chk('can rebase when empty',run('canRebase()')===true);
run("setBase('USD')");chk('base USD',run('BASE')==='USD'&&run("fmt(1234.5)").startsWith('$'));
chk('old account keeps its currency',run("S.accounts[0].cur")==='KZT');
chk('rates for base reset',run("S.rates")===null&&run("rateOf('USD')")===1&&run("rateOf('KZT')")===null);
run("S.rates={r:{KZT:500,EUR:0.9},at:today(),via:'t',base:'USD'}");
chk('rates relative to base',run("convert(1,'USD','KZT')")===500);
chk('account in KZT counted in USD',Math.abs(run("accBal(S.accounts[0])")-2)<1e-9);
run("addTx({type:'exp',amount:5,cat:'food',acc:'a',date:today()})");chk('locked after records',run('canRebase()')===false);
// просмотр банка в другой валюте не меняет основную
run("UI.tab='home';render()");act('bankcur','');chk('bank view switched, base same',run("UI.bankCur")!=null&&run('BASE')==='USD'&&!('bankCur' in run('S')));
act('bankmenu','');chk('bank currency list',run("UI.bankMenu")===true);
act('bankpick','USD');chk('pick base resets view',run("UI.bankCur")===null&&run("UI.bankMenu")===false);
run("S.newsSeen=null;UI.tab='home';render()");chk('mailbox dot',run("document.querySelector('#app').innerHTML").includes('ndot'));
act('news','');chk('news opened and seen',run("S.newsSeen")===run("NEWS[0].v")&&run("UI.sheet.kind")==='news');
console.log(bad?bad+' FAILED':'V46 OK');process.exitCode=bad?1:0;
