const {E,M0}=require('./test.js');
for(const seed of [3,9,21]){
  const map=E.makeMap(seed);E.setMap(map);const M=M0();M.cost=0.02;const W=new E.World(M);let id=1;
  const rel=k=>map.sites.find(s=>s.feat==='relic_'+k).id;
  const path=tgt=>{const out=[];let cur=tgt;while(cur!==0){out.unshift(cur);let best=null,bv=1e9;for(const e of map.sites[cur].adj){if(Math.abs(map.D[0][e.to]+e.len-map.D[0][cur])<1e-9&&map.D[0][e.to]<bv){bv=map.D[0][e.to];best=e.to}}cur=best;}return out;};
  ['sword','bell','lens'].forEach((k,i)=>{const o=[];const tgt=rel(k);
    for(const x of ['farm','hut','script','shrine','farm','hut'])o.push({id:id++,t:5,k:'b',x,s:0});
    o.push({id:id++,t:6,k:'u',x:'fort'});o.push({id:id++,t:6,k:'u',x:'quar'});
    path(tgt).forEach((s,j)=>o.push({id:id++,t:10+j,k:'s',s}));
    o.push({id:id++,t:20,k:'b',x:'palisade',s:0});o.push({id:id++,t:20,k:'b',x:'lazaret',s:0});o.push({id:id++,t:20,k:'b',x:'lazaret',s:tgt});o.push({id:id++,t:20,k:'b',x:'palisade',s:tgt});
    o.push({id:id++,t:30+i*100,k:'r',s:tgt});o.push({id:id++,t:900,k:'d',x:'hut',s:0});o.sort((a,b)=>a.t-b.t);W.add(i+1,o);});
  W.ensure(2450);
  console.log('seed',seed,[...W.sims.values()].map(s=>{const st=s.at(2449).st;return 'won'+st.won+' dead'+st.dead+' sites'+Object.keys(st.own).length+' huts'+st.b.hut+' '+(st.by||'')}).join(' | '));
  const s1=W.sims.get(1);console.log('  ',s1.log.filter(l=>l.t>=700&&l.t<1501&&(l.c==='bad'||l.c==='feat'||l.c==='fall')).map(l=>l.t.toFixed(0)+' '+l.x.slice(0,70)).join('\n   '));
}
