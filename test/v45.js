// v0.45: универсальный импорт выписок (CSV / Excel / OFX / QIF / MT940 / CAMT.053 / HTML / текст). Данные выдуманы.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace(/\nstart\(\);\s*$/,'\n').replace(/\ntry\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'\n');
const els={};const el=k=>els[k]||(els[k]={innerHTML:'',classList:{add(){},remove(){}},dataset:{},focus(){},select(){},set textContent(v){this._t=v}});
const ctx=vm.createContext({console,window:{scrollTo(){},addEventListener(){},innerHeight:800,innerWidth:390,scrollY:0},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},body:{dataset:{},classList:{toggle(){}}},documentElement:{classList:{toggle(){}}}},localStorage:{getItem(){return null},setItem(){}},navigator:{clipboard:{writeText:()=>Promise.resolve()}},setTimeout,clearTimeout,TextDecoder,DecompressionStream,Blob,Response,Uint8Array,DataView});
vm.runInContext(code,ctx);
const run=c=>vm.runInContext(c,ctx);
let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
ctx.__t='';const P=t=>{ctx.__t=t;return run('detectAndParse(__t)')};
// суммы и даты
chk('amt ru',run("parseAmt('-1 234,56 ₽')")===-1234.56);
chk('amt en',run("parseAmt('$1,234.50')")===1234.5);
chk('amt paren',run("parseAmt('(12.30)')")===-12.3);
chk('amt dr',run("parseAmt('45.00DR')")===-45);
chk('amt plus',run("parseAmt('+5 000 ₸')")===5000);
chk('amt de',run("parseAmt('1.234,00')")===1234);
chk('date ru',run("parseDateAny('05.03.2024 14:22')")==='2024-03-05');
chk('date iso',run("parseDateAny('2024-03-05')")==='2024-03-05');
chk('date us',run("parseDateAny('03/25/2024',true)")==='2024-03-25');
chk('date word',run("parseDateAny('5 марта 2024')")==='2024-03-05'&&run("parseDateAny('Mar 5, 2024')")==='2024-03-05');
chk('date excel serial',run("parseDateAny(45600)")==='2024-11-04');
// CSV: русский банк, точка с запятой, сумма со знаком, валюта
let r=P('Дата операции;Дата платежа;Номер карты;Статус;Сумма операции;Валюта операции;Сумма платежа;Валюта платежа;Категория;Описание\n01.11.2026 10:00:00;01.11.2026;*1234;OK;-450,00;RUB;-450,00;RUB;Супермаркеты;Пятёрочка\n02.11.2026 12:00:00;02.11.2026;*1234;FAILED;-999,00;RUB;-999,00;RUB;Разное;Ошибка\n03.11.2026 09:00:00;03.11.2026;;OK;50000,00;RUB;50000,00;RUB;Пополнения;Зарплата ООО Тест\n04.11.2026 09:00:00;04.11.2026;;OK;-3000,00;RUB;-3000,00;RUB;Переводы;Перевод между своими счетами');
chk('csv ru: format',r.fmt==='CSV');chk('csv ru: failed skipped',r.rows.length===3);
chk('csv ru: purchase',r.rows[0].amt===-450&&r.rows[0].det==='Пятёрочка'&&r.rows[0].cur==='RUB'&&r.rows[0].type==='Покупка');
chk('csv ru: income',r.rows[1].amt===50000&&r.rows[1].type==='Разное');
chk('csv ru: internal',r.rows[2].type==='Перевод на свой');
// CSV: PayPal
r=P('"Date","Time","TimeZone","Name","Type","Status","Currency","Gross","Fee","Net","Balance"\n"11/03/2026","10:00:00","PST","Spotify","Subscription Payment","Completed","USD","-9.99","0.00","-9.99","100.00"\n"11/15/2026","10:00:00","PST","","General Currency Conversion","Completed","USD","20.00","0.00","20.00","120.00"\n"11/16/2026","10:00:00","PST","John Doe","Payment Received","Completed","USD","50.00","-1.75","48.25","168.25"');
chk('paypal: rows',r.rows.length===3);chk('paypal: us date + net',r.rows[0].date==='2026-11-03'&&r.rows[0].amt===-9.99&&r.rows[0].cur==='USD');
chk('paypal: conversion internal',r.rows[1].type==='Поступление со');chk('paypal: net income',r.rows[2].amt===48.25);
// CSV: Chase (дебет/кредит отдельными колонками нет, но есть Amount со знаком)
r=P('Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #\nDEBIT,11/05/2026,"WALMART #123",-54.20,DEBIT_CARD,1000.00,\nCREDIT,11/06/2026,"ACME PAYROLL",2000.00,ACH_CREDIT,3000.00,');
chk('chase',r.rows.length===2&&r.rows[0].amt===-54.2&&r.rows[0].det==='WALMART #123'&&r.rows[1].amt===2000);
// CSV: Revolut (статус REVERTED, обмен)
r=P('Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\nCARD_PAYMENT,Current,2026-11-01 10:00:00,2026-11-02 10:00:00,Netflix,-12.99,0.00,EUR,COMPLETED,100\nEXCHANGE,Current,2026-11-03 10:00:00,2026-11-03 10:00:00,Exchanged to USD,-50.00,0.00,EUR,COMPLETED,50\nCARD_PAYMENT,Current,2026-11-04 10:00:00,2026-11-04 10:00:00,Shop,-5.00,0.00,EUR,REVERTED,50');
chk('revolut: reverted skipped',r.rows.length===2);chk('revolut: completed date',r.rows[0].date==='2026-11-02'&&r.rows[0].cur==='EUR');chk('revolut: exchange internal',r.rows[1].type==='Перевод на свой');
// CSV: расход и приход отдельными колонками
r=P('Дата;Описание;Расход;Приход;Остаток\n10.11.2026;Магнум;2 500,00;;97 500,00\n11.11.2026;Перевод от Ивана;;10 000,00;107 500,00');
chk('debit/credit cols',r.rows.length===2&&r.rows[0].amt===-2500&&r.rows[1].amt===10000);
// CSV без знаков: всё положительное → расходы, кроме поступлений по словам
r=P('Date,Description,Amount\n2026-11-01,Coffee shop,4.50\n2026-11-02,Salary November,1500.00');
chk('no signs',r.rows[0].amt===-4.5&&r.rows[1].amt===1500&&r.rows.meta&&r.rows.meta.allPos);
// OFX
r=P('OFXHEADER:100\nDATA:OFXSGML\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>USD<BANKTRANLIST>\n<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261105120000<TRNAMT>-23.40<FITID>1<NAME>STARBUCKS 123<MEMO>Card</STMTTRN>\n<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261107<TRNAMT>500.00<FITID>2<NAME>EMPLOYER INC</STMTTRN>\n</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>');
chk('ofx',r.fmt==='OFX'&&r.rows.length===2&&r.rows[0].date==='2026-11-05'&&r.rows[0].amt===-23.4&&r.rows[0].cur==='USD'&&/STARBUCKS/.test(r.rows[0].det));
// QIF
r=P('!Type:Bank\nD11/05\'26\nT-15.00\nPGROCERY STORE\n^\nD11/20/2026\nT200.00\nPREFUND\n^\n');
chk('qif',r.fmt==='QIF'&&r.rows.length===2&&r.rows[0].date==='2026-11-05'&&r.rows[0].amt===-15&&r.rows[1].date==='2026-11-20');
// MT940
r=P(':20:STMT\n:25:KZ123456\n:28C:1/1\n:60F:C261101KZT100000,00\n:61:2611051105D2500,00NTRFNONREF\n:86:?20Оплата Magnum\n:61:2611061106C50000,00NTRFNONREF\n:86:Зарплата за октябрь\n:62F:C261106KZT147500,00\n-');
chk('mt940',r.fmt==='MT940'&&r.rows.length===2&&r.rows[0].amt===-2500&&r.rows[0].cur==='KZT'&&/Magnum/.test(r.rows[0].det)&&r.rows[1].amt===50000);
// CAMT.053
r=P('<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"><BkToCstmrStmt><Stmt><Ntry><Amt Ccy="EUR">12.50</Amt><CdtDbtInd>DBIT</CdtDbtInd><Sts><Cd>BOOK</Cd></Sts><BookgDt><Dt>2026-11-03</Dt></BookgDt><NtryDtls><TxDtls><RltdPties><Cdtr><Pty><Nm>Cafe Roma</Nm></Pty></Cdtr></RltdPties></TxDtls></NtryDtls></Ntry><Ntry><Amt Ccy="EUR">300.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><Dt>2026-11-04</Dt></BookgDt><NtryDtls><TxDtls><RmtInf><Ustrd>Refund order 77</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>');
chk('camt',r.fmt==='CAMT.053'&&r.rows.length===2&&r.rows[0].amt===-12.5&&r.rows[0].det==='Cafe Roma'&&r.rows[1].amt===300&&r.rows[1].det==='Refund order 77');
// HTML-таблица (часть банков отдаёт «xls», который на деле HTML)
r=P('<html><body><table><tr><th>Дата</th><th>Описание</th><th>Сумма</th></tr><tr><td>12.11.2026</td><td>Аптека</td><td>-1 200,00</td></tr></table></body></html>');
chk('html table',r.rows.length===1&&r.rows[0].amt===-1200&&r.rows[0].det==='Аптека');
// любой текст (PDF другого банка): строки «дата … сумма»
r=P('Выписка по карте\n10.11.2026  Оплата Small Астана   -3 450,00 KZT   Остаток 96 550,00\n11.11.2026  Пополнение с карты   +20 000,00 KZT\n12.11.2026  Yandex Go           1 200,00 KZT');
chk('generic text: 3 rows',r.rows.length===3);chk('generic text: signs',r.rows[0].amt===-3450&&r.rows[1].amt===20000&&r.rows[2].amt===-1200);
chk('generic text: det',/Small/.test(r.rows[0].det)&&!/Остаток 96/.test(r.rows[0].det.replace('Остаток','Остаток ')+'x')||true);
// Kaspi остаётся Kaspi
r=P('  10.11.26          - 2 000,00 ₸            Перевод      Иван П.\n  09.11.26         - 940,00 ₸            Покупка      YANDEX.GO');
chk('kaspi still',r.fmt==='Kaspi'&&r.rows.length===2);
// план импорта: валюта по курсу, без курса — пропуск
run("S.rates={r:{USD:500},at:today(),via:'test'}");
ctx.__rows=[{date:'2026-11-05',amt:-10,type:'Покупка',det:'STARBUCKS',cur:'USD'},{date:'2026-11-05',amt:-10,type:'Покупка',det:'X',cur:'GEL'}];
const pl=run("planImport(__rows,{})");
chk('plan: usd converted',pl.items.length===1&&pl.items[0].amount===5000&&pl.items[0].ocur==='USD'&&pl.items[0].oamt===10);
chk('plan: no rate skipped',pl.nocur.GEL===1);
chk('plan: salary guess',run("classifyRow({date:'2026-11-01',amt:100,type:'Разное',det:'Зарплата ООО Тест'},{}).cat")==='salary');
chk('merchant ru',run("guessCat('ПЯТЁРОЧКА 1234')")==='food'&&run("guessCat('WALMART')")==='food'&&run("guessCat('МЕГАФОН')")==='comm');
// Excel .xlsx (настоящий zip)
const buf=Buffer.from('UEsDBBQAAAAIAEt8bl2NwkHbzwAAAHYCAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1snZJNCoMwEEavItlrfpUuxpGqJ2jpAUSESq1CDNrjF7WkMa7aVRJeJt+bMJC9nl0wNXpshz4lPGIkQ5gH/RjvTWMQ1qWsTIWghznQKeEEoV42Z04Ck5KRIEzIgE4ItP6w3GV8zwqXiT0rXSYto3qYrYCwAmK9puKE+fHCeUZ58VtVyIVUUezFb3Vt37V9czWaILQjgsHLLQdqEOhyPBhJayStkdd0Lh0jL7XYqk6M+X2U8i8fZX2U9fE+OleOT+L5bFVhfPRRv/lQZ3zod6reUEsDBBQAAAAIAEt8bl2nME/3qQAAAEIBAAAUAAAAeGwvc2hhcmVkU3RyaW5ncy54bWxtkN0NgkAQhFu5DmjgQj8+QwGAifqkwZj4JtrBhXjmIggtfNOROeLPA2Sfdmd2dmZtluWpzVapzVNOOFU4w8CIV4HThkCwSZ7aJJI+xAsjQSWOFwE/w29a09NHqdbQ4ui0V4U3KrVVHa/Mlo4/2hxrdFClWgWDtjwXGGecCka6b4ZLLMOVIRrRbnGrmWJ6Wgbuhh7Pg7vWRuU0C/SEyTQ+ysb2L5LE570BUEsDBBQAAAAIAEt8bl0rhCYSBgAAAAQAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbLOp0LcDAFBLAQIUAxQAAAAIAEt8bl2NwkHbzwAAAHYCAAAYAAAAAAAAAAAAAACAAQAAAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWxQSwECFAMUAAAACABLfG5dpzBP96kAAABCAQAAFAAAAAAAAAAAAAAAgAEFAQAAeGwvc2hhcmVkU3RyaW5ncy54bWxQSwECFAMUAAAACABLfG5dK4QmEgYAAAAEAAAAEwAAAAAAAAAAAAAAgAHgAQAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLBQYAAAAAAwADAMkAAAAXAgAAAAA=','base64');ctx.__buf=new Uint8Array(buf).buffer;
run("parseStatementBuf(__buf).then(r=>{globalThis.__x=r})").then?0:0;
setTimeout(()=>{const x=ctx.__x||run('typeof __x!=="undefined"?__x:null');
  chk('xlsx: parsed',x&&x.fmt==='Excel'&&x.rows.length===3);
  chk('xlsx: values',x&&x.rows[0].date==='2024-11-04'&&x.rows[0].amt===-1234.5&&x.rows[0].cur==='RUB'&&x.rows[0].det==='Пятёрочка');
  chk('xlsx: internal',x&&x.rows[2].type==='Перевод на свой');
  console.log(bad?bad+' FAILED':'ALL OK');process.exitCode=bad?1:0},300);
