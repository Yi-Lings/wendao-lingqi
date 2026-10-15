(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WendaoMentorArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// One column per named immortal, one row per expression. Source rectangles are
// native atlas boundaries, kept separate from the portrait's display size.
const file='v7-immortal-mentors-atlas.png';
const atlas=Object.freeze({width:1086,height:1448,cols:3,rows:4,
 x:Object.freeze([0,362,724,1086]),y:Object.freeze([0,362,724,1086,1448])});
const mentors=Object.freeze({
 xuanlv:Object.freeze({name:'玄律',role:'天门执律',col:0}),
 chizhaochuan:Object.freeze({name:'池照川',role:'云海真君',col:1}),
 shangfenyue:Object.freeze({name:'商焚岳',role:'星海镇将',col:2})
});
const expressionNames=Object.freeze(['平静','认可','审视','坚定']);
const aliases=Object.freeze({calm:0,neutral:0,peaceful:0,smile:1,approve:1,approval:1,joy:1,recognition:1,thoughtful:2,scrutiny:2,assessing:2,serious:2,worried:2,determined:3,resolve:3,battle:3});
function expressionRow(expression){
 if(Number.isInteger(expression)&&expression>=0&&expression<4)return expression;
 return typeof expression==='string'&&Object.hasOwn(aliases,expression)?aliases[expression]:0;
}
function portrait(speakerId,expression=0){
 if(typeof speakerId!=='string'||!Object.hasOwn(mentors,speakerId))return null;
 const mentor=mentors[speakerId],col=mentor.col,row=expressionRow(expression);
 const left=atlas.x[col]+(col>0?1:0),top=atlas.y[row]+(row>0?1:0);
 const right=atlas.x[col+1]-(col<atlas.cols-1?1:0),bottom=atlas.y[row+1]-(row<atlas.rows-1?1:0);
 return Object.freeze({speakerId,name:mentor.name,role:mentor.role,file,cols:atlas.cols,rows:atlas.rows,col,row,
  expression:row,expressionName:expressionNames[row],size:'300% 400%',position:col*50+'% '+row*100/3+'%',
  crop:Object.freeze([left/atlas.width,top/atlas.height,(right-left)/atlas.width,(bottom-top)/atlas.height])});
}
return Object.freeze({portrait,mentors,atlas,expressionNames});
});
