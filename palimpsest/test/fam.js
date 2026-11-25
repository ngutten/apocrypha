const {E,M0}=require('./test.js');E.setMap(E.makeMap(5));
const W=new E.World(M0());const o=[];let id=1;const add=(t,k,x)=>o.push({id:id++,t,k,x,s:0});
add(20,'b','farm');add(30,'b','hut');add(40,'b','hut');add(50,'b','hut');for(let i=0;i<8;i++)add(60+i*10,'b','lumber');
W.add(1,o);W.ensure(2600);const s=W.sims.get(1);
console.log([200,259,280,300,320,340,400,500,650,1000,1300,2000,2390].map(t=>{const v=s.at(t);return t+':pop'+v.st.pop+(v.st.fam?'F':'')+' farm'+v.w.farmer+' food'+v.v.food.toFixed(0)}).join('\n'));
console.log('segs',s.segs.length,'deaths',s.at(2390).st.deaths, s.log.filter(l=>l.c==='bad').map(l=>l.t.toFixed(0)+' '+l.x.slice(0,50)).join(' | '));
