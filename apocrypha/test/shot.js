const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1440,height:1100}});
  const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message+'\n'+(e.stack||'').split('\n').slice(0,4).join('\n')));
  await p.goto('file://'+require('path').resolve(__dirname,'../dist/index.html'));await p.waitForTimeout(900);
  await p.click('[data-a=close]');
  const out=await p.evaluate(async()=>{
    const P=apocrypha,G=P.state(),MAP=P.map();const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const V=()=>P.world().sims.get(G.act).at(G.H);const cl=sel=>{const e=document.querySelector(sel);if(e){e.click();return true}return false};
    const next=(st,tgt)=>{let best=null,bv=1e9;for(const s of MAP.sites){if(s.shore||st.own[s.id]||st.lost[s.id]||st.proj.some(p=>p.s===s.id))continue;if(!s.adj.some(e=>st.own[e.to]))continue;const v=MAP.D[s.id][tgt];if(v<bv){bv=v;best=s.id}}return best};
    const tgt=MAP.rites[0];
    while(G.H<430){P.skip(4);await wait(1);const v=V(),st=v.st;if(st.dead)break;if(st.pend.filter(x=>P.world().sims.get(G.act).order(x).k!=='u').length)continue;
      if(!st.own[tgt]&&G.H>80){const n=next(st,tgt);if(n!=null){G.sel=n;await wait(230);if(cl('[data-a=s]:not(.short)'))continue;}}
      let site=0;for(const s in st.own){if((v.d.used[s]||0)<(s==0?12:8)){site=+s;break}}
      G.sel=site;await wait(230);
      const tb=x=>cl(`#pSite [data-a=b][data-x=${x}]:not(.short)`);
      if(!st.proj.some(p=>UPG[p.x])&&cl('#pStudy [data-a=u]:not(.short)'))continue;
      if(st.pop>=v.d.housing-1&&tb('hut'))continue;
      if(v.dv.food<0.05*st.pop&&v.mode.food!=='full'&&tb('farm'))continue;
      if(st.b.script<4&&tb('script'))continue; if(st.b.shrine<4&&tb('shrine'))continue; if(st.b.lumber<3&&tb('lumber'))continue;
    }
    return ['H='+G.H.toFixed(0)+' known='+Object.keys(G.known).length+' trail='+G.trail+' echo='+Object.keys(G.echo).join(',')];
  });
  console.log(out.join('\n'));
  await p.waitForTimeout(500);await p.screenshot({path:require('path').resolve(__dirname,'../shots/s1.png')});console.log(errs.slice(0,3).join('\n')||'no errors so far');
  await p.click('#tb_study');await p.waitForTimeout(250);await p.click('[data-a=tree]');await p.waitForTimeout(200);await p.screenshot({path:require('path').resolve(__dirname,'../shots/s2.png')});
  console.log(errs.join('\n')||'no errors');await b.close();
})();
