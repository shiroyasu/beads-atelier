'use strict';
let catalogTarget=null, catalogPage=1;
let catalogOwned=false;
const CATALOG_PAGE_SIZE=30;
function resetCatalogPage(){catalogPage=1;renderCatalog()}
function changeCatalogPage(page){catalogPage=page;renderCatalog();$('catalogPagination').scrollIntoView({block:'nearest'});}
const activeFinishes=new Set();
const normalizeSearch=s=>s.normalize('NFKC').toLowerCase().replace(/db[-\s]*0*(\d+)/g,'db$1').replace(/\s+/g,'');
function textNode(tag,value,className){const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e}
function updatePaletteControls(){$('ownedCount').textContent='('+inventory.length+')';const p=bead(selected);$('adjustLabel').textContent=p?p.code+' / '+p.name:'色を選択してください';$('adjustValue').disabled=!p;$('adjustValue').value=p?.color||'#000000';$('resetApprox').disabled=!catalogRecord(p);}
function useCatalogBead(code,mode='add',targetId=catalogTarget){
 const item=catalogBeads.find(b=>b.code===code);if(!item)return false;
 const existing=palette.find(p=>p.catalogCode===code),target=bead(targetId);
 if(mode==='replace'&&!target){$('catalogFeedback').textContent='置き換える色をパレットで選んでから、カタログを開いてください。';return false}
 if(mode==='add'&&existing){selected=existing.id;setTool('paint');render();renderCatalog();$('catalogFeedback').textContent=code+'は追加済みです。描く色に選択しました。';return true}
 if(mode==='add'&&palette.length>=64){$('catalogFeedback').textContent='作品のパレットは64色までです。不要な色を削除してください。';return false}
 if(mode==='replace'&&existing?.id===targetId){$('catalogFeedback').textContent='すでにこの品番が選択されています。';return false}
 record();
 if(mode==='replace'&&existing){
  cells=cells.map(row=>row.map(id=>id===targetId?existing.id:id));palette=palette.filter(p=>p.id!==targetId);selected=existing.id;
 }else{
  const entry={id:mode==='replace'?targetId:'catalog-'+code,code:item.code,name:item.color_name||'カラー名未確認',color:item.color,catalogCode:item.code};
  if(mode==='replace')palette=palette.map(p=>p.id===targetId?entry:p);else palette.push(entry);
  selected=entry.id;
 }
 clipboard=null;setTool('paint');changed(code+(mode==='replace'?'に置き換えました':'をパレットに追加しました')+' — 保存してください');renderCatalog();
 $('catalogFeedback').textContent=code+'を追加しました。閉じると図案に描けます。';
 if(mode==='replace')$('catalogDialog').close();
 return true;
}
function matchingCatalog(){const query=normalizeSearch($('catalogSearch').value.trim());return catalogBeads.filter(b=>(!catalogOwned||inventory.some(item=>item.code===b.code))&&(!query||normalizeSearch(b.code+' '+b.color_name+' '+b.color_family+' '+b.tags.join(' ')).includes(query))&&(!$('familyFilter').value||[b.color_family,b.secondary_color_family].includes($('familyFilter').value))&&(!$('glassFilter').value||b.base_glass===$('glassFilter').value)&&[...activeFinishes].every(t=>b.tags.includes(t))).sort((a,b)=>a.number-b.number||a.code.localeCompare(b.code));}
function renderCatalog(){
 $('inventoryFiles').hidden=!catalogOwned;
 $('catalogTitle').textContent=catalogOwned?'ビーズ倉庫':'実際のビーズから選ぶ';
 $('catalogIntro').textContent=catalogOwned?'量はプルダウンで変更できます。「倉庫を保存」で単独保存、図案とは別のファイルになります。':'図案づくりの参考として、MIYUKIデリカビーズのカタログから色を追加できます。表示色・質感は目安で、実物とは異なります。本アプリはMIYUKIの公式アプリではありません。';
 const results=matchingCatalog(),pages=Math.max(1,Math.ceil(results.length/CATALOG_PAGE_SIZE));
 catalogPage=Math.max(1,Math.min(catalogPage,pages));
 const start=(catalogPage-1)*CATALOG_PAGE_SIZE;
 $('catalogResults').replaceChildren();$('catalogCount').textContent=results.length?`${results.length}品番中 ${start+1}–${Math.min(start+CATALOG_PAGE_SIZE,results.length)}件（${catalogOwned?'倉庫':'登録済み'} ${catalogOwned?inventory.length:catalogBeads.length}品番）`:`0件（${catalogOwned?'倉庫':'登録済み'} ${catalogOwned?inventory.length:catalogBeads.length}品番）`;
 const nav=$('catalogPagination');nav.replaceChildren();
 const pageButton=(label,page,disabled=false)=>{const b=textNode('button',label);b.type='button';b.disabled=disabled;b.onclick=()=>changeCatalogPage(page);return b};
 nav.append(pageButton('前へ',catalogPage-1,catalogPage===1));
 for(let page=1;page<=pages;page++){const b=pageButton(String(page),page);b.setAttribute('aria-label',page+'ページ');if(page===catalogPage){b.setAttribute('aria-current','page');b.className='primary'}nav.append(b)}
 nav.append(pageButton('次へ',catalogPage+1,catalogPage===pages));
 nav.hidden=!results.length;
 const target=bead(catalogTarget),replacing=$('catalogAction').value==='replace';
 $('replaceSummary').textContent=replacing?(target?target.code+' / '+cells.flat().filter(id=>id===target.id).length+'粒をまとめて置換':'対象の色が未選択です'):'選んだビーズを作品のパレットに追加';
 if(!results.length){$('catalogResults').append(textNode('p',catalogOwned&&!inventory.length?'ビーズ倉庫はまだありません。「カタログから選ぶ」で倉庫に追加してください。':'条件に合うビーズはありません。条件を減らしてお試しください。','catalog-empty'));return}
 results.slice(start,start+CATALOG_PAGE_SIZE).forEach(b=>{
  const card=document.createElement('article');card.className='bead-card';
  const previews=document.createElement('div');previews.className='bead-previews';
  const flat=document.createElement('div');flat.className='flat-preview';flat.style.backgroundColor=b.color;flat.title='代表色 '+b.color;
  const bitmap=document.createElement('img');bitmap.loading='lazy';bitmap.decoding='async';bitmap.src=b.bitmap;bitmap.alt=b.code+'の模式的な質感見本';bitmap.width=80;bitmap.height=80;
  previews.append(flat,bitmap);card.append(previews,textNode('h3',b.code),textNode('p',b.color_name||'カラー名未確認','catalog-color-name'));
  const tags=document.createElement('div');tags.className='bead-tags';const familyTag=textNode('span',b.color_family,'family-tag');tags.append(familyTag);[...new Set(b.tags)].forEach(t=>tags.append(textNode('span',t,'finish-tag')));card.append(tags);if(b.review_note)card.append(textNode('p',b.review_note,'review-note'));
  const link=document.createElement('a');link.href=b.product_url;link.target='_blank';link.rel='noopener';link.textContent='商品写真・説明を確認 ↗';card.append(link);
  const use=document.createElement('button');use.className='primary';const present=palette.some(p=>p.catalogCode===b.code);use.textContent=replacing?'この品番に置き換える':present?'追加済み · 描く色に選ぶ':'＋ パレットに追加';use.onclick=()=>useCatalogBead(b.code,$('catalogAction').value);card.append(use);
  const owned=inventory.find(item=>item.code===b.code),stock=document.createElement('div');stock.className='stock-controls';
  const label=textNode('label',''),amount=document.createElement('select');amount.setAttribute('aria-label',b.code+'の保有量');
  const heading=textNode('option',owned?'保有量':'追加する量');heading.disabled=true;heading.value='';const separator=textNode('option','────────');separator.disabled=true;separator.value='separator';amount.append(heading,separator);
  INVENTORY_AMOUNTS.forEach(value=>{const option=textNode('option',value);option.value=value;amount.append(option)});amount.value=owned?.amount||'3g';label.append(amount);stock.append(label);
  if(owned){amount.onchange=()=>setOwnedBead(b.code,amount.value);stock.append(textNode('span','倉庫に登録済み','stock-badge'));if(catalogOwned){const remove=textNode('button','倉庫から削除');remove.onclick=()=>removeOwnedBead(b.code);stock.append(remove)}}else{const add=textNode('button','＋ 倉庫に追加');add.onclick=()=>setOwnedBead(b.code,amount.value);stock.append(add)}
  card.append(stock);$('catalogResults').append(card);
 });
}
[...new Set(catalogBeads.flatMap(b=>[b.color_family,b.secondary_color_family]).filter(Boolean))].sort().forEach(f=>{const option=textNode('option',f);option.value=f;$('familyFilter').append(option)});
[...new Set(catalogBeads.flatMap(b=>b.tags))].sort().forEach(t=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=t;input.onchange=()=>{input.checked?activeFinishes.add(t):activeFinishes.delete(t);resetCatalogPage()};label.append(input,document.createTextNode(t));$('finishFilters').append(label)});
function openBeadCatalog(owned){if(catalogOwned!==owned){$('clearFilters').onclick();catalogPage=1}catalogOwned=owned;catalogTarget=selected;$('catalogAction').value='add';$('catalogFeedback').textContent='';renderCatalog();$('catalogDialog').showModal()}
$('openCatalog').onclick=()=>openBeadCatalog(false);
$('openOwned').onclick=()=>openBeadCatalog(true);
$('closeCatalog').onclick=()=>$('catalogDialog').close();
$('catalogDialog').addEventListener('click',e=>{if(e.target===$('catalogDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
$('catalogSearch').oninput=resetCatalogPage;$('familyFilter').onchange=resetCatalogPage;$('glassFilter').onchange=resetCatalogPage;$('catalogAction').onchange=renderCatalog;
$('clearFilters').onclick=()=>{$('catalogSearch').value='';$('familyFilter').value='';$('glassFilter').value='';activeFinishes.clear();$('finishFilters').querySelectorAll('input').forEach(i=>i.checked=false);resetCatalogPage()};
$('adjustColor').onsubmit=e=>{e.preventDefault();const p=bead(selected);if(!p)return;const color=$('adjustValue').value;if(p.color===color)return;record();p.color=color;changed('表示色を調整しました。調整色は単色で表示します — 保存してください');inspect(focusCell.c,focusCell.r)};
$('resetApprox').onclick=()=>{const p=bead(selected),b=catalogRecord(p);if(!b||p.color===b.color)return;record();p.color=b.color;changed('写真から抽出した近似色に戻しました — 保存してください');inspect(focusCell.c,focusCell.r)};
updatePaletteControls();

function setOwnedBead(code,amount){
 if(!catalogBeads.some(b=>b.code===code)||!INVENTORY_AMOUNTS.includes(amount))return false;
 const item=inventory.find(b=>b.code===code);if(item?.amount===amount)return false;
 record();if(item)item.amount=amount;else inventory.push({code,amount});
 changed('ビーズ倉庫を更新しました — 倉庫を保存してください');renderCatalog();$('catalogFeedback').textContent=code+'を倉庫に登録：'+amount+'。倉庫画面の「倉庫を保存」で保存してください。';return true;
}
function removeOwnedBead(code){if(!inventory.some(b=>b.code===code))return;record();inventory=inventory.filter(b=>b.code!==code);changed('倉庫から削除しました。「元に戻す」で復元できます');renderCatalog();$('catalogFeedback').textContent=code+'を倉庫から削除しました。'}
