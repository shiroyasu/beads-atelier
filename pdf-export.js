'use strict';
// A4 PDF: vector beads and symbols; Japanese labels are embedded at 3x resolution.
// No server upload, external font request, or change to the editable pattern.
const PatternPDF = (() => {
 const PAGE={w:595.276,h:841.89}, M=28;
 const ascii=s=>new TextEncoder().encode(s);
 const rgb=h=>{const full=h.length===4?'#'+h.slice(1).split('').map(c=>c+c).join(''):h;return [1,3,5].map(i=>parseInt(full.slice(i,i+2),16)/255)};
 const n=x=>Number(x.toFixed(3));
 function layout(pattern){
  const counts=new Map();pattern.cells.flat().forEach(id=>{if(id!==null)counts.set(id,(counts.get(id)||0)+1)});
  const used=pattern.palette.map((p,i)=>({...p,symbol:symbolFor(i),count:counts.get(p.id)||0})).filter(p=>p.count);
  const rawW=pattern.cols*22+(pattern.stitchMode==='P'&&pattern.rows>1?11:0)-2,rawH=pattern.rows*26-2;
  const rotated=rawW>rawH,w=rotated?rawH:rawW,h=rotated?rawW:rawH;
  const legendCols=used.length>32?2:1,legendW=legendCols===1?150:264;
  const side={chart:{x:M,y:89,w:PAGE.w-2*M-legendW-16,h:PAGE.h-89-42},legend:{x:PAGE.w-M-legendW,y:89,w:legendW,h:PAGE.h-89-42},legendCols};
  const bottomH=Math.max(1,Math.ceil(used.length/3))*24+28;
  const bottom={chart:{x:M,y:89,w:PAGE.w-2*M,h:PAGE.h-89-42-bottomH-15},legend:{x:M,y:PAGE.h-42-bottomH,w:PAGE.w-2*M,h:bottomH},legendCols:3};
  for(const option of [side,bottom])option.scale=Math.min((option.chart.w-20)/w,(option.chart.h-20)/h,1.6);
  const best=bottom.scale>side.scale?bottom:side;
  const scale=best.scale,ox=best.chart.x+20+(best.chart.w-20-w*scale)/2,oy=best.chart.y+20+(best.chart.h-20-h*scale)/2;
  return {...best,used,rotated,w,h,rawW,rawH,scale,ox,oy};
 }
 function makePDF(commands,images){
  const objects=[];
  const add=body=>{objects.push(typeof body==='string'?ascii(body):body);return objects.length};
  const join=parts=>{const size=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(size);let pos=0;for(const part of parts){out.set(part,pos);pos+=part.length}return out};
  const stream=(dict,bytes)=>join([ascii('<< '+dict+' /Length '+bytes.length+' >>\nstream\n'),bytes,ascii('\nendstream')]);
  add('<< /Type /Catalog /Pages 2 0 R >>');add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PAGE.w+' '+PAGE.h+'] /Resources << /Font << /F1 4 0 R >> /XObject << '+images.map((_,i)=>'/I'+i+' '+(6+i)+' 0 R').join(' ')+' >> >> /Contents 5 0 R >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');add(stream('',ascii(commands.join('\n'))));
  images.forEach(im=>add(stream('/Type /XObject /Subtype /Image /Width '+im.width+' /Height '+im.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',im.bytes)));
  const parts=[ascii('%PDF-1.4\n')],offsets=[0];let length=parts[0].length;
  objects.forEach((o,i)=>{offsets.push(length);const part=join([ascii((i+1)+' 0 obj\n'),o,ascii('\nendobj\n')]);parts.push(part);length+=part.length});
  const xref=length;parts.push(ascii('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n'));
  return new Blob(parts,{type:'application/pdf'});
 }
 function textImage(width,height,draw){
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(width*3);canvas.height=Math.ceil(height*3);
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.scale(3,3);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.textBaseline='top';draw(ctx);
  const raw=atob(canvas.toDataURL('image/jpeg',.98).split(',')[1]);return {width:canvas.width,height:canvas.height,bytes:Uint8Array.from(raw,c=>c.charCodeAt(0))};
 }
 const font=(ctx,size,bold=false)=>{ctx.font=(bold?'600 ':'')+size+'px "Hiragino Sans", "Yu Gothic", sans-serif';ctx.fillStyle='#253238'};
 function fitText(ctx,text,x,y,width){let value=String(text);if(ctx.measureText(value).width>width){const chars=Array.from(value);while(chars.length&&ctx.measureText(chars.join('')+'…').width>width)chars.pop();value=chars.join('')+'…'}ctx.fillText(value,x,y)}
 async function create(pattern){
  if(document.fonts?.ready)await document.fonts.ready;
  const l=layout(pattern),commands=[],images=[];
  const image=(im,x,y,w,h)=>{const i=images.push(im)-1;commands.push(`q ${n(w)} 0 0 ${n(h)} ${n(x)} ${n(PAGE.h-y-h)} cm /I${i} Do Q`)};
  const rect=(x,y,w,h,color,stroke='#aab2b5')=>commands.push(`${rgb(color).map(n).join(' ')} rg ${rgb(stroke).map(n).join(' ')} RG ${n(Math.max(.12,l.scale*.45))} w ${n(x)} ${n(PAGE.h-y-h)} ${n(w)} ${n(h)} re B`);
  const text=(value,x,y,size,color='#24383d')=>{const v=String(value).replace(/[()\\]/g,'\\$&');commands.push(`BT /F1 ${n(size)} Tf ${rgb(color).map(n).join(' ')} rg 1 0 0 1 ${n(x)} ${n(PAGE.h-y)} Tm (${v}) Tj ET`)};
  const title=String(pattern.title||'図案');
  image(textImage(PAGE.w-2*M,58,ctx=>{
   let size=18;font(ctx,size,true);while(size>11&&ctx.measureText(title).width>PAGE.w-2*M){size--;font(ctx,size,true)}fitText(ctx,title,0,0,PAGE.w-2*M);
   font(ctx,9);ctx.fillText((pattern.stitchMode==='P'?'半目ずらし（ペヨーテ型）':'格子（スクエア・織り型）')+'  ｜  '+pattern.cols+'列 × '+pattern.rows+'段  ｜  '+l.used.reduce((v,p)=>v+p.count,0)+'粒',0,30);
   font(ctx,8);ctx.fillText(l.rotated?'図案を右に90°回転して配置しています。':'図案の長い辺を縦に配置しています。',0,45);
  }),M,26,PAGE.w-2*M,58);
  const byId=new Map(l.used.map(p=>[p.id,p]));
  for(let r=0;r<pattern.rows;r++)for(let c=0;c<pattern.cols;c++){
   const p=byId.get(pattern.cells[r][c]);let x=c*22+(pattern.stitchMode==='P'?(r%2)*11:0),y=r*26,bw=20,bh=24;
   if(l.rotated){[x,y]=[l.rawH-y-bh,x];[bw,bh]=[bh,bw]}
   x=l.ox+x*l.scale;y=l.oy+y*l.scale;bw*=l.scale;bh*=l.scale;
   rect(x,y,bw,bh,p?.color||'#ffffff',p?'#8d989c':'#d4d9db');
   if(p){const size=Math.min(bw/(p.symbol.length*.7+1),bh*.58);text(p.symbol,x+bw/2-size*.34*p.symbol.length,y+bh/2+size*.35,size,ink(p.color))}
  }
  // Original row/column numbers remain meaningful after the automatic rotation.
  const axisSize=Math.min(7,10*l.scale);
  for(let c=0;c<pattern.cols;c++)if(c===0||(c+1)%5===0){const v=String(c+1);if(l.rotated)text(v,l.ox-4-axisSize*v.length*.6,l.oy+(c*22+12)*l.scale,axisSize);else text(v,l.ox+(c*22+10)*l.scale-axisSize*v.length*.3,l.oy-5,axisSize)}
  for(let r=0;r<pattern.rows;r++)if(r===0||(r+1)%5===0){const v=String(r+1);if(l.rotated)text(v,l.ox+(l.rawH-r*26-12)*l.scale-axisSize*v.length*.3,l.oy-5,axisSize);else text(v,l.ox-4-axisSize*v.length*.6,l.oy+(r*26+14)*l.scale,axisSize)}
  const legend=l.legend,perCol=Math.max(1,Math.ceil(l.used.length/l.legendCols)),colW=legend.w/l.legendCols;
  image(textImage(legend.w,legend.h,ctx=>{
   font(ctx,10,true);ctx.fillText('使用ビーズ  '+l.used.length+'色',0,0);
   if(!l.used.length){font(ctx,9);ctx.fillText('ビーズは未配置です。',0,24)}
   l.used.forEach((p,i)=>{const col=Math.floor(i/perCol),row=i%perCol,x=col*colW,y=25+row*20;
    ctx.fillStyle=p.color;ctx.fillRect(x,y,15,17);ctx.strokeStyle='#9ca8ad';ctx.lineWidth=.4;ctx.strokeRect(x,y,15,17);
    font(ctx,p.symbol.length>1?7:9,true);ctx.fillStyle=ink(p.color);ctx.textAlign='center';ctx.fillText(p.symbol,x+7.5,y+3);ctx.textAlign='left';
    font(ctx,8,true);fitText(ctx,(p.catalogCode||p.code)+'  '+p.count+'粒',x+20,y,colW-25);
    font(ctx,7);fitText(ctx,p.name,x+20,y+10,colW-25);
   });
  }),legend.x,legend.y,legend.w,legend.h);
  image(textImage(PAGE.w-2*M,17,ctx=>{font(ctx,7);ctx.fillText('BEADS Atelier & Réserve   ｜   色は画面上の近似色です。実物の色・質感とは異なります。',0,1);if(l.scale<.28)ctx.fillText('細かな図案のため、記号が小さく表示されています。',0,10)}),M,PAGE.h-27,PAGE.w-2*M,17);
  return makePDF(commands,images);
 }
 return {layout,create};
})();
$('exportPDF').onclick=async()=>{
 const button=$('exportPDF'),label=button.textContent;button.disabled=true;button.textContent='書き出し中…';
 try{const pattern=patternDocument(),blob=await PatternPDF.create(pattern);const name=(pattern.title||'図案').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_');downloadDocument(blob,name+'_図案.pdf');status('図案と使用ビーズをA4縦1枚のPDFに書き出しました');}
 catch(error){console.error('PDF export failed',error);status('PDFを書き出せませんでした。もう一度お試しください');}
 finally{button.disabled=false;button.textContent=label;}
};
