import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const evidence='ci-evidence';await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,recordVideo:{dir:evidence,size:{width:1280,height:720}}});
const page=await context.newPage(),errors=[];
// Cloud snapshot deliberately excludes all existing article contents and media.
await page.route('**/data/articles.json',route=>route.fulfill({contentType:'application/json',body:'[]'}));page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.text().includes('GL_INVALID'))errors.push(m.text());});
const state=()=>page.locator('#world').evaluate(el=>JSON.parse(el.dataset.state||'{}'));
const ready=async file=>page.waitForFunction(file=>{const s=JSON.parse(document.querySelector('#world')?.dataset.state||'{}');return s.ready&&!s.loading&&s.scene?.file===file;},file);
try{
 await page.goto('http://127.0.0.1:8153/scratch/iceland/#reynisfjara');await ready('04-black-beach.png');
 assert.equal((await state()).scene.mode,'ready','WebGL must compile rather than silently fall back');
 assert.equal((await state()).scene.water.style,'propagating-surf');
 await page.waitForTimeout(1500);const frames=[];
 for(let i=0;i<25;i++){
  const now=await state();frames.push({wall:Date.now(),state:now});await page.screenshot({path:`${evidence}/surf-${String(i).padStart(2,'0')}.png`});await page.waitForTimeout(450);
 }
 const start=frames[0].state.scene.water,end=frames.at(-1).state.scene.water;
 assert(end.materialTime>start.materialTime+10,'illustrated material has its own cumulative transport');
 assert.equal(await page.locator('#landscape canvas.landscape-layer').evaluate(el=>el.getContext('webgl2').getError()),0,'no framebuffer or texture feedback errors');
 assert(end.time>start.time+10,'simulation must accumulate real elapsed time');assert(end.emitted>start.emitted);assert(end.bounded);
 await writeFile(`${evidence}/timing.json`,JSON.stringify(frames,null,2));
 await page.keyboard.press('p');await page.waitForTimeout(300);const paused=await state();await page.waitForTimeout(1200);const frozen=await state();assert.equal(frozen.scene.water.time,paused.scene.water.time,'pause freezes simulation');assert.equal(frozen.scene.water.materialTime,paused.scene.water.materialTime,'pause freezes pigment transport');await page.keyboard.press('p');
 await page.keyboard.press('m');await page.waitForFunction(()=>JSON.parse(document.querySelector('#world').dataset.state).progress>.995);await page.screenshot({path:`${evidence}/map.png`});
 const map=await state();await page.waitForTimeout(1000);assert.equal((await state()).scene.water.time,map.scene.water.time,'full map suspends simulation');
 await page.locator('#map-archive').click();await page.locator('#reader[open]').waitFor();await page.screenshot({path:`${evidence}/reader.png`});await page.locator('#close').click();await page.keyboard.press('Escape');
 await page.goto('http://127.0.0.1:8153/scratch/iceland/#reykjavik');await ready('01-city-rain.png');await page.screenshot({path:`${evidence}/city.png`});assert.equal((await state()).scene.mode,'ready');
 assert.deepEqual(errors,[],'no page or shader errors');
 await writeFile(`${evidence}/report.json`,JSON.stringify({passed:true,start,end,frames:frames.length,errors},null,2));
}finally{await context.close();await browser.close();}
