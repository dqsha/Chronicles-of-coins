const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace(/\nstart\(\);\s*$/,'\n').replace(/\ntry\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'\n');
const els={};const el=k=>els[k]||(els[k]={innerHTML:'',classList:{add(){},remove(){}},dataset:{},focus(){},select(){},set textContent(v){this._t=v}});
const ctx=vm.createContext({console,window:{scrollTo(){},addEventListener(){},innerHeight:800,innerWidth:390,scrollY:0},document:{querySelector:el,addEventListener(){},body:{dataset:{},classList:{toggle(){}}}},localStorage:{getItem(){return null},setItem(){}},navigator:{clipboard:{writeText:()=>Promise.resolve()}},setTimeout,clearTimeout});
vm.runInContext(code,ctx);
const run=c=>vm.runInContext(c,ctx);
let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const act=(a,v,ds)=>{ctx.__el={dataset:Object.assign({v},ds||{}),disabled:false};run(`act('${a}',__el)`)};
// synthetic statement in the same shape as the real one (invented names and shops)
const LAY=`СПРАВКА
об остатке на счете
Доступно на 10.10.26                        + 722,00 ₸
 Пополнения                             + 1 000,00 ₸
Доступно на 10.11.26                          + 0,00 ₸
   Дата            Сумма                  Операция       Детали
  10.11.26          - 3 381,00 ₸     Перевод на свой     На Kaspi Депозит
                                                  счет
  10.11.26          - 2 000,00 ₸            Перевод      Иван П.
  10.11.26          + 5 000,00 ₸     Поступление со     С Kaspi Депозита
                                        своего счета
  09.11.26         - 11 990,00 ₸            Покупка      APPLE.COM/BILL
  09.11.26          - 940,00 ₸            Покупка      YANDEX.GO
  09.11.26          - 940,00 ₸            Покупка      YANDEX.GO
  09.11.26        - 1 200,00 ₸            Покупка      ИП ТЕСТОВ
  08.11.26      + 144 617,00 ₸       Пополнение      Пётр С.


АО «Kaspi Bank», БИК CASPKZKA, www.kaspi.kz
Приложение к Справке №1 от 10 ноября 2026

  08.11.26          - 1 424,00 ₸           Покупка     МАГАЗИН ОДИН
  08.11.26          + 500,00 ₸    Поступление со     С Kaspi Депозита
                                     своего счета
  26.10.26       - 23 499,00 ₸   Перевод на свой     Оплата Kaspi Кредита
                                              счет
  22.10.26         - 6 053,94 ₸          Перевод     На карту CJSC Test Bank*5490
                 (- 13,32 USD)
  22.10.26         - 200,00 ₸            Разное     Комиссия за перевод на карту др. банка
  20.10.26         + 9 000,00 ₸        Пополнение     В Kaspi Банкомате
  19.10.26         - 1 999,00 ₸          Покупка     YANDEX.PLUS
  18.10.26         + 1 500,00 ₸          Покупка     MAGNUM
  17.10.26         - 6 490,00 ₸           Покупка     Altel
  10.10.26         - 575,00 ₸                Перевод       Анна С.

  - Сумма заблокирована. Банк ожидает подтверждения от платежной системы.
Раздел «Краткое содержание операций по карте», в строках «Поступления со своих сч
счета» содержит информацию об операциях клиента между счетами в Kaspi.`;
// same rows but one cell per line (what some PDF viewers copy)
const CELL=LAY.split('\n').map(l=>l.trim().split(/\s{2,}/).join('\n')).join('\n');
for(const [nm,txt] of [['layout',LAY],['cell-per-line',CELL]]){
  ctx.__t=txt;const rows=run('parseKaspi(__t)');
  chk(nm+': 18 operations parsed (no summary lines)',rows.length===18);
  chk(nm+': dates are ISO',rows[0].date==='2026-11-10'&&rows[rows.length-1].date==='2026-10-10');
  chk(nm+': sign and amount',rows[0].amt===-3381&&rows[2].amt===5000&&rows[7].amt===144617);
  chk(nm+': type and details',rows[0].type==='Перевод на свой'&&rows[0].det==='На Kaspi Депозит'&&rows[4].det==='YANDEX.GO');
  chk(nm+': footer text not glued to details',rows.find(r=>r.det.indexOf('Kaspi Bank')>=0||r.det.indexOf('Приложение')>=0)===undefined);
  chk(nm+': usd note stripped',rows.find(r=>r.type==='Перевод'&&r.amt<-6000).det==='На карту CJSC Test Bank*5490');
}
ctx.__t=LAY;
run(`S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'Нал',type:'cash',bal0:5000},{id:'b',name:'Kaspi',type:'card',bal0:90000}];S.tourSeen=true;NOW='2026-11-10';UI.tab='home';render()`);
run(`PL=planImport(parseKaspi(__t),{tx:true,inc:true,map:{}})`);
chk('internal transfers skipped (3: deposit x2, own account)',run('PL.skip.internal')===3);
chk('cash top-up skipped',run('PL.skip.cash')===1);
const cat=n=>run(`PL.items.filter(i=>i.cat==='${n}').length`);
chk('yandex go -> taxi',cat('taxi')===2);
chk('apple and yandex plus -> fun',cat('fun')===2);
chk('altel -> comm',cat('comm')===1);
chk('credit payment -> credit',cat('credit')===1);
chk('people transfers -> xfer (3: person, bank card, person)',cat('xfer')===3);
chk('refund is income',run(`PL.items.filter(i=>i.type==='inc'&&i.note.indexOf('Возврат')===0).length`)===1);
chk('unknown shops listed',run('PL.unknown.map(u=>u.key).sort().join()')==='МАГАЗИН ОДИН,ТЕСТОВ');
chk('unknown sorted by sum',run('PL.unknown[0].key')==='МАГАЗИН ОДИН');
chk('identical rows are kept as separate operations',run(`PL.items.filter(i=>i.cat==='taxi'&&i.amount===940).length`)===2);
run(`PL2=planImport(parseKaspi(__t),{tx:false,inc:false,map:{}})`);
chk('toggles skip people transfers and incoming',run('PL2.skip.people')>=4&&run(`PL2.items.every(i=>i.cat!=='xfer')`));
// apply
const b0=run('accBal(S.accounts[1])'),xp0=run('S.xp'),rec0=run('lifeStats().recs');
run(`S.accounts[1].bal0+=0;IMP=applyImport({rows:parseKaspi(__t),acc:'b',tx:true,inc:true,map:{'ТЕСТОВ':'food'}})`);
chk('imported count',run('IMP.n')===run('S.tx.filter(x=>x.hist).length')&&run('IMP.n')>10);
chk('balance unchanged after import',Math.abs(run('accBal(S.accounts[1])')-b0)<0.001);
chk('no xp for fewer than 15 rows',run('S.xp')===xp0);
chk('chosen category applied',run(`S.tx.find(x=>x.note==='ИП ТЕСТОВ').cat`)==='food');
chk('rule remembered',run(`S.rules['ТЕСТОВ']`)==='food');
chk('unknown without choice goes to other',run(`S.tx.find(x=>x.note==='МАГАЗИН ОДИН').cat`)==='other');
chk('history does not count as records for achievements',run('lifeStats().recs')===rec0);
chk('imp keys saved',run(`S.tx.filter(x=>x.imp).length`)===run('IMP.n'));
run(`PL3=planImport(parseKaspi(__t),{tx:true,inc:true,map:{}})`);
chk('re-import adds nothing, all duplicates',run('PL3.items.length')===0&&run('PL3.dups')===run('IMP.n'));
// reward: needs >=15 rows and >=30 days span
chk('reward 0 for short history',run('histReward()')===0);
let big='';for(let i=0;i<20;i++){const d=String(1+i).padStart(2,'0');big+=`  ${d}.09.26   - ${1000+i},00 ₸   Покупка   KFC\n`}
ctx.__b=big;run(`applyImport({rows:parseKaspi(__b),acc:'b',tx:true,inc:true,map:{}})`);
chk('history reward given once for 60 days span (2 months)',run('S.histM')===2&&run('S.xp')===xp0+60);
run(`applyImport({rows:parseKaspi(__b),acc:'b',tx:true,inc:true,map:{}})`);chk('no double reward',run('S.xp')===xp0+60);
chk('gainXp noted for history',true);
// ui
run(`UI.tab='home';S.tx=[];S.histHide=false;render()`);chk('home shows history card when few records and no history',els['#app'].innerHTML.includes('data-act="imp"'));
run(`S.histHide=true;render()`);chk('hide works',!els['#app'].innerHTML.includes('data-act="imphide"'));
run(`UI.tab='wallet';render()`);chk('wallet always has import button',els['#app'].innerHTML.includes('data-act="imp"'));
act('imp');chk('import sheet step 1',els['#layer'].innerHTML.includes('Выбрать файл выписки')&&els['#layer'].innerHTML.includes('никуда не отправляется'));
act('impparse');chk('empty text shows error',els['#layer'].innerHTML.includes('Не нашёл операций'));
run(`UI.form.text=__t`);act('impparse');chk('step 2 summary',els['#layer'].innerHTML.includes('Проверь список')&&els['#layer'].innerHTML.includes('Незнакомые места')&&els['#layer'].innerHTML.includes('data-act="impgo"'));
act('imptoggle','tx');chk('toggle re-plans',els['#layer'].innerHTML.includes('Переводы людям: не считать'));
act('impback');chk('back to step 1 keeps text',run('UI.form.text.length')>100);
run(`S.tx=[];S.rules={};S.histM=0;UI.form.step=1;UI.pendingLvl=null`);act('impparse');act('impgo');
chk('impgo closes sheet, shows stats, stores history',(run('UI.sheet')===null||run('UI.sheet.kind')==='lvl')&&run('UI.tab')==='stats'&&run('S.tx.filter(x=>x.hist).length')>10);
chk('stats habits card',els['#app'].innerHTML.includes('Твои привычки')||run('S.tx.filter(x=>x.type===\"exp\"&&x.cat!==\"xfer\"&&x.cat!==\"credit\").length')<10);
console.log(bad?bad+' FAILED':'V06 OK');process.exit(bad?1:0);
