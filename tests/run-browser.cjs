'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path');
for(const name of ['browser-v3.cjs','browser-v31.cjs']){
 const result=spawnSync(process.execPath,[path.join(__dirname,name)],{stdio:'inherit',env:process.env});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0)process.exit(result.status||1);
}
