const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1440,height:1100}});
  const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message+'\n'+(e.stack||'').split('\n').slice(0,4).join('\n')));
  await p.goto('file://'+require('path').resolve(__dirname,'../dist/index.html'));await p.waitForTimeout(400);
  await p.click('[data-a=close]');
  const out=await p.evaluate(async()=>{
    const P=palimpsest,G=P.state(),MAP=P.map();const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(const k in RELIC){RELIC[k].c={wood:5};RELIC[k].sh={wood:5};}
    const path=tgt=>{const out=[];let cur=tgt;while(cur!==0){out.unshift(cur);let best=null,bv=1e9;for(const e of MAP.sites[cur].adj){if(Math.abs(MAP.D[0][e.to]+e.len-MAP.D[0][cur])<1e-9&&MAP.D[0][e.to]<bv){bv=MAP.D[0][e.to];best=e.to}}cur=best;}return out;};
    // lane 1 basics by clicking through the real UI path, then fork twice
    G.sel=0;P.skip(10);await wait(250);
    for(const x of ['farm','hut','farm','lumber','hut','script','shrine','lumber'])document.querySelector(`#pSite [data-a=b][data-x=${x}]`).click();
    P.skip(300);await wait(250);
    const ks=['sword','bell','lens'];
    const doLane=async(k,extra)=>{const tgt=MAP.sites.find(s=>s.feat==='relic_'+k).id;for(const s of path(tgt)){G.sel=s;await wait(230);const bt=document.querySelector('[data-a=s]');if(bt)bt.click();P.skip(150);await wait(230);if(s!==tgt)document.querySelector('#pSite [data-a=b][data-x=hut]')?.click();}
      G.sel=tgt;await wait(230);for(const x of extra)document.querySelector(`#pSite [data-a=b][data-x=${x}]`)?.click();const r=document.querySelector('[data-a=r]');if(r)r.click();};
    await doLane('sword',['farm','farm','hut','script','shrine','farm']);
    P.skip(100);await wait(250);
    // go back and fork two more lanes for the other relics
    for(const k of ['bell','lens']){G.follow=false;G.cur=330;G.act=G.br[0].id;await wait(250);document.querySelector('[data-a=fork]').click();await wait(250);G.follow=true;G.cur=G.H;await wait(250);await doLane(k,['farm']);P.skip(120);await wait(250);}
    const mid='H='+G.H.toFixed(0)+' lanes='+G.br.length+'/'+laneCap()+' red='+JSON.stringify(G.red)+' echo='+Object.keys(G.echo).join(',');
    P.skip(2460-G.H);await wait(400);
    return [mid,'H='+G.H.toFixed(0)+' won='+G.won+' red='+JSON.stringify(G.red)+' echo='+Object.keys(G.echo).join(','),...G.br.map(b=>{const st=P.world().sims.get(b.id).at(G.H).st;return b.name+' won='+st.won+' rel='+JSON.stringify(st.rel)+' paid='+JSON.stringify(st.paid)+' src='+JSON.stringify(st.src)+' dead='+st.dead})];
  });
  console.log(out.join('\n'));
  await p.screenshot({path:require('path').resolve(__dirname,'../shots/l1.png')});
  await p.click('[data-a=close]').catch(()=>{});
  await p.evaluate(()=>{const G=palimpsest.state();G.follow=false;G.cur=1200;});await p.waitForTimeout(400);
  await p.screenshot({path:require('path').resolve(__dirname,'../shots/l2.png')});
  await p.click('[data-a=archive]');await p.waitForTimeout(200);
  console.log(errs.join('\n')||'no errors');
  await b.close();
})();
