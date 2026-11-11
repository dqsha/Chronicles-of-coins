// 0.19: кнопка «Скрыть» на блоках главной
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,localStorage:{getItem(){return null},setItem(){}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){},fetch:undefined};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);const app=()=>els['#app'].innerHTML;
run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:500000}];NOW='2026-11-10';S.tx=[{id:'t1',type:'exp',amount:100,cat:'food',acc:'a',date:'2026-11-10',ts:1,note:''}];UI.tab='home';render()");
chk('hide button on home',app().includes('data-act="hide" data-v="today"'));run("UI.tab='plan';render()");chk('hide button on plan',app().includes('data-v="forecast"'));run("UI.tab='home';render()");
chk('bank and log never hideable',!app().includes('data-v="free"')&&app().includes('data-act="add" data-v="exp"'));
const act=(a,v)=>{ctx.__el={dataset:{v},disabled:false};run(`act('${a}',__el)`)};
act('hide','today');chk('today hidden',!app().includes('<h2>Сегодня')&&run('S.hide.today')===1);
run("UI.tab='plan';render()");act('hide','forecast');chk('forecast collapsed to line',app().includes('class="hbar glass" data-act="unhide" data-v="forecast"')&&!app().includes('data-act="hide" data-v="forecast"'));
run("UI.form={name:'x',import:'',err:''};openSheet('data')");chk('settings no longer lists hidden',!els['#layer'].innerHTML.includes('↺'));run("UI.tab='home';render()");chk('today collapsed bar',app().includes('data-act="unhide" data-v="today"'));
run("UI.tab='home';render()");act('unhide','today');chk('today back',app().includes('<h2>Сегодня')&&!run('S.hide.today'));
act('unhide','*');chk('all back',run('Object.keys(S.hide).length')===0&&app().includes('data-v="today"'));
run("delete S.hide;render()");chk('works without S.hide',app().includes('data-v="today"'));act('hide','today');chk('hide recreates S.hide',run('S.hide.today')===1);
console.log(bad?bad+' FAILED':'V15 OK');
