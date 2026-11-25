const {E,M0}=require('./test.js');
function rnd(n){return Math.floor(Math.random()*n)}
let seq=1,bad=0,maxSeg=0;
for(let trial=0;trial<60;trial++){
  const orders=[];const sim=new E.Sim(orders,M0);
  const B=Object.keys(E.BLD),U=Object.keys(E.UPG),J=['scholar','priest','armorer','smith','miner','woodcutter','farmer'];
  for(let k=0;k<120;k++){
    const t=rnd(10)<2?rnd(40)*10:rnd(1500)+Math.random()*(rnd(2));
    let o; const r=rnd(10);
    if(r<6)o={k:'b',x:B[rnd(B.length)]};else if(r<8)o={k:'u',x:U[rnd(U.length)]};else if(r<9)o={k:'l',x:J[rnd(7)],n:rnd(3)?rnd(6):null};else o={k:'p',list:J.slice().sort(()=>Math.random()-.5)};
    o.t=t;o.id=seq++;
    if(rnd(6)===0&&orders.length){const i=rnd(orders.length);const d=orders[i];orders.splice(i,1);sim.invalidate(d.t);}
    else{const i=orders.findIndex(x=>x.t>o.t);if(i<0)orders.push(o);else orders.splice(i,0,o);sim.invalidate(o.t);}
    sim.at(rnd(1600)); // touch random time (lazy extension)
  }
  const fresh=new E.Sim(orders,M0);
  for(const T of [100,333.3,700,799,801,1500,2500]){
    const a=sim.at(T),b=fresh.at(T);
    for(const r of E.RES) if(Math.abs(a.v[r]-b.v[r])>1e-6*(1+Math.abs(b.v[r]))){bad++;if(bad<5)console.log('MISMATCH',trial,T,r,a.v[r],b.v[r]);}
    if(a.st.pop!==b.st.pop||a.st.dead!==b.st.dead)bad++;
  }
  const key=s=>s.recs.map(r=>r.id+':'+r.t.toFixed(6)+r.s).join('|')+'#'+s.feats.map(f=>f.k+f.t.toFixed(5)).sort().join('|')+'#'+s.log.length;
  if(key(sim)!==key(fresh)){bad++;if(bad<5)console.log('REC MISMATCH',trial);}
  maxSeg=Math.max(maxSeg,fresh.segs.length);
  // sanity: no negative, zero-length runaway
  let tiny=0;for(const s of fresh.segs)if(s.t1-s.t0<1e-7)tiny++;
  if(tiny>20)console.log('tiny segs',trial,tiny,fresh.segs.length);
}
console.log('bad',bad,'maxSeg',maxSeg);
