const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1440,height:1250}});
  const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message+'\n'+(e.stack||'').split('\n').slice(0,4).join('\n')));
  await p.goto('file://'+require('path').resolve(__dirname,'../dist/index.html'));await p.waitForTimeout(700);
  await p.click('[data-a=close]');
  const out=await p.evaluate(async()=>{
    const P=apocrypha,G=P.state(),MAP=P.map();const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(const x in UPG){UPG[x].c={wood:1};UPG[x].t=3;} RITE_C.fill(1); BLD.gatehouse.c={wood:1}; BLD.lazaret.c={wood:1}; BLD.palisade.c={wood:1}; BLD.armory.req=null; BLD.armory.c={wood:1}; JOBS.armorer.inp=null; JOBS.armorer.out[1]=3;
    const old=modsOf; modsOf=()=>{const m=old();m.cost=.01;return m;}; rebuild();
    P.skip(2450);await wait(300);
    const at=(lane,t,o)=>{G.act=lane.id;G.cur=t;G.follow=false;place(o);};
    const path=tgt=>{const out=[];let cur=tgt;while(cur!==0){out.unshift(cur);let best=null,bv=1e9;for(const e of MAP.sites[cur].adj){if(MAP.sites[e.to].shore)continue;if(Math.abs(MAP.D[0][e.to]+e.len-MAP.D[0][cur])<1e-6&&MAP.D[0][e.to]<bv){bv=MAP.D[0][e.to];best=e.to}}if(best==null)break;cur=best;}return out;};
    const A=G.br[0];
    for(const x of ['farm','hut','farm','hut','script','shrine','armory','farm'])at(A,5,{k:'b',x,s:0});
    for(const x of ['axes','pottery','masonry','fort','writing','rites','medicine','glass'])at(A,6,{k:'u',x});
    at(A,45,{k:'b',x:'palisade',s:0});
    await wait(200);
    G.act=A.id;G.cur=60;G.follow=false;fork();const B=G.br[1];G.act=A.id;G.cur=60;fork();const C=G.br[2];
    const lanes='lanes '+G.br.length+'/'+laneCap();
    // C: find the pit, then study the Lens late enough for the others to be ready
    const pit=MAP.sites.find(s=>s.feat==='pit');path(pit.id).forEach((s,i)=>at(C,62+i,{k:'s',s}));
    for(const x of ['annals','academy','counterfact','margin','optics','parallax'])at(C,70,{k:'u',x});
    for(const x of ['script','script','script'])at(C,71,{k:'b',x,s:0});
    at(C,300,{k:'u',x:'lens'});
    await wait(200);
    for(const L of [A,B,C]){at(L,200,{k:'u',x:'quar'});at(L,215,{k:'b',x:'lazaret',s:0});}
    // B: the four hollows
    const seen=new Set();for(const r of MAP.rites)for(const s of path(r))if(!seen.has(s)){seen.add(s);at(B,62+seen.size,{k:'s',s});}
    MAP.rites.forEach((r,i)=>{at(B,150+i*70,{k:'rt',s:r});at(B,300,{k:'b',x:'lazaret',s:r});at(B,301,{k:'b',x:'palisade',s:r});});
    at(B,72,{k:'b',x:'script',s:0});at(B,72,{k:'b',x:'script',s:0});
    // A: the stair
    path(MAP.dun).forEach((s,i)=>at(A,62+i,{k:'s',s}));
    for(const x of ['picks','shafts','delving'])at(A,150,{k:'u',x});
    for(const x of ['gatehouse','gatehouse','gatehouse','hut','hut','palisade','lazaret'])at(A,190,{k:'b',x,s:MAP.dun});
    for(let i=0;i<12;i++)at(A,220+i*24,{k:'dv'});
    await wait(400);
    G.act=A.id;G.cur=400;G.sel=MAP.dun;await wait(400);
    const res=[lanes,'won='+G.won+' trail='+G.trail+' floor='+G.floor+' seenMal='+G.seenMal+' echo='+Object.keys(G.echo).join(',')];
    for(const L of G.br){const s=P.world().sims.get(L.id),st=s.at(2449).st;res.push(L.name+' won='+st.won+' dead='+st.dead+' '+(st.by||'')+' rel='+JSON.stringify(st.rel)+' src='+JSON.stringify(st.src)+' mal='+JSON.stringify(st.mal)+' depth='+st.depth+' rite='+st.rite+' techs='+Object.keys(st.up).length);
      res.push('   '+s.log.filter(l=>l.c==='bad'||l.c==='fall'||/light of|comes in behind|Bell\.|glass is finished|bottom there/.test(l.x)).slice(0,14).map(l=>l.t.toFixed(0)+' '+l.x.slice(0,80)).join('\n   '));}
    return res;
  });
  console.log(out.join('\n'));
  await p.click('[data-a=close]').catch(()=>{});
  await p.evaluate(()=>{document.querySelectorAll('.disc').forEach(d=>d.remove());});await p.waitForTimeout(300);
  await p.screenshot({path:require('path').resolve(__dirname,'../shots/l1.png')});
  await p.click('#tb_study');await p.waitForTimeout(250);await p.click('[data-a=tree]');await p.waitForTimeout(200);await p.screenshot({path:require('path').resolve(__dirname,'../shots/l2.png')});await p.click('[data-a=close]');
  await p.click('[data-a=archive]');await p.waitForTimeout(200);
  console.log(errs.join('\n')||'no errors');await b.close();
})();
