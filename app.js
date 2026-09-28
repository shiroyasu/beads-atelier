'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
// The starter palette uses editable custom colors, not catalog bead colors.
let palette=[['仮色 A','ペトロール','#277d86'],['仮色 B','ミッドナイト','#253b50'],['仮色 C','アイボリー','#f6f3e9'],['仮色 D','ハニー','#d4ad63'],['仮色 E','ローズ','#b76576'],['仮色 F','スカイ','#83b9d1'],['仮色 G','セージ','#9fba99'],['仮色 H','アプリコット','#efb184'],['仮色 I','ラベンダー','#afa1c9'],['仮色 J','コーラル','#dd8271']].map((p,i)=>({id:'p'+i,code:p[0],name:p[1],color:p[2]}));
let cols=32,rows=12,cells=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>{
 if(c===0||c===cols-1)return 'p2';
 const motif=Math.floor((c-1)/10),x=(c-1)%10,d=Math.abs(x-4.5)+Math.abs(r-5.5);
 if(d<2)return motif===1?'p7':'p3';
 if(d<3)return ['p6','p8','p5'][motif];
 if(d<4)return ['p0','p4','p9'][motif];
 return d<5?'p1':'p2';
}));
let inventory=[],stitchMode='P';
function rowOffset(r){return stitchMode==='P'?(r%2)*11:0}
const INVENTORY_AMOUNTS=['ごく少量','3g','7g','20g'];
let selected='p0',tool='paint',selection=null,clipboard=null,drag=null,history=[],future=[],zoom=1,viewRotation=0,focusCell={c:0,r:0},dirty=false;
const catalogBeads=typeof BEAD_CATALOG==='undefined'?[]:BEAD_CATALOG.beads;
function catalogRecord(p){return p?.catalogCode?catalogBeads.find(b=>b.code===p.catalogCode):null}
function symbolFor(i){return i<26?String.fromCharCode(65+i):String.fromCharCode(64+Math.floor(i/26))+String.fromCharCode(65+i%26)}
function bitmapFor(p){const b=catalogRecord(p);return b&&b.color===p.color?b.bitmap:null}
function styleChip(e,p,texture=$('texture').checked){e.style.backgroundColor=p.color;e.style.backgroundImage=texture&&bitmapFor(p)?'url("'+bitmapFor(p)+'")':'';e.style.backgroundSize='100% 100%';e.style.color=ink(p.color)}
const snapshot=()=>JSON.stringify({cols,rows,cells,palette,inventory,stitchMode,title:$('title').value});
function record(){history.push(snapshot());if(history.length>80)history.shift();future=[];}
function status(s){$('status').textContent=s}
function changed(s='変更あり — 保存してください'){dirty=true;status(s);render()}
function restore(s){const o=JSON.parse(s);({cols,rows,cells,palette}=o);inventory=o.inventory??inventory;stitchMode=o.stitchMode||'P';$('title').value=o.title;selected=palette.some(p=>p.id===selected)?selected:palette[0]?.id||null;selection=null;clipboard=null;focusCell={c:0,r:0};sync();changed();inspect(0,0)}
function undo(){if(!history.length)return;future.push(snapshot());restore(history.pop())}
function redo(){if(!future.length)return;history.push(snapshot());restore(future.pop())}
function sync(){$('cols').value=cols;$('rows').value=rows}
function bead(id){return palette.find(p=>p.id===id)}
function ink(color){return (parseInt(color.slice(1,3),16)*.299+parseInt(color.slice(3,5),16)*.587+parseInt(color.slice(5,7),16)*.114)>150?'#24383d':'#fff'}
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.appendChild(e);return e}
function renderGrid(){const svg=$('grid');svg.replaceChildren();const layer=el('g',{id:'patternView'},svg);const defs=el('defs',{},layer);if($('texture').checked)palette.forEach((p,i)=>{const b=catalogRecord(p);if(!bitmapFor(p))return;(b.mix_bitmaps||[b.bitmap]).forEach((src,j)=>{const pat=el('pattern',{id:'bead-'+i+'-'+j,width:1,height:1,patternContentUnits:'objectBoundingBox'},defs);el('image',{href:src,width:1,height:1,preserveAspectRatio:'none'},pat)})});const w=(cols+(stitchMode==='P'?.5:0))*22+40,h=rows*26+40;const turned=viewRotation%180!==0;svg.setAttribute('viewBox',`0 0 ${turned?h:w} ${turned?w:h}`);svg.setAttribute('width',(turned?h:w)*zoom);svg.setAttribute('height',(turned?w:h)*zoom);layer.setAttribute('transform',({0:'',90:`translate(${h} 0) rotate(90)`,180:`translate(${w} ${h}) rotate(180)`,270:`translate(0 ${w}) rotate(270)`})[viewRotation]);for(let c=0;c<cols;c++)if(c===0||(c+1)%5===0){let t=el('text',{x:31+c*22,y:12,'text-anchor':'middle',fill:'#7b9096','font-size':10},layer);t.textContent=c+1}for(let r=0;r<rows;r++){let t=el('text',{x:8,y:37+r*26,'text-anchor':'middle',fill:'#7b9096','font-size':10},layer);t.textContent=r+1;for(let c=0;c<cols;c++){let p=bead(cells[r][c]),inside=selection&&c>=selection.c1&&c<=selection.c2&&r>=selection.r1&&r<=selection.r2;let rect=el('rect',{x:20+c*22+rowOffset(r),y:20+r*26,width:20,height:24,rx:5,fill:p&&$('texture').checked&&bitmapFor(p)?'url(#bead-'+palette.indexOf(p)+'-'+((r*31+c*13)%(catalogRecord(p).mix_bitmaps?.length||1))+')':p?.color||'#ffffff88',stroke:inside?'#dc822c':p?'#00000024':'#c5d3d5','stroke-width':inside?2.5:1,'data-c':c,'data-r':r},layer);el('title',{},rect).textContent=`${r+1}段 ${c+1}列：${p?p.code+' / '+p.name:'未配置'}`;if($('symbols').checked&&p){let t=el('text',{x:30+c*22+rowOffset(r),y:36+r*26,fill:ink(p.color),'text-anchor':'middle','font-size':11},layer);t.textContent=symbolFor(palette.indexOf(p))}}}if(tool==='paste'&&clipboard){const fits=focusCell.c+clipboard[0].length<=cols&&focusCell.r+clipboard.length<=rows;clipboard.forEach((row,y)=>row.forEach((id,x)=>{const c=focusCell.c+x,r=focusCell.r+y;if(c>=cols||r>=rows)return;el('rect',{x:20+c*22+rowOffset(r),y:20+r*26,width:20,height:24,rx:5,fill:bead(id)?.color||'#fff',opacity:.65,stroke:fits?'#e18a24':'#ca3434','stroke-width':2,'pointer-events':'none'},layer)}))}if(document.activeElement===svg)el('rect',{x:19+focusCell.c*22+rowOffset(focusCell.r),y:19+focusCell.r*26,width:22,height:26,rx:5,fill:'none',stroke:'#eaaa39','stroke-width':2,'pointer-events':'none'},layer)}
function sortedPalette(){
 const mode=$('paletteSort')?.value||'added',compare=(a,b)=>a.localeCompare(b,'ja',{numeric:true});
 if(mode==='added')return [...palette];
 return [...palette].sort((a,b)=>{
  const ra=catalogRecord(a),rb=catalogRecord(b);
  if(!ra||!rb)return ra?-1:rb?1:compare(a.name,b.name);
  const key=r=>mode==='family'?(r.color_family||''):mode==='finish'?[...r.tags].sort((a,b)=>compare(a,b)).join(' / '):'';
  return compare(key(ra),key(rb))||compare(ra.code,rb.code);
 });
}
function render(){syncStitchUI();renderGrid();const scrollTop=$('swatches').scrollTop;$('swatches').replaceChildren();sortedPalette().forEach(p=>{let b=document.createElement('button');b.className='swatch'+(p.id===selected?' selected':'');b.setAttribute('aria-pressed',p.id===selected);let chip=document.createElement('span');chip.className='chip';styleChip(chip,p,$('paletteTexture').checked);chip.textContent=symbolFor(palette.indexOf(p));let text=document.createElement('span'),strong=document.createElement('strong');strong.textContent=catalogRecord(p)?p.code:p.name;text.append(strong);b.title=p.code+' / '+p.name;b.append(chip,text);b.onclick=()=>{selected=p.id;setTool('paint');render()};let row=document.createElement('div');row.className='palette-row';let remove=document.createElement('button');remove.className='remove-color';remove.textContent='×';remove.title=p.code+'を削除';remove.setAttribute('aria-label',p.code+'をパレットから削除');remove.onclick=()=>removeColor(p.id);row.append(b,remove);$('swatches').append(row)});$('swatches').scrollTop=scrollTop;$('paletteCount').textContent=palette.length+'色';$('dimensions').textContent=`${cols}列 × ${rows}段`;$('used').replaceChildren();let count={};cells.flat().forEach(id=>{if(id)count[id]=(count[id]||0)+1});palette.filter(p=>count[p.id]).forEach(p=>{let row=document.createElement('div');row.className='usedrow';let chip=document.createElement('span');chip.className='chip';styleChip(chip,p);let b=document.createElement('b');b.textContent=p.code;let n=document.createElement('span');n.textContent=count[p.id]+'粒';row.append(chip,b,n);$('used').append(row)});$('total').textContent=Object.values(count).reduce((a,b)=>a+b,0)+'粒';$('selectionText').textContent=selection?`${selection.c2-selection.c1+1}列 × ${selection.r2-selection.r1+1}段を選択中`:'範囲は未選択です';$('undo').disabled=!history.length;$('redo').disabled=!future.length;$('copy').disabled=!selection;$('delete').disabled=!selection;$('paste').disabled=!clipboard;if(typeof updatePaletteControls==='function')updatePaletteControls();}
function removeColor(id){
  const p=bead(id);if(!p)return;
  const count=cells.flat().filter(value=>value===id).length;
  if(count&&!confirm(p.code+'は図案で'+count+'粒使用しています。削除すると、この色のビーズは未配置になります。削除しますか？'))return;
  record();
  palette=palette.filter(color=>color.id!==id);
  cells=cells.map(row=>row.map(value=>value===id?null:value));
  clipboard=null;
  if(selected===id)selected=palette[0]?.id||null;
  if(tool==='paste')setTool('select');
  changed(p.code+'を削除しました。「元に戻す」で復元できます');
  inspect(Math.min(focusCell.c,cols-1),Math.min(focusCell.r,rows-1));
}
function inspect(c,r){focusCell={c,r};let p=bead(cells[r][c]);$('coord').textContent=`${r+1}段・${c+1}列　${p?.code||'未配置'}`;let box=$('inspected');box.replaceChildren();let chip=document.createElement('span');chip.className='bigbead';if(p)styleChip(chip,p);else chip.style.background='#fff';let strong=document.createElement('strong');strong.textContent=p?.code||'未配置';let desc=document.createElement('p');desc.textContent=p?.name||'まだビーズが置かれていません';let pos=document.createElement('p');pos.textContent=`${r+1}段 / ${c+1}列`;box.append(chip,strong,desc,pos);const info=document.createElement('p');info.textContent=p?(catalogRecord(p)?'実在品番 / 写真由来の近似色':'自由色 / 品番未確認'):'';box.append(info);const b=catalogRecord(p);if(b){let link=document.createElement('a');link.href=b.product_url;link.target='_blank';link.rel='noopener';link.textContent='商品ページで確認 ↗';box.append(link)}}
function hit(e){let svg=$('grid'),pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;pt=pt.matrixTransform($('patternView').getScreenCTM().inverse());let r=Math.floor((pt.y-20)/26),c=Math.floor((pt.x-20-rowOffset(r))/22);return r>=0&&r<rows&&c>=0&&c<cols?{c,r}:null}
function setTool(t){tool=t;$('paste').textContent='貼り付け';$('paste').classList.toggle('primary',t==='paste');document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===t);b.setAttribute('aria-pressed',b.dataset.tool===t)});$('hint').textContent={paint:'ドラッグで連続して描けます。選択ツールで、模様をまとめて編集。',erase:'ドラッグでビーズを消します。元に戻すこともできます。',select:'ドラッグで範囲選択。コピーしたら「貼り付け」を押し、貼り付け先をクリック。',move:'選択範囲の中からドラッグして移動。矢印キーでも1目ずつ動かせます。',inspect:'ビーズをタップして、品番・色名・位置を確認します。',paste:'貼り付け先の左上のビーズをクリック。Escでキャンセル。'}[t]}
function copy(){if(!selection)return;let s=selection;clipboard=cells.slice(s.r1,s.r2+1).map(row=>row.slice(s.c1,s.c2+1));render();status('コピーしました。「貼り付け」を押して、図案上の貼り付け先をクリックしてください')}
function pasteAt(c,r){if(!clipboard)return;let w=clipboard[0].length,h=clipboard.length;if(c+w>cols||r+h>rows){status('図案の外には貼り付けできません。内側を選んでください');return}record();clipboard.forEach((row,y)=>row.forEach((id,x)=>cells[r+y][c+x]=id));selection={c1:c,c2:c+w-1,r1:r,r2:r+h-1};setTool('select');changed('貼り付けました — 保存してください')}
function move(dc,dr){if(!selection||(!dc&&!dr))return;let s=selection;if(s.c1+dc<0||s.c2+dc>=cols||s.r1+dr<0||s.r2+dr>=rows){status('図案の外には移動できません');return}record();let data=cells.slice(s.r1,s.r2+1).map(row=>row.slice(s.c1,s.c2+1));for(let r=s.r1;r<=s.r2;r++)for(let c=s.c1;c<=s.c2;c++)cells[r][c]=null;data.forEach((row,y)=>row.forEach((id,x)=>cells[s.r1+dr+y][s.c1+dc+x]=id));selection={c1:s.c1+dc,c2:s.c2+dc,r1:s.r1+dr,r2:s.r2+dr};changed('移動しました — 保存してください')}
function clearSelection(){if(!selection)return;record();for(let r=selection.r1;r<=selection.r2;r++)for(let c=selection.c1;c<=selection.c2;c++)cells[r][c]=null;changed()}
function paintAt(p){if(tool!=='erase'&&!bead(selected)){status('先にパレットに色を登録してください');return}let id=tool==='erase'?null:selected;if(cells[p.r][p.c]!==id){cells[p.r][p.c]=id;dirty=true;renderGrid();inspect(p.c,p.r)}}
$('grid').addEventListener('pointerdown',e=>{if(e.button!==0)return;let p=hit(e);if(!p)return;e.preventDefault();$('grid').focus({preventScroll:true});$('grid').setPointerCapture(e.pointerId);inspect(p.c,p.r);if(tool==='paste'){pasteAt(p.c,p.r);return}if(tool==='inspect')return;if(tool==='move'){if(!selection||p.c<selection.c1||p.c>selection.c2||p.r<selection.r1||p.r>selection.r2){status('先に選択ツールで範囲を選んでください');return}drag={start:p,end:p};return}drag={start:p,end:p};if(tool==='select'){selection={c1:p.c,c2:p.c,r1:p.r,r2:p.r};renderGrid()}else{record();paintAt(p)}});
$('grid').addEventListener('pointermove',e=>{let p=hit(e);if(!p)return;inspect(p.c,p.r);if(tool==='paste'){renderGrid();return}if(!drag)return;drag.end=p;if(tool==='select'){selection={c1:Math.min(p.c,drag.start.c),c2:Math.max(p.c,drag.start.c),r1:Math.min(p.r,drag.start.r),r2:Math.max(p.r,drag.start.r)};renderGrid()}else if(tool==='paint'||tool==='erase'){let a=drag.last||drag.start,n=Math.max(Math.abs(p.c-a.c),Math.abs(p.r-a.r),1);for(let i=1;i<=n;i++)paintAt({c:Math.round(a.c+(p.c-a.c)*i/n),r:Math.round(a.r+(p.r-a.r)*i/n)});drag.last=p}});
function endDrag(e){if(!drag)return;let d=drag;drag=null;if(tool==='move'&&e.type!=='pointercancel')move(d.end.c-d.start.c,d.end.r-d.start.r);else if(tool==='paint'||tool==='erase')changed();else render()}
$('grid').addEventListener('pointerup',endDrag);$('grid').addEventListener('pointercancel',endDrag);
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('copy').onclick=copy;$('paste').onclick=()=>{if(clipboard){setTool('paste');renderGrid();status('貼り付け待機中 — 図案上の貼り付け先をクリックしてください')}};$('delete').onclick=clearSelection;$('undo').onclick=undo;$('redo').onclick=redo;$('symbols').onchange=renderGrid;$('texture').onchange=()=>{render();inspect(Math.min(focusCell.c,cols-1),Math.min(focusCell.r,rows-1))};
function setZoom(n){zoom=Math.max(.5,Math.min(2.5,n));$('zoom').textContent=Math.round(zoom*100)+'%';renderGrid()}$('minus').onclick=()=>setZoom(zoom-.25);$('plus').onclick=()=>setZoom(zoom+.25);
$('resize').onclick=()=>{let c=Number($('cols').value),r=Number($('rows').value);if(!Number.isInteger(c)||!Number.isInteger(r)||c<2||r<2||c>100||r>100){status('幅・高さは2〜100の整数にしてください');return}if((c<cols||r<rows)&&!confirm('小さくすると範囲外のビーズが消えます。サイズを変更しますか？'))return;record();cells=Array.from({length:r},(_,y)=>Array.from({length:c},(_,x)=>cells[y]?.[x]||null));cols=c;rows=r;selection=null;focusCell={c:0,r:0};changed()};
$('blank').onclick=()=>{if(!confirm('図案を白紙にしますか？必要なら先に保存してください。元に戻すこともできます。'))return;record();cells=Array.from({length:rows},()=>Array(cols).fill(null));selection=null;$('title').value='新しい図案';changed()};
$('openCustomColor').onclick=()=>{$('addColor').reset();$('customColorFeedback').textContent='';$('customColorDialog').showModal()};
$('closeCustomColor').onclick=$('cancelCustomColor').onclick=()=>$('customColorDialog').close();
$('addColor').onsubmit=e=>{
 e.preventDefault();let code=$('code').value.trim(),name=$('colorName').value.trim();
 if(!name){$('customColorFeedback').textContent='名前を入力してください。';$('colorName').focus();return}
 if(!code){let n=1;while(palette.some(p=>p.code==='自由色 '+n))n++;code='自由色 '+n}
 if(palette.some(p=>p.code.toLowerCase()===code.toLowerCase())){$('customColorFeedback').textContent='同じ品番がパレットに登録されています。別の品番にするか、空欄にしてください。';$('code').focus();return}
 if(palette.length>=64){$('customColorFeedback').textContent='パレットは64色までです。不要な色を削除してから追加してください。';return}
 record();selected='p'+Date.now();palette.push({id:selected,code,name,color:$('colorValue').value});$('addColor').reset();$('customColorDialog').close();setTool('paint');changed('自由色をパレットに追加しました — 図案を保存してください');
};
$('title').addEventListener('change',()=>{dirty=true;status('名前を変更しました — 保存してください')});
function validate(o){if(o?.format!=='delica-atelier'||![1,2,3,4].includes(o.version)||!Number.isInteger(o.cols)||!Number.isInteger(o.rows)||o.cols<2||o.cols>100||o.rows<2||o.rows>100||typeof o.title!=='string'||o.title.length>200||!Array.isArray(o.palette)||o.palette.length>64)throw Error('invalid');if((o.stitchMode!==undefined&&!['P','B'].includes(o.stitchMode))||(o.version===4&&!o.stitchMode))throw Error('invalid stitch');let ids=new Set();for(let p of o.palette){if(!p||typeof p.id!=='string'||ids.has(p.id)||typeof p.code!=='string'||p.code.length>32||typeof p.name!=='string'||p.name.length>120||!/^#[0-9a-f]{6}$/i.test(p.color))throw Error('invalid');if(p.catalogCode!==undefined&&(typeof p.catalogCode!=='string'||!/^DB[0-9]+[A-Za-z]*(?:-[0-9]+)?$/.test(p.catalogCode)))throw Error('invalid');ids.add(p.id)}if(!Array.isArray(o.cells)||o.cells.length!==o.rows||o.cells.some(row=>!Array.isArray(row)||row.length!==o.cols||row.some(id=>id!==null&&!ids.has(id))))throw Error('invalid');if(o.inventory!==undefined){validateInventory(o.inventory)}else if(o.version===2)throw Error('missing inventory');return o}
function validateInventory(stock){const o={inventory:stock};if(!Array.isArray(o.inventory)||o.inventory.length>catalogBeads.length)throw Error('invalid inventory');const codes=new Set();for(const item of o.inventory){if(!item||!catalogBeads.some(b=>b.code===item.code)||codes.has(item.code)||!INVENTORY_AMOUNTS.includes(item.amount))throw Error('invalid inventory');codes.add(item.code)}return stock}
$('load').onclick=()=>$('file').click();
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;let mod=e.metaKey||e.ctrlKey,k=e.key.toLowerCase();if(mod&&['z','y','c','v','s','a'].includes(k)){e.preventDefault();if(k==='z')e.shiftKey?redo():undo();if(k==='y')redo();if(k==='c')copy();if(k==='v'&&clipboard)setTool('paste');if(k==='s')$('save').click();if(k==='a'){selection={c1:0,c2:cols-1,r1:0,r2:rows-1};setTool('select');render()}return}if(e.key==='Escape'){selection=null;setTool('select');render()}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();clearSelection()}if(['b','v','m','e','i'].includes(k))setTool({b:'paint',v:'select',m:'move',e:'erase',i:'inspect'}[k]);if(e.key.startsWith('Arrow')){e.preventDefault();let dc=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,dr=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;({dc,dr}=screenDirection(dc,dr));if(selection)move(dc,dr);else{focusCell={c:Math.max(0,Math.min(cols-1,focusCell.c+dc)),r:Math.max(0,Math.min(rows-1,focusCell.r+dr))};inspect(focusCell.c,focusCell.r);renderGrid()}}if(e.key===' '&&e.target===$('grid')){e.preventDefault();if(tool==='paste')pasteAt(focusCell.c,focusCell.r);else if(tool==='paint'||tool==='erase'){record();paintAt(focusCell);changed()}else inspect(focusCell.c,focusCell.r)}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
render();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_bead_pattern',description:'Read the current peyote pattern, palette codes, and dimensions.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>JSON.parse(snapshot())})).catch(()=>{});Promise.resolve(document.modelContext.registerTool({name:'place_beads',description:'Place registered palette beads at zero-based row and column positions in the current pattern.',inputSchema:{type:'object',properties:{beads:{type:'array',items:{type:'object',properties:{row:{type:'integer'},column:{type:'integer'},paletteId:{type:'string'}},required:['row','column','paletteId'],additionalProperties:false}}},required:['beads'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!Array.isArray(input?.beads)||!input.beads.length||input.beads.length>10000||input.beads.some(b=>!Number.isInteger(b.row)||!Number.isInteger(b.column)||b.row<0||b.row>=rows||b.column<0||b.column>=cols||!bead(b.paletteId)))throw Error('Invalid bead positions or palette IDs');record();input.beads.forEach(b=>cells[b.row][b.column]=b.paletteId);changed();return{placed:input.beads.length}}})).catch(()=>{})}catch{}}

