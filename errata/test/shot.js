const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text());});
  await p.goto('file://'+require('path').resolve(__dirname,'../dist/index.html'));
  await p.waitForTimeout(800);
  await p.screenshot({path:require('path').resolve(__dirname,'../shots/s0.png')});
  await p.click('[data-a=close]');
  // play: bot-like script through the UI API
  const res=await p.evaluate(async()=>{
    const out=[];const click=(sel)=>{const e=document.querySelector(sel);if(e){e.click();return true}return false};
    for(let k=0;k<160;k++){ errata.skip(5);
      await new Promise(r=>setTimeout(r,5));
      const G=errata.state(), V=errata.sims.get(G.act).at(G.H), st=V.st;
      if(st.dead)break;
      const tryB=x=>{const el=document.querySelector(`[data-a=b][data-x=${x}]:not(.short)`);if(el){el.click();return true}};
      if(st.pop>=V.d.housing-1&&tryB('hut'))continue;
      if(V.dv.food<0.3&&k<40&&tryB('farm'))continue;
      if(k>12&&st.b.script<2&&tryB('script'))continue;
      if(k>14&&st.b.shrine<2&&tryB('shrine'))continue;
      if(k>20&&st.b.lumber<2&&tryB('lumber'))continue;
    }
    const G=errata.state();out.push('H='+G.H.toFixed(0)+' echoes='+Object.keys(G.echo).join(','));
    return out;
  });
  console.log(res.join('\n'));
  await p.waitForTimeout(400);
  await p.screenshot({path:require('path').resolve(__dirname,'../shots/s1.png')});
  // scrub back, fork, archive
  const box=await p.locator('#cv').boundingBox();
  await p.mouse.move(box.x+box.width*0.3,box.y+60);await p.mouse.down();await p.mouse.move(box.x+box.width*0.35,box.y+60);await p.mouse.up();
  await p.click('[data-a=fork]');await p.waitForTimeout(300);
  await p.click('[data-a=b][data-x=granary]');await p.click('[data-a=lim][data-x=woodcutter][data-d="-1"]');
  await p.waitForTimeout(400);
  await p.screenshot({path:require('path').resolve(__dirname,'../shots/s2.png')});
  await p.click('[data-a=archive]');await p.waitForTimeout(200);await p.screenshot({path:require('path').resolve(__dirname,'../shots/s3.png')});
  console.log(errs.join('\n')||'no errors');
  await b.close();
})();
