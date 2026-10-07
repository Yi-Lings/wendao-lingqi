(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WendaoArtCrops=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

/* Native source rectangles, measured against the generated PNGs. The painted
   rows are not equally spaced: their drawing area ends before the final row's
   extra bottom margin. Keep the files unchanged and crop their actual cells.
   In particular, a 209px uniform q5 row would include the following item and
   cut the selected item's top. Explicit rectangles must be uniformly CONTAINED
   in the icon box; covering a square would crop the taller final-row cells.

   Separators were selected from the low-luminance gaps between whole objects;
   q5 also has visible one-pixel dark ruling lines. A single native pixel inside
   each interior boundary excludes those lines and shared edge light. We do not
   apply a percentage inset, which would cut narrow weapon tips and small aura
   details. Canvas edges remain intact. These are crop coordinates, not resized
   or recolored copies of the artwork. */
const definitions={
  'v6-gear-quality-0.png':{width:1254,height:1254,x:[0,222,418,624,842,1048,1254],y:[0,204,401,613,813,1017,1254]},
  'v6-gear-quality-1.png':{width:1254,height:1254,x:[0,210,418,624,836,1050,1254],y:[0,205,406,617,822,1022,1254]},
  'v6-gear-quality-2.png':{width:1254,height:1254,x:[0,209,428,632,838,1048,1254],y:[0,195,392,595,802,1007,1254]},
  'v6-gear-quality-3.png':{width:1254,height:1254,x:[0,213,434,636,842,1059,1254],y:[0,206,396,598,804,1008,1254]},
  'v6-gear-quality-4.png':{width:1254,height:1254,x:[0,208,428,633,836,1052,1254],y:[0,203,395,593,796,1003,1254]},
  'v6-gear-quality-5.png':{width:1254,height:1254,x:[0,210,418,627,836,1044,1254],y:[0,195,388,589,784,982,1254]},
  'v6-techniques-atlas.png':{width:1448,height:1086,x:[0,178,361,536,721,903,1090,1271,1448],y:[0,187,361,545,725,902,1086]},
  'v6-treasures-atlas.png':{width:2172,height:724,x:[0,353,726,1078,1443,1806,2172],y:[0,358,724]},
  'v6-pills-atlas.png':{width:1774,height:887,x:[0,292,589,882,1180,1475,1774],y:[0,294,575,887]},
  'v6-utilities-atlas.png':{width:1254,height:1254,x:[0,211,415,628,835,1040,1254],y:[0,209,412,606,812,1021,1254]}
};
const atlases=Object.freeze(Object.fromEntries(Object.entries(definitions).map(([file,entry])=>[file,Object.freeze({
  width:entry.width,height:entry.height,cols:entry.x.length-1,rows:entry.y.length-1,
  x:Object.freeze(entry.x),y:Object.freeze(entry.y)
})])));

function index(value){
  if(!Number.isFinite(value))return null;
  const rounded=Math.round(value);
  return Math.abs(value-rounded)<=1e-6?rounded:null;
}
function crop(file,col,row,cols,rows){
  if(typeof file!=='string')return null;
  const name=file.split(/[?#]/,1)[0].split('/').pop();
  if(!Object.hasOwn(atlases,name))return null;
  const atlas=atlases[name];
  const c=index(col),r=index(row);
  if(cols!==atlas.cols||rows!==atlas.rows||c===null||r===null||c<0||r<0||c>=atlas.cols||r>=atlas.rows)return null;
  const left=atlas.x[c]+(c>0?1:0),top=atlas.y[r]+(r>0?1:0);
  const right=atlas.x[c+1]-(c<atlas.cols-1?1:0),bottom=atlas.y[r+1]-(r<atlas.rows-1?1:0);
  return Object.freeze([left/atlas.width,top/atlas.height,(right-left)/atlas.width,(bottom-top)/atlas.height]);
}
return Object.freeze({crop,atlases});
});
