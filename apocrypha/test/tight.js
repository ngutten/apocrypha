const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:1440,height:1000}});
  const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message+'\n'+(e.stack||'').split('\n').slice(0,3).join('\n')));
  await p.goto('file://'+require('path').resolve(__dirname,'../dist/index.html'));await p.waitForTimeout(600);await p.click('[data-a=close]');
  const out=await p.evaluate(async()=>{
    const P=apocrypha,G=P.state();const wait=ms=>new Promise(r=>setTimeout(r,ms));P.skip(600);await wait(200);
    const at=(t,o)=>{G.cur=t;G.follow=false;place(o);};const A=G.br[0];
    at(10,{k:'b',x:'farm',s:0});at(40,{k:'b',x:'hut',s:0});at(300,{k:'b',x:'lumber',s:0});at(400,{k:'b',x:'hut',s:0});at(500,{k:'u',x:'axes'});at(520,{k:'b',x:'granary',s:0});
    const rec=()=>{const m={};for(const r of P.world().sims.get(A.id).recs)m[r.id]=Math.round(r.t);return A.orders.map(o=>o.id+':'+o.k+(o.x||'')+'@'+Math.round(o.t)+'→'+m[o.id]).join('  ');};
    const res=['before  '+rec()];
    const t0=performance.now();for(const o of A.orders.slice().reverse())tighten(o.id);res.push('after   '+rec()+'   ms '+Math.round(performance.now()-t0));
    return res;});
  console.log(out.join('\n'));console.log(errs.join('\n')||'no errors');await b.close();
})();
