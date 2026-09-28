'use strict';
// Pattern and stock are saved and loaded independently.
function patternDocument(){const {inventory:stock,...pattern}=JSON.parse(snapshot());return {format:'delica-atelier',version:4,...pattern}}
function inventoryDocument(){return {format:'delica-inventory',version:1,inventory:JSON.parse(JSON.stringify(inventory))}}
let savedPattern=JSON.stringify(patternDocument()),savedInventory=JSON.stringify(inventoryDocument());
function refreshFileDirty(){dirty=JSON.stringify(patternDocument())!==savedPattern||JSON.stringify(inventoryDocument())!==savedInventory}
function downloadDocument(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function validateInventoryDocument(o){
 if(o?.format==='delica-atelier'){validate(o);if(!Array.isArray(o.inventory))throw Error('倉庫情報を含まない図案です');}
 else if(o?.format!=='delica-inventory'||o.version!==1)throw Error('ビーズ倉庫のファイルを選んでください');
 validateInventory(o.inventory);return o.inventory.map(({code,amount})=>({code,amount}));
}
async function readDocument(file){
 if(file.size>2000000)throw Error('ファイルが大きすぎます');
 return JSON.parse(await file.text());
}
function importPattern(o){validate(o);record();const {inventory:stock,...pattern}=o;restore(JSON.stringify({...pattern,inventory}));savedPattern=JSON.stringify(patternDocument());refreshFileDirty();status('図案を読み込みました。ビーズ倉庫は変更していません');}
function importInventory(o){const next=validateInventoryDocument(o);record();inventory=next;render();queueAutosave();savedInventory=JSON.stringify(inventoryDocument());refreshFileDirty();catalogPage=1;renderCatalog();$('catalogFeedback').textContent='ビーズ倉庫 '+inventory.length+'品番を読み込みました。図案は変更していません。';}
function savePatternFile(){try{
 const pattern=patternDocument();
 downloadDocument(new Blob([JSON.stringify(pattern,null,2)],{type:'application/json'}),(pattern.stitchMode==='P'?'半目ずらし':'格子')+'_'+($('title').value||'図案')+'.json');savedPattern=JSON.stringify(pattern);refreshFileDirty();status('図案と使用パレットを保存しました。ビーズ倉庫は専用画面で保存してください');
 return true;}catch{status('保存できませんでした。もう一度お試しください');return false}}
$('save').onclick=savePatternFile;
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=await readDocument(f,'pattern');validate(o);if(dirty&&!confirm('図案を読み込みます。未保存の図案の変更は置き換わります。ビーズ倉庫は変更しません。'))return;importPattern(o)}catch(error){status('読み込めませんでした。図案JSONを選んでください。')}finally{e.target.value=''}};
$('loadInventory').onclick=()=>$('inventoryFile').click();
$('saveInventory').onclick=()=>{downloadDocument(new Blob([JSON.stringify(inventoryDocument(),null,2)],{type:'application/json'}),'ビーズ倉庫.json');savedInventory=JSON.stringify(inventoryDocument());refreshFileDirty();$('catalogFeedback').textContent='ビーズ倉庫をJSONファイルに保存しました。';};
$('inventoryFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=await readDocument(f,'inventory');validateInventoryDocument(o);if(inventory.length&&!confirm('現在の倉庫リストを、ファイルの内容で置き換えます。図案は変更しません。'))return;importInventory(o)}catch(error){$('catalogFeedback').textContent='読み込めませんでした。倉庫JSON、または倉庫情報を含む旧図案JSONを選んでください。'}finally{e.target.value=''}};
