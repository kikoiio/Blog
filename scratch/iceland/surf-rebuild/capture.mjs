// Cloud-only still render. Static image quality is the acceptance question.
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('ci-evidence',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ozone-platform=x11']});
const context=await browser.newContext({viewport:{width:1672,height:941},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:8153/scratch/iceland/surf-rebuild/');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#study').dataset.state||'{}').ready,null,{timeout:120000});
 const state=()=>page.locator('#study').evaluate(el=>JSON.parse(el.dataset.state||'{}'));
 await page.screenshot({path:'ci-evidence/rebuilt.png'});const material=await state();
 await page.evaluate(()=>window.study.setMode(1));await page.screenshot({path:'ci-evidence/normals.png'});
 await page.evaluate(()=>window.study.setMode(0));await page.keyboard.press('a');
 await page.screenshot({path:'ci-evidence/original.png'});const comparison=await state();
 await page.keyboard.press('a');const restored=await state();
 const report={errors,material,comparison,restored};
 await writeFile('ci-evidence/report.json',JSON.stringify(report,null,2));
 if(errors.length||material.webglError||!comparison.original||restored.original)throw Error('Still rendering or comparison failed.');
}finally{await context.close();await browser.close();}
