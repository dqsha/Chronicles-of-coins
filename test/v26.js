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
// новичок: только банк и кнопки
// 0.33: облик героя (раса + класс), оружие по классам, компаньоны
run("S.xp=xpAtLevel(12)");
chk('default look',run("JSON.stringify(heroLook())")==='{"cls":"warrior","skin":0,"body":0,"hair":0,"hcol":0,"beard":-1}');
chk('weapon names per class',run("GEAR.weapon.map(g=>g.n).join()").startsWith('Тренировочный меч')&&run("GEAR.weapon.length")===5);
act('setcls','mage');
chk('class changed, weapon override cleared',run("S.hero.cls")==='mage'&&run("GEAR.weapon[0].n")==='Посох ученика');
act('setskin','3');
chk('skin changed, class kept',run("S.hero.skin===3&&S.hero.cls==='mage'"));
act('sethair','5');act('sethcol','2');act('setbeard','1');
chk('hair/colour/beard set',run("S.hero.hair===5&&S.hero.hcol===2&&S.hero.beard===1"));
const ha=run("heroArt(12)");
chk('heroArt is paper-doll',ha.includes('pxh')&&!ha.includes('assets/hero/'));
chk('avatar is paper-doll',run("heroAvatar()").includes('pxav'));
run("UI.tab='hero';render()");
chk('hero tab: look button',app().includes('data-act="look"')&&app().includes('pxh'));
chk('weapon slot rarity r2',app().includes('r2'));
run("S.xp=xpAtLevel(30)");run("render()");chk('lvl 30: legendary r4',app().includes('r4'));
run("S.xp=xpAtLevel(12)");run("render()");
act('look');chk('look sheet: swatches and classes',lay().includes('data-act="setskin"')&&lay().includes('data-act="setcls" data-v="rogue"')&&lay().includes('Kenney'));
act('gear');chk('inventory: 6 slots, 4 locked',(lay().match(/class="islot/g)||[]).length===6&&(lay().match(/islot lock/g)||[]).length===4);
chk('inventory: weapon+armor rows',(lay().match(/data-act="equip"/g)||[]).length===10);
act('close');
const fsx=require('fs'),root=require('path').dirname(require('path').resolve(process.argv[2]))+'/../assets/';
let miss=[];if(!fsx.existsSync(root+'kenney/roguelike.png'))miss.push('kenney');
['slime','cat','dragon','phoenix'].forEach(k=>[1,2,3,4].forEach(i=>{if(!fsx.existsSync(root+'pet/'+k+'-'+i+'.webp'))miss.push('p'+k+i)}));
chk('all sprites exist ('+miss.join(',')+')',miss.length===0);
// компаньоны: волка нет, первый питомец слайм
chk('default pet slime',run("petKind()")==='slime'&&run("petInfo().stageName")==='Капля слайма'&&run("PETS.some(p=>p.id==='wolf')")===false);
run("S.xp=xpAtLevel(4)");chk('cat locked at L4',run("switchPet('cat')")===false&&run("petKind()")==='slime');
run("S.xp=xpAtLevel(5);S.pet.food=5;S.pet.xp=9");
chk('cat unlocked at L5',run("switchPet('cat')")===true&&run("petKind()")==='cat');
chk('food carried over, new pet starts fresh',run("S.pet.food")===5&&run("S.pet.xp")===0&&run("S.pet.name")==='Мрак');
chk('slime progress stored',run("S.petBox.slime.xp")===9);
chk('cat stage names',run("petInfo().stageName")==='Котёнок из тени');
run("S.pet.xp=60");chk('cat stage 4 = guardian',run("petInfo().stageName")==='Страж теней'&&run("petImg('cat',3,'ok')").includes('assets/pet/cat-4.webp'));
run("switchPet('slime')");chk('back to slime restores xp 9',run("petKind()")==='slime'&&run("S.pet.xp")===9&&run("S.petBox.cat.xp")===60);
run("S.xp=xpAtLevel(15)");
['cat','dragon','phoenix'].forEach(k=>chk('switch to '+k,run("switchPet('"+k+"')")===true&&run("petKind()")===k));
// миграция: старое сохранение с волком становится слаймом
const oldSave=JSON.stringify({onboarded:true,pet:{food:3,xp:12,fedOn:null,name:'Уголёк',kind:'wolf'},petBox:{wolf:{xp:1}}});
ctx.localStorage.getItem=()=>oldSave;run("S=load()");
chk('old wolf save migrated to slime with same progress',run("S.pet.kind==='slime'&&S.pet.xp===12&&S.pet.food===3&&S.pet.name==='Желе'&&!S.petBox.wolf"));
const oldSave2=JSON.stringify({onboarded:true,pet:{food:1,xp:2,fedOn:null,name:'Бобик'}});
ctx.localStorage.getItem=()=>oldSave2;run("S=load()");
chk('custom name kept on migration',run("S.pet.name")==='Бобик'&&run("petKind()")==='slime');
ctx.localStorage.getItem=()=>null;run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:100000}];S.xp=xpAtLevel(15)");
run("UI.tab='hero';render()");chk('pet card has companions button',app().includes('data-act="pets"')&&app().includes('pet-img'));
act('pets');chk('pets list shows 4',(lay().match(/data-act="petview"/g)||[]).length===4);
act('petview','dragon');chk('detail shows 4 stages',(lay().match(/class="pst"/g)||[]).length===4);
act('close');
// предупреждение о level-up: компаньон в списке открытий
chk('unlock list has companion',run("unlockedBetween(4,5)").some(x=>x.includes('Теневой кот')));
console.log(bad?'FAILED '+bad:'ALL OK');
