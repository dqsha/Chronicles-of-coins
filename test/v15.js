// 0.19: кнопка «Скрыть» на блоках главной
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,localStorage:{getItem(){return null},setItem(){}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){},fetch:undefined};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);const app=()=>els['#app'].innerHTML;
run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:500000}];NOW='2026-11-10';UI.tab='home';render()");
chk('hide buttons present',app().includes('data-act="hide" data-v="today"')&&app().includes('data-v="forecast"'));
chk('bank and log never hideable',!app().includes('data-v="free"')&&app().includes('data-act="add" data-v="exp"'));
const act=(a,v)=>{ctx.__el={dataset:{v},disabled:false};run(`act('${a}',__el)`)};
act('hide','today');chk('today hidden',!app().includes('<h2>Сегодня')&&run('S.hide.today')===1);
act('hide','forecast');chk('forecast hidden',!app().includes('data-v="forecast"'));
run("UI.form={name:'x',import:'',err:''};openSheet('data')");chk('settings lists hidden',els['#layer'].innerHTML.includes('↺ Главная: сегодня')&&els['#layer'].innerHTML.includes('Вернуть все'));
act('unhide','today');chk('today back',app().includes('<h2>Сегодня')&&!run('S.hide.today'));
act('unhide','*');chk('all back',run('Object.keys(S.hide).length')===0&&app().includes('data-v="forecast"'));
run("delete S.hide;render()");chk('works without S.hide',app().includes('data-v="today"'));act('hide','goal');chk('hide recreates S.hide',run('S.hide.goal')===1);
console.log(bad?bad+' FAILED':'V15 OK');
