const input=document.querySelector("#swf-file");
const dropzone=document.querySelector("#dropzone");
const row=document.querySelector("#file-row");
const patchButton=document.querySelector("#patch-button");
const status=document.querySelector("#status");
let selected=null;
const MAX_SIZE=100*1024*1024;
function formatSize(bytes){if(bytes<1024)return bytes+" B";if(bytes<1024*1024)return (bytes/1024).toFixed(1)+" KB";return (bytes/1024/1024).toFixed(1)+" MB";}
function setFile(file){
  if(!file)return;
  if(!file.name.toLowerCase().endsWith(".swf")){status.textContent="That file does not have a .swf extension.";return;}
  if(file.size===0||file.size>MAX_SIZE){status.textContent="Choose a non-empty SWF smaller than 100 MB.";return;}
  selected=file;
  document.querySelector("#file-name").textContent=file.name;
  document.querySelector("#file-size").textContent=formatSize(file.size);
  row.classList.remove("hidden");
  dropzone.classList.add("hidden");
  patchButton.disabled=false;
  status.textContent="SWF selected. The processing backend is not connected yet.";
}
input.addEventListener("change",()=>setFile(input.files?.[0]));
for(const eventName of ["dragenter","dragover"])dropzone.addEventListener(eventName,e=>{e.preventDefault();dropzone.classList.add("dragover");});
for(const eventName of ["dragleave","drop"])dropzone.addEventListener(eventName,e=>{e.preventDefault();dropzone.classList.remove("dragover");});
dropzone.addEventListener("drop",e=>setFile(e.dataTransfer?.files?.[0]));
document.querySelector("#remove-file").addEventListener("click",()=>{selected=null;input.value="";row.classList.add("hidden");dropzone.classList.remove("hidden");patchButton.disabled=true;status.textContent="Select a SWF to begin.";});
patchButton.addEventListener("click",()=>{if(!selected)return;status.textContent="Upload UI is ready, but no decompiler/compiler service is configured. No file has been changed.";});
