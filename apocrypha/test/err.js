const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
 for(const vp of [{width:1440,height:1000},{width:1600,height:900},{width:1100,height:800}]){const p=await b.newPage({viewport:vp});const errs=[];p.on('pageerror',e=>errs.push(e.message+' | '+(e.stack||'').split('\n').slice(1,3).join(' ')));
 await p.goto('file://'+require('path').resolve(__dirname,'../dist/index.html'));await p.waitForTimeout(900);
 console.log(JSON.stringify(vp),'modal hidden:',await p.evaluate(()=>document.getElementById('modal').hidden),'map h:',await p.evaluate(()=>document.getElementById('map').clientHeight+' w '+document.getElementById('map').clientWidth),errs.slice(0,2).join('\n')||'no errors');await p.close();}
 await b.close();})();
