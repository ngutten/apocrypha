const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../src/engine.js','utf8');
const E=new Function(src+';return {Sim,BLD,UPG,RES,costOf,reqOk,isVoid,TRIALS,derive};')();
const M0={E:{},forage:1,farm:1,wood:1,mine:1,smith:1,arms:1,lore:1,awe:1,foodCap:1,growth:1,startPop:0,housing:0,research:1,cost:1};
let seq=1;
function bot(creed,M=M0,T=4000,verbose=true){
  const orders=[];const sim=new E.Sim(orders,M);
  const add=(t,k,x)=>{orders.push({id:seq++,t,k,x});sim.invalidate(t);};
  const marks=[100,260,380,800,1300,2000,3000,3999];let mi=0;
  for(let t=0;t<T;t+=5){
    const v=sim.at(t),st=v.st; if(st.dead){if(verbose)console.log('DEAD at',st.dead,st.by);break;}
    const can=(k,x)=>{const o={k,x};if(E.isVoid(st,o)||!E.reqOk(st,o,M))return false;const c=E.costOf(st,o,M);for(const r in c)if(v.v[r]<c[r])return false;return true;};
    // upgrades first
    let did=false;
    for(const u in E.UPG){const U=E.UPG[u];if(U.creed&&u!==creed)continue;if(st.pend.length)break;if(can('u',u)){add(t,'u',u);did=true;break;}}
    if(!did&&!st.pend.length){
      const d=v.d;const want=[];
      if(st.pop>=d.housing-1)want.push('hut');
      if(v.dv.food<0.05*st.pop&&v.mode.food!=='full')want.unshift('farm');
      if(v.mode.food==='full'&&st.b.granary<3+t/300)want.push('granary');
      want.push('lumber','script','shrine','mine','forge','armory','stele');
      // balance: pick lowest count among affordable wants w/ weights
      const cap={lumber:3+st.pop/12,script:1+st.pop/(creed==='lens'?5:12),shrine:1+st.pop/(creed==='bell'?5:12),mine:1+st.pop/20,forge:1+st.pop/(creed==='blade'?8:20),armory:(creed==='blade'?1+st.pop/8:1+st.pop/30),stele:3,hut:1e9,farm:1e9,granary:12};
      for(const b of want){if(st.b[b]<cap[b]&&can('b',b)){add(t,'b',b);break;}}
    }
    while(mi<marks.length&&t>=marks[mi]){if(verbose){const f=x=>x.toFixed(0);console.log('y'+marks[mi],'pop',st.pop,'/',v.d.housing,Object.entries(v.v).map(([k,x])=>k+':'+f(x)).join(' '),'| b',JSON.stringify(st.b),'creed',st.creed,'tr',JSON.stringify(st.tr));}mi++;}
  }
  return sim;
}
for(const c of ['blade','bell','lens']){console.log('==',c);const t0=Date.now();const sim=bot(c);console.log('segs',sim.segs.length,'orders',sim.orders.length,'ms',Date.now()-t0,'feats',sim.feats.map(f=>f.k+'@'+f.t.toFixed(0)).join(' '));
 const t1=Date.now();sim.reset();sim.extend(4000);console.log('full resim ms',Date.now()-t1);}
module.exports={E,M0,bot};
