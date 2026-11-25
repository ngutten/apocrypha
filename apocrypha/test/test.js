const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../src/engine.js','utf8');
const E=new Function(src+';setTimeline(2400,0);return {setTimeline,BLEED_MIN,bleedDelay,Sim,World,BLD,UPG,RES,RELIC,TER,costOf,reqOk,isVoid,derive,makeMap,siteMult,room,has,setMap:m=>{MAP=m},FINAL_T:2400,FLOORS};')();
const M0=()=>({E:{pit:1,stair:1,hint_terrace:1,hint_lib:1},forage:1,farm:1,wood:1,mine:1,smith:1,foodCap:1,growth:1,startPop:0,housing:0,research:1,cost:1});
module.exports={E,M0};
if(require.main===module){
  for(const seed of [3,9,21,77]){
    const t0=Date.now();const map=E.makeMap(seed);E.setMap(map);
    const ters={};map.sites.forEach(s=>ters[s.ter]=(ters[s.ter]||0)+1);
    console.log('seed',seed,'gen ms',Date.now()-t0,'sites',map.sites.length,JSON.stringify(ters),'dun',map.dun,map.sites[map.dun].ter,'@'+map.sites[map.dun].dist,'rites',map.rites.map(r=>r+'@'+map.sites[r].dist).join(','),'perils',map.floors.map((f,i)=>f&&f.peril?i:'').filter(x=>x).join(','),'home',map.sites[0].ter);
    // directed: cheap everything; lane1 delves, lane2 rites, lane3 studies
    const M=M0();M.cost=0.02;const W=new E.World(M);let id=1;
    const path=tgt=>{const out=[];let cur=tgt;while(cur!==0){out.unshift(cur);let best=null,bv=1e9;for(const e of map.sites[cur].adj){if(map.sites[e.to].shore)continue;if(Math.abs(map.D[0][e.to]+e.len-map.D[0][cur])<1e-6&&map.D[0][e.to]<bv){bv=map.D[0][e.to];best=e.to}}if(best==null)break;cur=best;}return out;};
    const basics=o=>{for(const x of ['farm','hut','script','shrine','farm','hut'])o.push({id:id++,t:5,k:'b',x,s:0});for(const u of ['axes','pottery','masonry','fort','writing','rites','medicine','quar','irrigation'])o.push({id:id++,t:6,k:'u',x:u});o.push({id:id++,t:300,k:'b',x:'palisade',s:0});o.push({id:id++,t:300,k:'b',x:'lazaret',s:0});};
    const hill=map.sites.filter(s=>(s.ter==='hills'||s.ter==='peak')&&s.feat!=='pit').sort((a,b)=>a.dist-b.dist)[0];
    // lane 1: sword
    {const o=[];basics(o);const seen=new Set();for(const s of [...path(hill.id),...path(map.dun)])if(!seen.has(s)){seen.add(s);o.push({id:id++,t:10+seen.size,k:'s',s});}
     for(const x of ['mine','forge','armory','armory','farm','farm','hut','hut'])o.push({id:id++,t:200,k:'b',x,s:hill.id});for(const x of ['hut','farm','farm'])o.push({id:id++,t:401,k:'b',x,s:map.dun});o.push({id:id++,t:200,k:'b',x:'lazaret',s:hill.id});
     for(const u of ['picks','shafts','delving','bellows'])o.push({id:id++,t:7,k:'u',x:u});
     for(let i=0;i<3;i++)o.push({id:id++,t:400,k:'b',x:'gatehouse',s:map.dun});o.push({id:id++,t:400,k:'b',x:'lazaret',s:map.dun});o.push({id:id++,t:400,k:'b',x:'palisade',s:map.dun});
     for(let i=0;i<12;i++)o.push({id:id++,t:700+i*40,k:'dv'});
     for(const q of o.filter(x=>x.k==='s').map(x=>x.s)){o.push({id:id++,t:350,k:'b',x:'palisade',s:q});o.push({id:id++,t:351,k:'b',x:'lazaret',s:q});}
     o.sort((a,b)=>a.t-b.t);W.add(1,o);}
    // lane 2: bell
    {const o=[];basics(o);const seen=new Set();for(const r of map.rites)for(const s of path(r))if(!seen.has(s)){seen.add(s);o.push({id:id++,t:10+seen.size,k:'s',s});}
     map.rites.forEach((r,i)=>{o.push({id:id++,t:500+i*100,k:'rt',s:r});o.push({id:id++,t:450,k:'b',x:'lazaret',s:r});});
     for(const q of o.filter(x=>x.k==='s').map(x=>x.s)){o.push({id:id++,t:350,k:'b',x:'palisade',s:q});o.push({id:id++,t:351,k:'b',x:'lazaret',s:q});}
     o.sort((a,b)=>a.t-b.t);W.add(2,o);}
    // lane 3: lens
    {const o=[];basics(o);for(let i=0;i<4;i++)o.push({id:id++,t:20,k:'b',x:'script',s:0});
     for(const u of ['academy','glass','optics','parallax','annals','counterfact','margin','lens'])o.push({id:id++,t:8,k:'u',x:u});
     path(hill.id).forEach((s,i)=>o.push({id:id++,t:10+i,k:'s',s}));for(const x of ['mine','forge'])o.push({id:id++,t:200,k:'b',x,s:hill.id});
     for(const q of o.filter(x=>x.k==='s').map(x=>x.s)){o.push({id:id++,t:350,k:'b',x:'palisade',s:q});o.push({id:id++,t:351,k:'b',x:'lazaret',s:q});}
     o.sort((a,b)=>a.t-b.t);W.add(3,o);}
    const t1=Date.now();W.ensure(2450);
    for(const [i,s] of W.sims){const st=s.at(2449).st;console.log(' lane',i,'won',st.won,'dead',st.dead,st.by||'','rel',JSON.stringify(st.rel),'src',JSON.stringify(st.src),'mal',JSON.stringify(st.mal),'depth',st.depth,'rite',st.rite,'pop',st.pop,'techs',Object.keys(st.up).length,'segs',s.segs.length);
      if(process.argv[2])console.log('   ',s.log.filter(l=>l.c==='bad'||l.c==='fall'||/light|Plague|Forgetting|Sunless|rite|floor of|Bell|glass is/.test(l.x)).slice(0,60).map(l=>l.t.toFixed(0)+' '+l.x.slice(0,88)).join('\n    '));}
    console.log(' sim ms',Date.now()-t1);
  }
}
