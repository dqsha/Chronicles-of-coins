// 0.34: окно записи: кнопка выше, категории свёрнуты, запись без категории, быстрый разбор
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
run("S.xp=0;S.tx=[]");
// окно: кнопка выше категорий, категории свёрнуты
act('add','exp');let L=lay();
chk('save button before categories',L.indexOf('data-act="save"')>0&&L.indexOf('data-act="save"')<L.indexOf('data-act="catopen"'));
chk('categories collapsed',L.indexOf('data-act="cat"')<0&&L.indexOf('catsel')>0);
chk('hint: optional',L.indexOf('необязательно')>0);
act('catopen');L=lay();
chk('categories open',L.indexOf('data-act="cat"')>0);
act('cat','food');L=lay();
chk('collapsed after pick',L.indexOf('data-act="cat"')<0&&run('UI.F.cat')==='food');
// запись без категории
run("UI.F=newF('exp');UI.F.amount='1500'");run('saveTxForm()');
let tx=run('S.tx');
chk('saved without category',tx.length===1&&tx[0].cat==='none');
chk('uncat info',run("catInfo('none').name")==='Без категории');
// с категорией
run("UI.F=newF('exp');UI.F.amount='700';UI.F.cat='food'");run('saveTxForm()');
chk('saved with category',run('S.tx.length')===2&&run("S.tx.filter(x=>x.cat==='food').length")===1);
// доход без категории тоже
run("UI.F=newF('inc');UI.F.amount='5000'");run('saveTxForm()');
chk('income without category',run("S.tx.filter(x=>x.type==='inc'&&x.cat==='none').length")===1);
// баланс считается
chk('balance ok',near(run('accBal(S.accounts[0])'),100000-1500-700+5000));
// баннер в Записях и быстрый разбор
run("UI.tab='list';render()");
chk('banner in list',app().indexOf('data-act="fixcat"')>0&&app().indexOf('Без категории: 2')>0);
act('fixcat');L=lay();
chk('fix sheet opens',L.indexOf('data-act="fixset"')>0&&L.indexOf('Без категории: 2')>0);
// выбрать категорию: первая (новейшая) запись
const first=run("uncatList()[0].id");act('fixset','food');
chk('fix assigned',run("S.tx.find(x=>x.id==='"+first+"').cat")==='food');
chk('one left',run('uncatList().length')===1);
act('fixskip');L=lay();
chk('skip leaves none shown',L.indexOf('Остались только пропущенные')>0);
// похожие
run("S.tx=[];UI.fixSkip=[];S.accounts=[{id:'a',name:'Карта',type:'card',bal0:100000}]");
for(const n of ['Magnum','Magnum','Cafe']){run("UI.F=newF('exp');UI.F.amount='100';UI.F.note='"+n+"'");run('saveTxForm()')}
act('fixcat');const cnt0=run('uncatList().length');
const top=run('uncatList()[0].note');act('fixset','food');
chk('similar assigned together',cnt0===3&&(top==='Cafe'?run('uncatList().length')===2:run('uncatList().length')===1));
chk('transfer never uncat',run("isUncat({type:'tr',cat:null})")===false);
console.log(bad?'FAILED '+bad:'OK all');
