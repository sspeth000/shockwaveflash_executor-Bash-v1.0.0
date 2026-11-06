const form=document.querySelector("#patch-form");
const fileInput=document.querySelector("#swf-file");
const dropzone=document.querySelector("#dropzone");
const statusBox=document.querySelector("#status");
const submitButton=document.querySelector("#submit-button");

function setStatus(title,detail,type=""){
  statusBox.className="status "+type;
  statusBox.querySelector("b").textContent=title;
  statusBox.querySelector("p").textContent=detail;
}
function showFile(file){
  if(!file)return;
  document.querySelector("#file-name").textContent=file.name;
  document.querySelector("#file-meta").textContent=(file.size/1048576).toFixed(2)+" MB · selected";
}
fileInput.addEventListener("change",()=>showFile(fileInput.files[0]));
for(const name of ["dragenter","dragover"])dropzone.addEventListener(name,e=>{e.preventDefault();dropzone.classList.add("dragging")});
for(const name of ["dragleave","drop"])dropzone.addEventListener(name,e=>{e.preventDefault();dropzone.classList.remove("dragging")});
dropzone.addEventListener("drop",e=>{
  const file=e.dataTransfer.files[0];
  if(!file)return;
  const transfer=new DataTransfer();
  transfer.items.add(file);
  fileInput.files=transfer.files;
  showFile(file);
});

function readBits(bytes, state, count){
  let value=0;
  for(let i=0;i<count;i++){
    const byte=bytes[state.bit>>3];
    if(byte===undefined)throw new Error("Unexpected end of SWF header.");
    value=(value<<1)|((byte>>(7-(state.bit&7)))&1);
    state.bit++;
  }
  return value;
}
async function getUncompressedBody(buffer, signature){
  const bytes=new Uint8Array(buffer);
  if(signature==="FWS")return bytes.subarray(8);
  if(signature==="ZWS")throw new Error("ZWS/LZMA files are not supported by this browser build yet. Try an FWS or CWS file.");
  if(typeof DecompressionStream==="undefined")throw new Error("This browser does not support the built-in decompression API needed for CWS files. Try an FWS file.");
  const stream=new Blob([bytes.subarray(8)]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function inspectSwf(file){
  const buffer=await file.arrayBuffer();
  if(buffer.byteLength<8)throw new Error("The file is too small to contain a SWF header.");
  const bytes=new Uint8Array(buffer);
  const signature=String.fromCharCode(...bytes.subarray(0,3));
  if(!["FWS","CWS","ZWS"].includes(signature))throw new Error("Invalid SWF signature. Expected FWS, CWS, or ZWS.");
  const view=new DataView(buffer);
  const version=bytes[3];
  const declaredLength=view.getUint32(4,true);
  if(declaredLength<8||declaredLength>250*1024*1024)throw new Error("The declared uncompressed SWF size is invalid or exceeds the 250 MB safety limit.");
  const body=await getUncompressedBody(buffer,signature);
  if(body.length+8!==declaredLength)throw new Error("The SWF length field does not match the decoded file size. The file may be damaged or use an unsupported compression variant.");

  const bitState={bit:0};
  const nbits=readBits(body,bitState,5);
  const rectBits=5+nbits*4;
  const rectBytes=Math.ceil(rectBits/8);
  if(body.length<rectBytes+4)throw new Error("Incomplete SWF frame header.");
  const rectState={bit:0};
  const xMin=readBits(body,rectState,nbits);
  const xMax=readBits(body,rectState,nbits);
  const yMin=readBits(body,rectState,nbits);
  const yMax=readBits(body,rectState,nbits);
  const frameView=new DataView(body.buffer,body.byteOffset+rectBytes,4);
  const frameRate=frameView.getUint16(0,true)/256;
  const frameCount=frameView.getUint16(2,true);
  let offset=rectBytes+4;
  const tags=[];
  let hasDoABC=false,hasABC=false,hasSymbolClass=false,ended=false;
  while(offset<body.length){
    if(offset+2>body.length)throw new Error("Truncated SWF tag header.");
    const record=body[offset]|(body[offset+1]<<8);
    offset+=2;
    const code=record>>6;
    let length=record&63;
    if(length===63){
      if(offset+4>body.length)throw new Error("Truncated long SWF tag header.");
      length=new DataView(body.buffer,body.byteOffset+offset,4).getUint32(0,true);
      offset+=4;
    }
    if(offset+length>body.length)throw new Error("A SWF tag extends beyond the end of the file.");
    tags.push({code,length});
    if(code===82)hasDoABC=true;
    if(code===72)hasABC=true;
    if(code===76)hasSymbolClass=true;
    offset+=length;
    if(code===0){ended=true;break;}
    if(tags.length>1000000)throw new Error("The file contains an unreasonable number of SWF tags.");
  }
  const names=new Map([[0,"End"],[1,"ShowFrame"],[9,"SetBackgroundColor"],[12,"DoAction"],[26,"PlaceObject2"],[28,"RemoveObject2"],[39,"DefineSprite"],[43,"FrameLabel"],[56,"ExportAssets"],[69,"FileAttributes"],[72,"DoABC"],[76,"SymbolClass"],[82,"DoABCDefine"],[87,"DefineBinaryData"],[90,"Define出来?"]]);
  const counts={};
  for(const tag of tags){const name=names.get(tag.code)||("Tag "+tag.code);counts[name]=(counts[name]||0)+1;}
  return {
    signature,version,declaredLength,frameRate,frameCount,
    width:Math.max(0,xMax-xMin)/20,height:Math.max(0,yMax-yMin)/20,
    tagCount:tags.length,hasDoABC,hasABC,hasSymbolClass,ended,counts
  };
}
form.addEventListener("submit",async e=>{
  e.preventDefault();
  const file=fileInput.files[0];
  if(!file)return setStatus("Choose a file","Select the parent SWF first.","error");
  if(!file.name.toLowerCase().endsWith(".swf"))return setStatus("Unsupported file","Only .swf files are accepted.","error");
  if(file.size>100*1024*1024)return setStatus("File too large","The current browser-side upload limit is 100 MB.","error");
  submitButton.disabled=true;
  submitButton.textContent="Analyzing in browser…";
  setStatus("Reading SWF locally","No file is being uploaded. Parsing the SWF header and tag stream in this browser.");
  try{
    const result=await inspectSwf(file);
    const tagSummary=Object.entries(result.counts).slice(0,8).map(([name,count])=>name+": "+count).join(", ");
    const details=result.signature+" · SWF "+result.version+" · "+result.width.toFixed(0)+" × "+result.height.toFixed(0)+" px · "+result.frameRate.toFixed(2)+" FPS · "+result.frameCount+" frames · "+result.tagCount+" tags. "+(result.hasDoABC?"AVM2 DoABC bytecode found. ":result.hasABC?"AVM1 ActionScript bytecode found. ":"No ActionScript bytecode tag detected. ")+(result.ended?"End tag present. ":"End tag missing. ")+"Tags: "+tagSummary+".";
    setStatus("SWF analyzed successfully",details+" Browser-only inspection is working. Loader injection is not enabled yet: this build still needs a compiled AS3 bootstrap payload and a safe bytecode-injection step. No output file was fabricated.","good");
  }catch(error){
    setStatus("Could not analyze SWF",error.message||"Unknown parsing error.","error");
  }finally{
    submitButton.disabled=false;
    submitButton.innerHTML="Analyze SWF in browser <span>↗</span>";
  }
});