function screenDirection(dc,dr){return viewRotation===90?{dc:dr,dr:-dc}:viewRotation===180?{dc:-dc,dr:-dr}:viewRotation===270?{dc:-dr,dr:dc}:{dc,dr}}
function rotateView(angle){viewRotation=(angle+360)%360;drag=null;$('rotationAngle').textContent=viewRotation+'°';renderGrid();status('表示の向き：'+viewRotation+'°');}
$('rotateLeft').onclick=()=>rotateView(viewRotation-90);
$('rotateRight').onclick=()=>rotateView(viewRotation+90);


let pendingStitch=null;
function syncStitchUI(){
 $('peyoteMode').setAttribute('aria-pressed',stitchMode==='P');$('loomMode').setAttribute('aria-pressed',stitchMode==='B');
 $('stitchFoot').textContent=stitchMode==='P'?'半目ずらし / ペヨーテ型':'格子 / スクエア・織り型';
 $('grid').setAttribute('aria-label',(stitchMode==='P'?'半目ずらし':'格子')+'図案。矢印キーで移動、スペースで配置');
}
function requestStitch(mode){if(mode===stitchMode)return;pendingStitch=mode;$('stitchDialog').showModal()}
function finishStitch(save){if(save&&!savePatternFile())return;record();stitchMode=pendingStitch;cells=Array.from({length:rows},()=>Array(cols).fill(null));selection=null;clipboard=null;viewRotation=0;$('rotationAngle').textContent='0°';focusCell={c:0,r:0};$('title').value=stitchMode==='P'?'新しい半目ずらし図案':'新しい格子図案';$('stitchDialog').close();changed('方式を切り替えました。新しい白紙の図案です');inspect(0,0)}
$('peyoteMode').onclick=()=>requestStitch('P');$('loomMode').onclick=()=>requestStitch('B');
$('switchSave').onclick=()=>finishStitch(true);$('switchDiscard').onclick=()=>finishStitch(false);$('switchCancel').onclick=()=>$('stitchDialog').close();

$('paletteSort').onchange=()=>{render();$('swatches').scrollTop=0};

$('paletteFlat').onchange=$('paletteTexture').onchange=()=>render();
