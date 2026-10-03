// Packaging only: preserve generated alpha and artwork; trim empty margins and size for runtime.
const sharp=require('sharp'),fs=require('fs');
(async()=>{const [race,input]=process.argv.slice(2);if(!race||!input)throw Error('race and source required');const m=await sharp(input).metadata();
for(let sex=0;sex<2;sex++){
 const half=await sharp(input).extract({left:sex*Math.floor(m.width/2),top:0,width:Math.floor(m.width/2),height:m.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let minX=half.info.width,minY=half.info.height,maxX=0,maxY=0;
 for(let y=0;y<half.info.height;y++)for(let x=0;x<half.info.width;x++)if(half.data[(y*half.info.width+x)*4+3]>180){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
 minX=Math.max(0,minX-3);minY=Math.max(0,minY-3);maxX=Math.min(half.info.width-1,maxX+3);maxY=Math.min(half.info.height-1,maxY+3);
 const body=await sharp(half.data,{raw:half.info}).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1}).resize({height:740}).webp({quality:88,alphaQuality:100}).toBuffer();const size=await sharp(body).metadata();
 if(size.width>470)throw Error('Body too wide for standard canvas');
 await sharp({create:{width:480,height:820,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:body,left:Math.round((480-size.width)/2),top:40}]).webp({quality:88,alphaQuality:100}).toFile('assets/characters/race-bases/'+race+'-'+(sex?'female':'male')+'.webp');
 console.log(race,sex?'female':'male',size.width,740);
}
})();
