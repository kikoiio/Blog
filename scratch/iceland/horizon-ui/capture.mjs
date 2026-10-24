import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('ci-evidence',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu','--ozone-platform=x11']});
const errors=[];
const page=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
try{
 await page.goto('http://127.0.0.1:8153/scratch/iceland/horizon-ui/');
 await page.waitForSelector('#app[data-ready]',{timeout:30000});await page.waitForTimeout(900);
 await page.screenshot({path:'ci-evidence/desktop-start.png'});
 await page.mouse.move(720,450);await page.mouse.down();for(let x=720;x>=300;x-=42){await page.mouse.move(x,450,{steps:2});await page.waitForTimeout(20)}await page.mouse.up();await page.waitForTimeout(900);
 await page.screenshot({path:'ci-evidence/desktop-drag.png'});
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(900);await page.screenshot({path:'ci-evidence/desktop-next.png'});
 await page.click('#index-open');await page.waitForTimeout(350);await page.screenshot({path:'ci-evidence/desktop-index.png'});
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));mp.on('console',m=>{if(m.type()==='error')errors.push(m.text())});mp.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await mp.goto('http://127.0.0.1:8153/scratch/iceland/horizon-ui/');await mp.waitForSelector('#app[data-ready]');await mp.waitForTimeout(900);await mp.screenshot({path:'ci-evidence/mobile-start.png'});
 const checks=await page.evaluate(()=>({title:document.querySelector('#name').textContent,places:document.querySelectorAll('#track i').length,index:document.querySelectorAll('.place').length,ready:document.querySelector('#app').dataset.ready!==undefined}));
 await writeFile('ci-evidence/report.json',JSON.stringify({errors,checks},null,2));
 if(errors.length||checks.places!==25||checks.index!==25||!checks.ready)throw Error(`Horizon checks failed: ${JSON.stringify(checks)}`);
}finally{await browser.close()}
