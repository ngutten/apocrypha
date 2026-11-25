const {E,M0}=require('./test.js');E.setMap(E.makeMap(5));const M=M0();M.cost=.01;
const o=[];let id=1;for(const x of ['farm','hut','script','script','script'])o.push({id:id++,t:5,k:'b',x,s:0});for(const u of ['axes','pottery','writing','irrigation','masonry','annals'])o.push({id:id++,t:6,k:'u',x:u});o.push({id:id++,t:200,k:'rm'});
const s=new E.Sim(o,M,1);s.inbox=[{t:250,ta:300,k:'light',x:'bell',ord:2,from:2}];s.extendTo(600);
console.log(s.log.filter(l=>l.t>=290).map(l=>l.t.toFixed(0)+' '+l.x.slice(0,90)).join('\n'));console.log('techs',Object.keys(s.at(599).st.up).length,'forgot',s.at(599).st.forgot,s.recs.filter(r=>r.id===id-1),s.feats.filter(f=>f.k==='kept'));
