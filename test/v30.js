// 0.31: новая структура вкладок и лёгкая главная
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
// 0.37: плащ, кольцо, амулет
run("S.xp=xpAtLevel(2)");
chk('L2: no cloak yet',run("curTier('cloak',2)")===-1&&!run("heroArt(2)").includes('class="cloak"'));
run("S.xp=xpAtLevel(3)");
chk('L3: cloak 0 on hero',run("curTier('cloak',3)")===0&&run("heroArt(3)").includes('class="cloak"'));
chk('avatar has no cloak',!run("heroAvatar()").includes('class="cloak"'));
run("S.xp=xpAtLevel(30)");
chk('L30: ring tier 4, amulet tier 3',run("curTier('ring',30)")===4&&run("curTier('amulet',30)")===3);
chk('equip older cloak',run("setEquip('cloak',1,30)")===true&&run("curTier('cloak',30)")===1);
chk('cannot equip locked ring',run("setEquip('ring',4,10)")===false);
act('gear');
chk('gear sheet has cloak/ring/amulet lists',lay().includes('data-s="cloak"')&&lay().includes('data-s="ring"')&&lay().includes('data-s="amulet"')&&lay().includes('class="oic"'));
chk('all icons render',[0,1,2,3,4].every(i=>['cloak','ring','amulet'].every(s=>run("extraIcon('"+s+"',"+i+")").includes('<svg'))));
console.log(bad?'FAILED '+bad:'ALL OK');process.exit(bad?1:0);
