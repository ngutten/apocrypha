const {E,M0}=require('./test.js');
const rnd=n=>Math.floor(Math.random()*n);
let seq=1,bad=0,emits=0,shadows=0;
for(let trial=0;trial<40;trial++){
  const map=E.makeMap(trial+1);E.setMap(map);
  const W=new E.World(M0()),L=[1,2,3].map(id=>{const o=[];W.add(id,o);return{id,o}});
  const B=Object.keys(E.BLD),U=Object.keys(E.UPG),J=['scholar','priest','armorer','smith','miner','woodcutter','farmer'];
  const rel=map.sites.filter(s=>s.feat&&s.feat.startsWith('relic'));
  const near=map.sites.slice().sort((a,b)=>a.dist-b.dist);
  for(let k=0;k<260;k++){
    const l=L[rnd(3)],t=rnd(10)<2?rnd(48)*50:rnd(2300)+(rnd(2)?Math.random():0);let o;const r=rnd(20);
    if(r<9)o={k:'b',x:B[rnd(B.length)],s:near[rnd(6)].id};else if(r<12)o={k:'u',x:U[rnd(U.length)]};else if(r<16)o={k:'s',s:rnd(3)?near[1+rnd(8)].id:rnd(map.sites.length)};else if(r<17)o={k:'r',s:rel[rnd(3)].id};else if(r<18)o={k:'l',x:J[rnd(7)],n:rnd(3)?rnd(6):null};else if(r<19)o={k:'d',x:B[rnd(5)],s:near[rnd(3)].id};else o={k:'p',list:J.slice().sort(()=>Math.random()-.5)};
    o.t=t;o.id=seq++;
    if(rnd(7)===0&&l.o.length){const i=rnd(l.o.length),d=l.o[i];l.o.splice(i,1);W.edit(l.id,d.t);}
    else{const i=l.o.findIndex(x=>x.t>o.t);if(i<0)l.o.push(o);else l.o.splice(i,0,o);W.edit(l.id,o.t);}
    W.ensure(rnd(2500));
  }
  // cheat a relic raise through to exercise light/shadow: give lanes cheap relic costs via cost mod? just check consistency
  const F=new E.World(M0());for(const l of L)F.add(l.id,l.o);
  W.ensure(2450);F.ensure(2450);
  for(const l of L){const a=W.sims.get(l.id),b=F.sims.get(l.id);
    for(const T of [100,333.3,700,1249,1500,2399,2401]){const x=a.at(T),y=b.at(T);
      for(const r of E.RES)if(Math.abs(x.v[r]-y.v[r])>1e-6*(1+Math.abs(y.v[r]))){bad++;if(bad<6)console.log('MISMATCH',trial,l.id,T,r,x.v[r],y.v[r]);}
      if(x.st.pop!==y.st.pop||x.st.dead!==y.st.dead||Object.keys(x.st.own).join()!==Object.keys(y.st.own).join())bad++;}
    const key=s=>s.recs.map(r=>r.id+':'+r.t.toFixed(6)+r.s).join('|')+'#'+s.feats.map(f=>f.k+f.t.toFixed(5)).sort().join('|')+'#'+s.log.length+'#'+s.emit.map(e=>e.k+e.x+e.t.toFixed(5)).join('|');
    if(key(a)!==key(b)){bad++;if(bad<6)console.log('REC MISMATCH',trial,l.id);}
    emits+=b.emit.length;shadows+=b.log.filter(x=>/shadow/.test(x.x)).length;
    let tiny=0;for(const s of b.segs)if(s.t1-s.t0<1e-7)tiny++;if(tiny>30)console.log('tiny',trial,tiny,b.segs.length);
  }
}
console.log('bad',bad,'emits',emits,'shadowlogs',shadows);
// directed test: cheap relics so light/shadow/dark paths run under edits
{
  const map=E.makeMap(3);E.setMap(map);const M=M0();M.cost=0.02;
  const mk=()=>{const W=new E.World(M);return W};
  const rel=k=>map.sites.find(s=>s.feat==='relic_'+k).id;
  const path=(tgt)=>{const out=[];let cur=tgt;while(cur!==0){out.unshift(cur);let best=null,bv=Infinity;for(const e of map.sites[cur].adj){const v=map.D[0][e.to]+e.len;if(Math.abs(v-map.D[0][cur])<1e-9&&map.D[0][e.to]<bv){bv=map.D[0][e.to];best=e.to}}cur=best;}return out;};
  const W=mk();const os={};let id=1;
  ['sword','bell','lens'].forEach((k,i)=>{const o=[];os[i+1]=o;path(rel(k)).forEach((s,j)=>o.push({id:id++,t:10+j,k:'s',s}));for(let q=0;q<6;q++)o.push({id:id++,t:20,k:'b',x:['farm','hut','script','shrine','hut','farm'][q],s:0});o.push({id:id++,t:30+i*100,k:'r',s:rel(k)});W.add(i+1,o);});
  W.ensure(2450);
  for(const [i,s] of W.sims)console.log('lane',i,'won',s.at(2449).st.won,'rel',JSON.stringify(s.at(2399).st.rel),'paid',JSON.stringify(s.at(2399).st.paid),'emit',s.emit.map(e=>e.k+':'+(e.x||'')+'@'+e.t.toFixed(0)).filter(x=>!x.startsWith('tech')).join(' '));
  // delete lane 2's raise: others should lose bell light
  const o2=os[2];const r=o2.find(o=>o.k==='r');o2.splice(o2.indexOf(r),1);W.edit(2,r.t);W.ensure(2450);
  for(const [i,s] of W.sims)console.log('after delete: lane',i,'won',s.at(2449).st.won,'dead',s.at(2449).st.dead,'src',JSON.stringify(s.at(2399).st.src));
}
