import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve('scratch/visual-lab/output');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--ozone-platform=x11']});
const report={browser:browser.version(),captures:[]};
async function capture(name,url,{mobile=false,dark=false,reduced=false,noWebgl=false,reference=false}={}){
    console.log(`START ${name}`);
    const folder=path.join(output,name);await mkdir(folder,{recursive:true});
    const viewport=mobile?{width:390,height:844}:{width:1280,height:800};
    const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,colorScheme:dark?'dark':'light',
        reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:folder,size:viewport}});
    const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(45000);
    if(noWebgl)await page.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:native.call(this,type,...args);};});
    const result={name,url,errors:[],console:[],requests:[]};
    page.on('pageerror',error=>result.errors.push(String(error)));
    page.on('console',msg=>{if(['error','warning'].includes(msg.type()))result.console.push({type:msg.type(),text:msg.text()});});
    page.on('requestfailed',r=>result.requests.push({url:r.url(),error:r.failure()?.errorText}));
    async function shot(label){console.log(`SHOT ${name}/${label}`);await page.screenshot({path:path.join(folder,label+'.png'),timeout:15000});}
    try{
        await page.goto(url,{waitUntil:'domcontentloaded'});
        await page.waitForTimeout(reference?10000:1500);await shot('00-idle');
        result.page=await page.evaluate(()=>({title:document.title,text:document.body.innerText.slice(0,4000),canvases:[...document.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height}))}));
        if(reference){
            await page.mouse.move(320,450);for(let i=0;i<20;i++){await page.mouse.move(320+i*25,400+Math.sin(i/20*6.28)*90);await page.waitForTimeout(25);}
            await shot('01-hover');await page.mouse.click(760,400);await page.waitForTimeout(180);await shot('02-click');
        }else{
            const stage=page.locator('#stage'),box=await stage.boundingBox();
            result.initial=await page.evaluate(()=>window.__zimaDebug?.());
            if(!mobile){await page.getByRole('button',{name:/触碰水面/}).click();}else await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.45);
            await page.waitForTimeout(120);await shot('01-click');
            await page.waitForTimeout(1500);
            if(!mobile&&!noWebgl&&!reduced){
                for(const [label,start,direction] of [['02-hover-right',.25,1],['03-hover-left',.75,-1]]){
                    await page.mouse.move(box.x+box.width*start,box.y+box.height*.45);
                    for(let i=1;i<=18;i++){
                        await page.mouse.move(box.x+box.width*(start+direction*i/18*.40),box.y+box.height*(.45+Math.sin(i/18*Math.PI)*.13));await page.waitForTimeout(20);
                    }
                    await shot(label);await page.waitForTimeout(1500);
                }
                const node=page.locator('.node').first();const before=await node.boundingBox();
                await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();
                await page.mouse.move(before.x+before.width/2+65,before.y+before.height/2-28,{steps:12});await page.mouse.up();await shot('04-drag');
                const after=await node.boundingBox();result.drag={before,after,moved:Math.hypot(after.x-before.x,after.y-before.y)>10};
                await node.focus();await page.keyboard.press('ArrowRight');const keyed=await node.boundingBox();result.keyboardMoved=Math.abs(keyed.x-after.x)>2;
                await page.keyboard.press('Tab');
            }
            await page.mouse.move(10,10);await page.waitForTimeout(1900);await shot('05-settled');
            result.settled=await page.evaluate(()=>window.__zimaDebug?.());
            await stage.screenshot({path:path.join(folder,'stage-idle.png'),timeout:15000});
            if(!noWebgl&&!reduced&&!mobile){
                await page.getByRole('button',{name:/切换.*主题/}).click();await page.waitForTimeout(500);await shot('06-theme-switch');
                result.theme=await page.locator('html').getAttribute('data-theme');
            }
            await page.locator('#reading').scrollIntoViewIfNeeded();await page.waitForTimeout(300);await shot('07-reading');
            result.selection=await page.evaluate(()=>{const p=document.querySelector('.content p');const range=document.createRange();range.selectNodeContents(p);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return selection.toString();});
            await shot('08-selection');
            result.reading=await page.evaluate(()=>window.__zimaDebug?.());
            result.status=await page.locator('#engine-status').textContent();
            result.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
        }
    }catch(error){result.failure=String(error);console.log(`FAILED ${name}: ${error}`);await page.screenshot({path:path.join(folder,'failure.png'),timeout:5000}).catch(()=>{});}
    finally{
        await writeFile(path.join(folder,'page.json'),JSON.stringify(result,null,2));report.captures.push(result);
        await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
        await context.close();console.log(`END ${name}`);
    }
}
if(process.env.REFERENCE_ONLY==='true'){
    for(const [name,url] of [['lusion','https://lusion.co/'],['active-theory','https://activetheory.net/'],['ogl-flowmap','https://oframe.github.io/ogl/examples/mouse-flowmap.html'],['evan-water','https://madebyevan.com/webgl-water/']])await capture('reference-'+name,url,{reference:true});
}else{
    await capture('prototype-light','http://127.0.0.1:4173');
    await capture('prototype-dark','http://127.0.0.1:4173',{dark:true});
    await capture('prototype-mobile','http://127.0.0.1:4173',{mobile:true});
    await capture('prototype-reduced','http://127.0.0.1:4173',{reduced:true});
    await capture('prototype-no-webgl','http://127.0.0.1:4173',{noWebgl:true});
}
await browser.close();
if(report.captures.some(c=>!c.name.startsWith('reference-')&&(c.failure||c.errors.length||c.overflow||(!c.name.endsWith('no-webgl')&&c.console.some(m=>m.type==='error')))))process.exitCode=1;
