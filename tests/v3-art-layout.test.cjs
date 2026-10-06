'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {geometry}=require('../web/art-layout.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.0001,`${a} differs from ${b}`);
test('wide and tall atlas crops preserve the original image proportions and stay inside the chosen cell',()=>{
 for(const atlas of [
  {imageWidth:1536,imageHeight:1024,cols:3,rows:2},
  {imageWidth:1086,imageHeight:1448,cols:3,rows:4},
  {imageWidth:1448,imageHeight:1086,cols:8,rows:6},
  {imageWidth:1536,imageHeight:1024,cols:3,rows:1},
  {imageWidth:2048,imageHeight:2048,cols:6,rows:6}
 ])for(const [width,height] of [[850,304],[340,84],[140,160],[61,122],[74,74],[302,189]])for(let col=0;col<atlas.cols;col++)for(let row=0;row<atlas.rows;row++){
  const g=geometry({...atlas,width,height,col,row});assert.ok(g);
  // A circle in the original file must remain a circle after rendering.
  near(g.width/atlas.imageWidth,g.height/atlas.imageHeight);
  const cellW=atlas.imageWidth/atlas.cols,cellH=atlas.imageHeight/atlas.rows;
  const left=-g.x/g.scale,top=-g.y/g.scale,right=(width-g.x)/g.scale,bottom=(height-g.y)/g.scale;
  assert.ok(left>=col*cellW-.0001&&right<=(col+1)*cellW+.0001,'horizontal crop never reveals a neighboring tile');
  assert.ok(top>=row*cellH-.0001&&bottom<=(row+1)*cellH+.0001,'vertical crop never reveals a neighboring tile');
  near((left+right)/2,(col+.5)*cellW);near((top+bottom)/2,(row+.5)*cellH);
 }
});
test('resize keeps the same tile center for every original boss portrait and all new six-by-six atlas cells',()=>{
 for(const [cols,rows,imageWidth,imageHeight] of [[3,4,1086,1448],[6,6,2048,2048]])for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)for(const [width,height] of [[265,265],[420,420],[102,64],[64,102]]){
  const g=geometry({width,height,cols,rows,col,row,imageWidth,imageHeight});
  near((width/2-g.x)/g.width,(col+.5)/cols);near((height/2-g.y)/g.height,(row+.5)/rows);
 }
});
test('hidden elements and invalid crops cannot create infinite scaling or cross into unrelated atlas cells',()=>{
 const input={width:74,height:74,imageWidth:2048,imageHeight:2048,cols:6,rows:6,col:0,row:0};
 for(const override of [{width:0},{height:0},{imageWidth:0},{imageHeight:NaN},{cols:0},{rows:0},{col:-1},{row:6},{col:Infinity}])assert.equal(geometry({...input,...override}),null);
});
