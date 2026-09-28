'use strict';
// A browser-local working copy, independent of downloadable pattern/stock files.
const AUTOSAVE_KEY='beads-atelier.workspace.v1';
let autosaveReady=false,autosaveTimer=null,autosavePending=false,autosaveLast='';
function autosaveMessage(message){document.getElementById('autosaveStatus').textContent=message}
function workspaceDocument(){return {version:1,pattern:patternDocument(),stock:inventoryDocument(),view:{selected,zoom,rotation:viewRotation,symbols:$('symbols').checked,texture:$('texture').checked,paletteTexture:$('paletteTexture').checked,sort:$('paletteSort').value}}}
function queueAutosave(){
 if(!autosaveReady)return;
 autosavePending=true;clearTimeout(autosaveTimer);
 autosaveMessage('ブラウザーに保存中…');
 autosaveTimer=setTimeout(flushAutosave,300);
}
function flushAutosave(){
 if(!autosaveReady)return false;
 clearTimeout(autosaveTimer);
 if(!autosavePending)return true;
 try{
  const state=workspaceDocument();validate(state.pattern);validateInventoryDocument(state.stock);
  const text=JSON.stringify(state);
  if(text!==autosaveLast)localStorage.setItem(AUTOSAVE_KEY,text);
  autosaveLast=text;autosavePending=false;
  autosaveMessage('ブラウザーに自動保存済み');return true;
 }catch{
  autosaveMessage('自動保存できません。図案・倉庫をファイルに保存してください');return false;
 }
}
function initializeAutosave(){
 let failed=false,restored=false;
 try{
  const raw=localStorage.getItem(AUTOSAVE_KEY);
  if(raw!==null){
   const state=JSON.parse(raw);
   if(state?.version!==1)throw Error('Unknown workspace');
   // Recover each independent document even if the other is damaged.
   try{
    const pattern=validate(state.pattern);
    ({cols,rows,cells,palette,stitchMode}=pattern);$('title').value=pattern.title;
    selected=palette[0]?.id||null;restored=true;
   }catch{failed=true}
   try{inventory=validateInventoryDocument(state.stock);restored=true}catch{failed=true}
   const v=state.view||{};
   if(palette.some(p=>p.id===v.selected))selected=v.selected;
   if(Number.isFinite(v.zoom)&&v.zoom>=.5&&v.zoom<=2.5)zoom=v.zoom;
   if([0,90,180,270].includes(v.rotation))viewRotation=v.rotation;
   for(const id of ['symbols','texture','paletteTexture'])if(typeof v[id]==='boolean')$(id).checked=v[id];
   $('paletteFlat').checked=!$('paletteTexture').checked;
   if([...$('paletteSort').options].some(o=>o.value===v.sort))$('paletteSort').value=v.sort;
   if(!failed)autosaveLast=JSON.stringify(workspaceDocument());
  }
 }catch{failed=true}
 sync();$('zoom').textContent=Math.round(zoom*100)+'%';$('rotationAngle').textContent=viewRotation+'°';render();inspect(0,0);
 refreshFileDirty();autosaveReady=true;
 autosaveMessage(failed?'自動保存データを復元できませんでした。ファイルから読み込んでください':restored?'前回の作業を復元しました':'作業はこのブラウザーに自動保存されます');
 // Do not overwrite unreadable data merely by opening or closing the page.
 for(const id of ['symbols','texture','paletteFlat','paletteTexture','paletteSort'])$(id).addEventListener('change',queueAutosave);
 for(const id of ['minus','plus','rotateLeft','rotateRight','swatches'])$(id).addEventListener('click',queueAutosave);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushAutosave()});
 window.addEventListener('pagehide',flushAutosave);
}
