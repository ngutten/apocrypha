const {E,M0}=require('./test.js');
const rnd=n=>Math.floor(Math.random()*n);
let seq=1,bad=0,emits=0,lights=0,del=0,rit=0;
for(let trial=0;trial<30;trial++){
  const map=E.makeMap(trial+1);E.setMap(map);E.setTimeline(2200+trial*10,trial%4);const M=M0();M.cost=trial%3?0.05:1;
  const W=new E.World(M),L=[1,2,3].map(id=>{const o=[];W.add(id,o);return{id,o}});
  const B=Object.keys(E.BLD),U=Object.keys(E.UPG),J=['guard','scholar','priest','armorer','smith','miner','woodcutter','farmer'];
  const near=map.sites.filter(s=>!s.shore).sort((a,b)=>a.dist-b.dist);
  for(let k=0;k<300;k++){
    const l=L[rnd(3)],t=rnd(10)<2?rnd(48)*50:rnd(2300)+(rnd(2)?Math.random():0);let o;const r=rnd(22);
    if(r<8)o={k:'b',x:B[rnd(B.length)],s:rnd(4)?near[rnd(7)].id:map.dun};else if(r<12)o={k:'u',x:U[rnd(U.length)]};else if(r<16)o={k:'s',s:rnd(4)?near[1+rnd(10)].id:[map.dun,...map.rites][rnd(5)]};else if(r<17)o={k:'rt',s:map.rites[rnd(4)]};else if(r<18)o={k:'dv'};else if(r<20)o={k:'l',x:J[rnd(8)],n:rnd(3)?rnd(6):null};else if(r<21)o={k:'d',x:B[rnd(5)],s:near[rnd(3)].id};else o={k:'p',list:J.slice().sort(()=>Math.random()-.5)};
    o.t=t;o.id=seq++;
    if(rnd(7)===0&&l.o.length){const i=rnd(l.o.length),d=l.o[i];l.o.splice(i,1);W.edit(l.id,d.t);}
    else{const i=l.o.findIndex(x=>x.t>o.t);if(i<0)l.o.push(o);else l.o.splice(i,0,o);W.edit(l.id,o.t);}
    W.ensure(rnd(2500));
  }
  const F=new E.World(M);for(const l of L)F.add(l.id,l.o);
  W.ensure(2450);F.ensure(2450);
  for(const l of L){const a=W.sims.get(l.id),b=F.sims.get(l.id);
    for(const T of [100,333.3,700,1249,1500,2399,2401]){const x=a.at(T),y=b.at(T);
      for(const r of E.RES)if(Math.abs(x.v[r]-y.v[r])>1e-6*(1+Math.abs(y.v[r]))){bad++;if(bad<6)console.log('MISMATCH',trial,l.id,T,r,x.v[r],y.v[r]);}
      if(x.st.pop!==y.st.pop||x.st.dead!==y.st.dead||x.st.depth!==y.st.depth||x.st.rite!==y.st.rite||Object.keys(x.st.own).join()!==Object.keys(y.st.own).join()||Object.keys(x.st.up).sort().join()!==Object.keys(y.st.up).sort().join())bad++;}
    const key=s=>s.recs.map(r=>r.id+':'+r.t.toFixed(6)+r.s).join('|')+'#'+s.feats.map(f=>f.k+f.t.toFixed(5)).sort().join('|')+'#'+s.log.length+'#'+s.emit.map(e=>e.k+e.x+e.t.toFixed(5)).join('|');
    if(key(a)!==key(b)){bad++;if(bad<6)console.log('REC MISMATCH',trial,l.id);}
    emits+=b.emit.length;lights+=b.emit.filter(e=>e.k==='light').length;del+=b.at(2399).st.depth;rit+=b.at(2399).st.rite;
    let tiny=0;for(const s of b.segs)if(s.t1-s.t0<1e-7)tiny++;if(tiny>40)console.log('tiny',trial,tiny,b.segs.length);
  }
}
console.log('bad',bad,'emits',emits,'lights',lights,'floors',del,'rites',rit);
