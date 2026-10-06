'use strict';
const {readdirSync}=require('node:fs');
const {join}=require('node:path');
const {spawnSync}=require('node:child_process');
const files=readdirSync(__dirname).filter(name=>/^v3-.*\.cjs$/.test(name)&&!name.includes('browser')).sort().map(name=>join(__dirname,name));
if(!files.length){console.error('No V3 Node tests found');process.exit(1);}
console.log('V3 Node tests: '+files.map(file=>file.split(/[\\/]/).pop()).join(', '));
const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});
if(result.error){console.error(result.error.message);process.exit(1);}
process.exit(result.status===null?1:result.status);
