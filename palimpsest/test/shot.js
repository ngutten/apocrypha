const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1440,height:1000}});
  const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message+'\n'+(e.stack||'').split('\n').slice(0,4).join('\n')));
  await p.goto('file://'+require('path').resolve(__dirname,'../dist/index.html'));await p.waitForTimeout(500);
  await p.click('[data-a=close]');
  const out=await p.evaluate(async()=>{
    const P=palimpsest,G=P.state(),MAP=P.map();const log=[];
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const V=()=>P.world().sims.get(G.act).at(G.H);
    const clickB=(sel)=>{const e=document.querySelector(sel);if(e){e.click();return true}return false};
    const relic=k=>MAP.sites.find(s=>s.feat==='relic_'+k).id;
    const next=(st,tgt)=>{let best=null,bv=1e9;for(const s of MAP.sites){if(st.own[s.id]||st.lost[s.id]||st.proj.some(p=>p.s===s.id))continue;if(!s.adj.some(e=>st.own[e.to]))continue;const v=MAP.D[s.id][tgt];if(v<bv){bv=v;best=s.id}}return best};
    async function play(until,tgt){
      while(G.H<until){P.skip(4);await wait(1);const v=V(),st=v.st;if(st.dead)break;if(st.pend.filter(x=>typeof x==='number').length)continue;
        if(!st.own[tgt]&&G.H>80){const n=next(st,tgt);if(n!=null){G.sel=n;await wait(210);if(clickB('[data-a=s]:not(.short)'))continue;}}
        // choose a site with room
        let site=0;for(const s in st.own){const used=v.d.used[s]||0;if(used<(s==0?12:8)){site=+s;break}}
        G.sel=site;await wait(1);
        const tb=x=>clickB(`#pSite [data-a=b][data-x=${x}]:not(.short)`);
        if(clickB('#pJobs [data-a=u]:not(.short)'))continue;
        if(st.own[tgt]){G.sel=tgt;await wait(210);if(clickB('[data-a=r]:not(.short)'))continue;G.sel=site;}
        await wait(210);
        if(st.pop>=v.d.housing-1&&tb('hut'))continue;
        if(v.dv.food<0.05*st.pop&&v.mode.food!=='full'&&tb('farm'))continue;
        if(st.b.script<6&&tb('script'))continue; if(st.b.shrine<6&&tb('shrine'))continue; if(st.b.lumber<3&&tb('lumber'))continue;
        if(v.mode.food==='full'&&st.b.granary<4&&tb('granary'))continue;
      }
    }
    await play(420,relic('lens'));G.sel=0;await wait(230);document.querySelector('[data-a=raze]')?.click();P.skip(420);await wait(300);
    log.push('H='+G.H.toFixed(0)+' known='+Object.keys(G.known).length+' echo='+Object.keys(G.echo).join(','));
    return log;
  });
  console.log(out.join('\n'));
  await p.waitForTimeout(300);await p.screenshot({path:require('path').resolve(__dirname,'../shots/s1.png')});
  // scrub back, fork, do something different, look at arcs
  const box=await p.locator('#cv').boundingBox();
  await p.mouse.move(box.x+box.width*0.25,box.y+60);await p.mouse.down();await p.mouse.up();
  await p.click('[data-a=fork]');await p.waitForTimeout(300);
  await p.evaluate(()=>{palimpsest.skip(200)});await p.waitForTimeout(400);
  await p.keyboard.press('End');await p.waitForTimeout(300);
  await p.screenshot({path:require('path').resolve(__dirname,'../shots/s2.png')});
  await p.click('[data-a=archive]');await p.waitForTimeout(200);await p.screenshot({path:require('path').resolve(__dirname,'../shots/s3.png')});
  console.log(errs.join('\n')||'no errors');
  await b.close();
})();
