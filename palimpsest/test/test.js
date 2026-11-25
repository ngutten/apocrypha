const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../src/engine.js','utf8');
const E=new Function(src+';return {Sim,World,BLD,UPG,RES,RELIC,TER,TIDES,costOf,reqOk,isVoid,derive,makeMap,siteMult,room,setMap:m=>{MAP=m},BLEED,FINAL_T};')();
const M0=()=>({E:{pit:1,hint_terrace:1},forage:1,farm:1,wood:1,mine:1,smith:1,foodCap:1,growth:1,startPop:0,housing:0,research:1,cost:1,red:[]});
module.exports={E,M0};
if(require.main===module){
  const seed=+process.argv[2]||7; const map=E.makeMap(seed);E.setMap(map);
  console.log('sites',map.sites.length,map.sites.map(s=>`${s.id}:${s.ter[0]}${s.feat?'('+s.feat+')':''}@${s.dist}`).join(' '));
  const W=new E.World(M0());let seq=1;
  // three lanes each heading for one relic
  const rel=['sword','bell','lens'];
  const lanes=rel.map((k,i)=>{const orders=[];W.add(i+1,orders);return {id:i+1,orders,k,target:map.sites.find(s=>s.feat==='relic_'+k).id};});
  const pathTo=(st,tgt)=>{ // next unowned site on shortest path from owned set to tgt
    let best=null,bv=Infinity;for(const s of map.sites){if(st.own[s.id]||st.lost[s.id])continue;if(!s.adj.some(e=>st.own[e.to]))continue;const v=map.D[s.id][tgt];if(v<bv){bv=v;best=s.id}}return best;};
  for(let t=0;t<E.FINAL_T+10;t+=5){
    W.ensure(t);
    for(const L of lanes){const sim=W.sims.get(L.id),v=sim.at(t),st=v.st;if(st.dead)continue;if(st.pend.filter(x=>typeof x==='number').length)continue;
      const add=o=>{o.t=t;o.id=seq++;L.orders.push(o);W.edit(L.id,t);W.ensure(t);};
      const can=o=>{if(E.isVoid(st,o)||!E.reqOk(st,o,W.M))return false;const c=E.costOf(st,o,W.M);for(const r in c)if(v.v[r]<c[r])return false;return true;};
      let did=false;
      for(const s in st.own){for(const x of ['palisade','lazaret']){const o={k:'b',x,s:+s};if((x==='palisade'?(+s===0||map.sites[map.east].adj.some(e=>e.to===+s)):true)&&!st.sb[s][x]&&can(o)){add(o);did=true;break;}}if(did)break;}
      if(did)continue;
      for(const u in E.UPG){if(can({k:'u',x:u})){add({k:'u',x:u});did=true;break;}}
      if(did)continue;
      if(st.own[L.target]&&can({k:'r',s:L.target})){add({k:'r',s:L.target});continue;}
      let nx=null; const hills=map.sites.filter(s=>s.ter==='hills'&&s.feat!=='pit'&&s.feat!=='deep').sort((a,b)=>a.dist-b.dist)[0];
      let totalRoom=0;for(const s in st.own)totalRoom+=E.room(st,+s);
      if(!Object.keys(st.own).some(s=>map.sites[s].ter==='hills')&&hills)nx=pathTo(st,hills.id);
      else if(!st.own[L.target])nx=pathTo(st,L.target);
      else if(totalRoom<3){let bv=Infinity;for(const s of map.sites){if(st.own[s.id]||st.lost[s.id]||s.feat==='pit'||s.feat==='deep')continue;if(!s.adj.some(e=>st.own[e.to]))continue;if(s.dist<bv){bv=s.dist;nx=s.id}}}
      if(nx!=null&&t>60&&can({k:'s',s:nx})){add({k:'s',s:nx});continue;}
      const want=[];const d=v.d;
      if(st.pop>=d.housing-1)want.push('hut');
      if(v.dv.food<0.05*st.pop&&v.mode.food!=='full')want.unshift('farm');
      if(v.mode.food==='full'&&st.b.granary<2+t/300)want.push('granary');
      const foc=L.k==='sword'?{forge:6,armory:6,mine:4,script:3,shrine:3}:L.k==='bell'?{shrine:10,script:4,mine:2,forge:2,armory:2}:{script:10,shrine:4,mine:2,forge:2,armory:3};
      want.push('lumber','script','shrine','mine','forge','armory','stele');
      const cap={lumber:2+st.pop/12,stele:3,hut:1e9,farm:1e9,granary:10,...foc};
      for(const b of want){if(st.b[b]>=cap[b])continue;
        // best site for it
        let bs=null,bm=-1;for(const s in st.own){const o={k:'b',x:b,s:+s};if(!E.reqOk(st,o,W.M))continue;const j=({farm:'farmer',lumber:'woodcutter',mine:'miner',forge:'smith',armory:'armorer',script:'scholar',shrine:'priest'})[b];const m=j?E.siteMult(st,d,+s,j):1+E.room(st,+s)/100;if(m>bm){bm=m;bs=+s}}
        if(bs!=null&&can({k:'b',x:b,s:bs})){add({k:'b',x:b,s:bs});break;}}
    }
    if([100,340,800,1200,1600,2000,2399].includes(t))for(const L of lanes){const v=W.sims.get(L.id).at(t),st=v.st;console.log('y'+t,L.k,'pop',st.pop,'/',v.d&&v.d.housing,'sites',Object.keys(st.own).length,Object.entries(v.v).map(([k,x])=>k+':'+x.toFixed(0)).join(' '),'rel',JSON.stringify(st.rel),'paid',JSON.stringify(st.paid),'src',JSON.stringify(st.src),st.dead?'DEAD':'');}
  }
  for(const L of lanes){const s=W.sims.get(L.id);console.log(L.k,'segs',s.segs.length,'orders',L.orders.length,'won',s.at(E.FINAL_T+5).st.won,'feats',s.feats.filter(f=>!f.k.startsWith('own')).map(f=>f.k+'@'+f.t.toFixed(0)).join(' '));console.log('  log:',s.log.filter(l=>l.c==='bad'||l.c==='feat').map(l=>l.t.toFixed(0)+' '+l.x.slice(0,60)).join('\n       '));}
}
