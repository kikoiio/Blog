import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('ci-evidence',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu','--ozone-platform=x11']});
const page=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
try{
 await page.goto('http://127.0.0.1:8153/scratch/iceland/atlas-ui/');
 await page.waitForSelector('#app[data-ready]',{timeout:30000});await page.screenshot({path:'ci-evidence/desktop-scene.png'});
 await page.keyboard.press('m');await page.waitForTimeout(350);await page.screenshot({path:'ci-evidence/desktop-map.png'});
 await page.keyboard.press('Escape');await page.waitForTimeout(180);await page.keyboard.press('r');await page.waitForTimeout(350);await page.screenshot({path:'ci-evidence/desktop-reading.png'});
 await page.keyboard.press('Escape');await page.keyboard.press('ArrowRight');await page.waitForTimeout(400);await page.screenshot({path:'ci-evidence/place-step.png'});
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));mp.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await mp.goto('http://127.0.0.1:8153/scratch/iceland/atlas-ui/');await mp.waitForSelector('#app[data-ready]');await mp.screenshot({path:'ci-evidence/mobile-scene.png'});await mp.tap('#open-map');await mp.waitForTimeout(400);await mp.screenshot({path:'ci-evidence/mobile-map.png'});
 const checks=await page.evaluate(()=>({title:document.querySelector('#scene-title').textContent,markers:document.querySelectorAll('.marker').length,articles:document.querySelectorAll('.article').length,mapHidden:document.querySelector('#atlas').hidden,readingHidden:document.querySelector('#reading').hidden}));
 await writeFile('ci-evidence/report.json',JSON.stringify({errors,checks},null,2));
 if(errors.length||checks.markers!==25||checks.articles!==5||!checks.mapHidden||!checks.readingHidden)throw Error('Atlas UI checks failed');
}finally{await browser.close()}
