import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('ci-evidence',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu','--ozone-platform=x11']});
const errors=[];
const page=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
try{
 await page.goto('http://127.0.0.1:8153/scratch/iceland/ringroad-ui/');
 await page.waitForSelector('#app[data-ready]',{timeout:30000});
 await page.screenshot({path:'ci-evidence/desktop-start.png'});
 await page.mouse.move(720,450);await page.mouse.down();
 for(let x=720;x>=180;x-=36){await page.mouse.move(x,450,{steps:2});await page.waitForTimeout(16)}
 await page.mouse.up();await page.waitForTimeout(500);
 await page.screenshot({path:'ci-evidence/desktop-drive.png'});
 await page.mouse.down();for(let x=720;x>=90;x-=42){await page.mouse.move(x,450,{steps:2});await page.waitForTimeout(14)}await page.mouse.up();
 await page.waitForTimeout(900);await page.screenshot({path:'ci-evidence/desktop-coast.png'});
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));mp.on('console',m=>{if(m.type()==='error')errors.push(m.text())});mp.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await mp.goto('http://127.0.0.1:8153/scratch/iceland/ringroad-ui/');await mp.waitForSelector('#app[data-ready]');await mp.screenshot({path:'ci-evidence/mobile-start.png'});
 await mp.touchscreen.tap(195,420);await mp.waitForTimeout(300);await mp.screenshot({path:'ci-evidence/mobile-tap.png'});
 const checks=await page.evaluate(()=>({
   title:document.querySelector('#place-name').textContent,
   nodes:document.querySelectorAll('.node').length,
   vehicle:!!document.querySelector('.vehicle'),
   bearing:document.querySelector('#bearing').textContent,
   odo:Number(document.querySelector('#odo-value').textContent),
   ready:document.querySelector('#app').dataset.ready!==undefined
 }));
 await writeFile('ci-evidence/report.json',JSON.stringify({errors,checks},null,2));
 if(errors.length||checks.nodes!==25||!checks.vehicle||!checks.ready)throw Error(`Ringroad UI checks failed: ${JSON.stringify(checks)}`);
}finally{await browser.close()}
