// Cloud-only observation: record this disposable study and its browser states.
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('ci-evidence',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu','--ozone-platform=x11']});
const context=await browser.newContext({viewport:{width:1004,height:565},deviceScaleFactor:1,recordVideo:{dir:'ci-evidence',size:{width:1004,height:565}}});
const page=await context.newPage(),errors=[],states=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const read=()=>page.locator('#study').evaluate(el=>JSON.parse(el.dataset.state||'{}'));
try{
 await page.goto('http://127.0.0.1:8153/scratch/iceland/surf-study/');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#study').dataset.state||'{}').ready);
 for(let i=0;i<=24;i++){
  states.push({wall:Date.now(),...await read()});
  if(i%2===0)await page.screenshot({path:`ci-evidence/wave-${String(i).padStart(2,'0')}.png`});
  await page.waitForTimeout(1000);
 }
 await page.keyboard.press('p');await page.waitForTimeout(300);const paused=await read();
 await page.waitForTimeout(1200);const held=await read();
 await page.keyboard.press('a');await page.waitForTimeout(250);const original=await read();
 await page.screenshot({path:'ci-evidence/original.png'});
 await page.keyboard.press('a');await page.waitForTimeout(250);const restored=await read();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);
 await page.screenshot({path:'ci-evidence/mobile.png'});
 const mobile=await page.locator('.surf-study-layer').evaluate(el=>({width:el.width,height:el.height}));
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);
 const reduced=await read();
 const report={errors,paused,held,original,restored,mobile,reduced,
  observations:{pauseHeld:paused.water.time===held.water.time,originalShown:original.original,
   restoredSameTime:restored.water.time===paused.water.time,mobileSized:mobile.width===390&&mobile.height===844,
   elapsedWall:(states.at(-1).wall-states[0].wall)/1000,elapsedScene:states.at(-1).water.time-states[0].water.time},states};
 await writeFile('ci-evidence/report.json',JSON.stringify(report,null,2));
 if(errors.length||!Object.values(report.observations).slice(0,4).every(Boolean))throw Error('Runtime observation needs attention; see report.');
}finally{await context.close();await browser.close();}
