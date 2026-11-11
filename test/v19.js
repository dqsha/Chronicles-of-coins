// 0.25: курсы валют и конвертер
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
let calls=[];const resp={};
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,Promise,localStorage:{getItem(){return null},setItem(){}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){}};
ctx.fetch=ctx.window.fetch=(u)=>{calls.push(u);const r=resp[u];return r?Promise.resolve({json:()=>Promise.resolve(r)}):Promise.reject(new Error('net'))};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);const app=()=>els['#app'].innerHTML;
(async()=>{
run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:100000}];NOW='2026-11-11'");
chk('no rates yet -> convert null',run("convert(1,'USD','KZT')")===null);
run("UI.tab='wallet';render()");chk('wallet fx card without rates',app().includes('Курсы валют')&&app().includes('загрузятся'));
// основной источник упал -> запасной (fawazahmed0)
resp['https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/kzt.min.json']={date:'2026-11-11',kzt:{usd:0.002,eur:0.0018,rub:0.16}};
const ok=await run("fetchRates(true)");
chk('fallback source used',ok===true&&calls.length===2&&run("S.rates.via")==='fa');
chk('1 USD = 500 KZT',Math.abs(run("convert(1,'USD','KZT')")-500)<1e-9);
chk('cross EUR->USD',Math.abs(run("convert(1,'EUR','USD')")-0.002/0.0018)<1e-9);
chk('fmtCur dollar',run("fmtCur(1234.5,'USD')")==='$1'+' '+'234,5'||run("fmtCur(1234.5,'USD')").startsWith('$1'));
run("render()");chk('wallet shows USD rate',app().includes('USD')&&app().includes(run("fmt(500)")));
chk('no refetch same day',await run("fetchRates()")===false&&calls.length===2);
run("UI.form={amount:'100',from:'USD',to:'KZT'};openSheet('conv')");chk('converter result',els['#layer'].innerHTML.includes(run("fmt(50000)")));
run("act('convswap',{dataset:{},disabled:false})");chk('swap',run("UI.form.from")==='KZT'&&run("UI.form.to")==='USD');
// основной источник
resp['https://open.er-api.com/v6/latest/KZT']={result:'success',rates:{USD:0.0025,EUR:0.002}};calls=[];
await run("fetchRates(true)");chk('primary source preferred',calls.length===1&&run("S.rates.via")==='er'&&Math.abs(run("convert(1,'USD','KZT')")-400)<1e-9);
console.log(bad?bad+' FAILED':'V19 OK');})();
