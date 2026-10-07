'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const A=require('../web/art-crops.js');

test('all ten crop profiles match the native PNG dimensions and expected cell counts',()=>{
  assert.equal(Object.keys(A.atlases).length,10);
  let count=0;
  for(const [file,atlas] of Object.entries(A.atlases)){
    const bytes=fs.readFileSync(path.join(__dirname,'../web/assets',file));
    assert.equal(bytes.readUInt32BE(16),atlas.width,file+' native width');
    assert.equal(bytes.readUInt32BE(20),atlas.height,file+' native height');
    assert.equal(atlas.x.length,atlas.cols+1);
    assert.equal(atlas.y.length,atlas.rows+1);
    assert.equal(atlas.x[0],0);assert.equal(atlas.x.at(-1),atlas.width);
    assert.equal(atlas.y[0],0);assert.equal(atlas.y.at(-1),atlas.height);
    for(let i=1;i<atlas.x.length;i++)assert(atlas.x[i]>atlas.x[i-1],file+' ordered columns');
    for(let i=1;i<atlas.y.length;i++)assert(atlas.y[i]>atlas.y[i-1],file+' ordered rows');
    count+=atlas.cols*atlas.rows;
  }
  assert.equal(count,330,'216 equipment + 48 techniques + 12 treasures + 18 pills + 36 utilities');
});

test('all 330 rectangles are distinct, bounded and exclude the adjacent source cell',()=>{
  for(const [file,atlas] of Object.entries(A.atlases)){
    const seen=new Set();
    for(let row=0;row<atlas.rows;row++)for(let col=0;col<atlas.cols;col++){
      const result=A.crop(file,col,row,atlas.cols,atlas.rows);
      assert(Array.isArray(result));assert.equal(result.length,4);
      const [left,top,width,height]=result;
      for(const value of result)assert(Number.isFinite(value)&&value>=0&&value<=1,file+' finite fraction');
      assert(width>0&&height>0&&left+width<=1+1e-12&&top+height<=1+1e-12);
      assert(left*atlas.width>=atlas.x[col]-1e-9);
      assert(top*atlas.height>=atlas.y[row]-1e-9);
      assert((left+width)*atlas.width<=atlas.x[col+1]+1e-9);
      assert((top+height)*atlas.height<=atlas.y[row+1]+1e-9);
      const key=result.join(',');assert(!seen.has(key),file+' crop is independent');seen.add(key);
      if(row){const above=A.crop(file,col,row-1,atlas.cols,atlas.rows);assert(above[1]+above[3]<top);}
      if(col){const previous=A.crop(file,col-1,row,atlas.cols,atlas.rows);assert(previous[0]+previous[2]<left);}
    }
    assert.equal(seen.size,atlas.cols*atlas.rows);
  }
});

test('q5 uses the painted thunder and healer rows instead of a uniform mathematical row',()=>{
  const px=result=>result.map(value=>Math.round(value*1254));
  assert.deepEqual(A.atlases['v6-gear-quality-5.png'].y,[0,195,388,589,784,982,1254]);
  assert.deepEqual(px(A.crop('v6-gear-quality-5.png',0,2,6,6)),[0,389,209,199]);
  assert.deepEqual(px(A.crop('v6-gear-quality-5.png',0,5,6,6)),[0,983,209,271]);
  assert(A.crop('v6-gear-quality-5.png',0,2,6,6)[1]<2/6,'preserves the thunder staff head above uniform row418');
  assert(A.crop('v6-gear-quality-5.png',0,5,6,6)[1]<5/6,'preserves the healer ruler above uniform row1045');
});

test('known files accept asset URLs and rounding noise but reject other files and invalid coordinates',()=>{
  const plain=A.crop('v6-techniques-atlas.png',7,5,8,6);
  assert.deepEqual(A.crop('https://example.test/assets/v6-techniques-atlas.png?rev=1#icon',7,5,8,6),plain);
  assert.deepEqual(A.crop('v6-techniques-atlas.png',7-1e-9,5+1e-9,8,6),plain);
  for(const values of [
    ['v5-gear-quality-5.png',0,0,6,6],['v6-gear-quality-5.png',0,0,8,6],
    ['v6-gear-quality-5.png',-1,0,6,6],['v6-gear-quality-5.png',6,0,6,6],
    ['v6-gear-quality-5.png',0,6,6,6],['v6-gear-quality-5.png',.5,0,6,6],
    ['v6-gear-quality-5.png',NaN,0,6,6],['v6-gear-quality-5.png',0,Infinity,6,6],
    [null,0,0,6,6],['constructor',0,0,undefined,undefined],
    ['__proto__',0,0,undefined,undefined],['toString',0,0,undefined,undefined]
  ])assert.equal(A.crop(...values),null);
});

test('browser UMD exposes only immutable metadata and the same crop function',()=>{
  const context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web/art-crops.js'),'utf8'),context);
  const B=context.WendaoArtCrops;
  assert(B&&typeof B.crop==='function');
  assert.deepEqual(Array.from(B.crop('v6-pills-atlas.png',5,2,6,3)),A.crop('v6-pills-atlas.png',5,2,6,3));
  assert(Object.isFrozen(B)&&Object.isFrozen(B.atlases)&&Object.isFrozen(B.atlases['v6-gear-quality-5.png'].y));
  const result=A.crop('v6-pills-atlas.png',5,2,6,3);assert(Object.isFrozen(result));
});
