const form=document.querySelector("#patch-form");
const fileInput=document.querySelector("#swf-file");
const dropzone=document.querySelector("#dropzone");
const statusBox=document.querySelector("#status");
const submitButton=document.querySelector("#submit-button");
const injectActions=document.querySelector("#inject-actions");
const injectButton=document.querySelector("#inject-button");
const injectNote=document.querySelector("#inject-note");
const childUrlInput=document.querySelector("#child-url");
let lastParentFile=null;
let lastAnalysis=null;

function setStatus(title,detail,type=""){
  statusBox.className="status "+type;
  statusBox.querySelector("b").textContent=title;
  statusBox.querySelector("p").textContent=detail;
}
function showFile(file){
  if(!file)return;
  lastParentFile=null;
  lastAnalysis=null;
  injectActions.hidden=true;
  injectNote.textContent="Analyze the newly selected parent before attempting injection.";
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

function showLoaderChoice(runtime){
  const panel=document.querySelector("#loader-choice");
  const select=document.querySelector("#runtime-choice");
  const link=document.querySelector("#loader-source");
  const note=document.querySelector("#loader-choice-note");
  if(!panel||!select||!link||!note)return;
  panel.hidden=false;
  if(runtime==="AVM1"||runtime==="AVM2"){
    select.value=runtime;
    select.disabled=true;
    note.textContent=runtime+" was detected from the SWF's ActionScript markers. The matching source is selected.";
  }else{
    select.value="AVM1";
    select.disabled=false;
    note.textContent="No decisive runtime marker was found. Choose the runtime used by your project.";
  }
  childUrlInput.value=runtime==="AVM2" ? "./TestPanel-AVM2.swf" : "./TestPanel-AVM1.swf";
  updateLoaderLink();
}
function updateLoaderLink(){
  const select=document.querySelector("#runtime-choice");
  const link=document.querySelector("#loader-source");
  if(!select||!link)return;
  const avm=select.value;
  link.href=avm==="AVM2"
    ? "https://github.com/sspeth000/shockwaveflash_executor-Bash-v1.0.0/blob/main/loader/avm2/ExternalSwfLoader.as"
    : "https://github.com/sspeth000/shockwaveflash_executor-Bash-v1.0.0/blob/main/loader/avm1/ExternalSwfLoader.as";
  link.textContent="Open "+avm+" loader source";
}
document.querySelector("#runtime-choice")?.addEventListener("change",updateLoaderLink);

function readBits(bytes,state,count){
  let value=0;
  for(let i=0;i<count;i++){
    const byte=bytes[state.bit>>3];
    if(byte===undefined)throw new Error("Unexpected end of SWF RECT header.");
    value=(value<<1)|((byte>>(7-(state.bit&7)))&1);
    state.bit++;
  }
  return value;
}
function readSignedBits(bytes,state,count){
  const value=readBits(bytes,state,count);
  return value&(1<<(count-1)) ? value-(2**count) : value;
}
async function getUncompressedBody(buffer,signature){
  const bytes=new Uint8Array(buffer);
  if(signature==="FWS")return bytes.subarray(8);
  if(signature==="ZWS")throw new Error("ZWS/LZMA files are not supported yet. Try an FWS or CWS file.");
  if(typeof DecompressionStream==="undefined")throw new Error("This browser lacks the decompression API required for CWS files. Try an FWS file.");
  const stream=new Blob([bytes.subarray(8)]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
const TAG_NAMES={
  0:"End",1:"ShowFrame",2:"DefineShape",4:"PlaceObject",5:"RemoveObject",
  6:"DefineBits",7:"DefineButton",8:"JPEGTables",9:"SetBackgroundColor",
  10:"DefineFont",11:"DefineText",12:"DoAction",13:"DefineFontInfo",
  14:"DefineSound",15:"StartSound",18:"SoundStreamHead",19:"SoundStreamBlock",
  20:"DefineBitsLossless",21:"DefineBitsJPEG2",22:"DefineShape2",24:"Protect",
  26:"PlaceObject2",28:"RemoveObject2",32:"DefineShape3",33:"DefineText2",
  34:"DefineButton2",35:"DefineBitsJPEG3",36:"DefineBitsLossless2",
  37:"DefineEditText",39:"DefineSprite",43:"FrameLabel",46:"DefineMorphShape",
  48:"DefineFont2",56:"ExportAssets",57:"ImportAssets",59:"DoInitAction",
  60:"DefineVideoStream",61:"VideoFrame",62:"DefineFontInfo2",69:"FileAttributes",
  70:"PlaceObject3",71:"ImportAssets2",73:"DefineFontAlignZones",
  74:"CSMTextSettings",75:"DefineFont3",76:"SymbolClass",77:"Metadata",
  78:"DefineScalingGrid",72:"DoABCDefine",82:"DoABC",83:"DefineShape4",87:"DefineBinaryData",
  88:"DefineFontName",89:"StartSound2",90:"DefineBitsJPEG4",91:"DefineFont4"
};
function parseTagStream(bytes,start=0,end=bytes.length,depth=0,stats){
  let offset=start;
  const tags=[];
  while(offset<end){
    if(offset+2>end)throw new Error("Truncated SWF tag record header.");
    const record=bytes[offset]|(bytes[offset+1]<<8);
    offset+=2;
    const code=record>>>6;
    let length=record&63;
    if(length===63){
      if(offset+4>end)throw new Error("Truncated long SWF tag length.");
      length=new DataView(bytes.buffer,bytes.byteOffset+offset,4).getUint32(0,true);
      offset+=4;
    }
    if(offset+length>end)throw new Error("A SWF tag extends beyond its containing timeline.");
    const payload=bytes.subarray(offset,offset+length);
    offset+=length;
    stats.total++;
    if(stats.total>1000000)throw new Error("The file contains an unreasonable number of tags.");
    const name=TAG_NAMES[code]||("Tag "+code);
    stats.counts[name]=(stats.counts[name]||0)+1;
    if(code===12)stats.doAction++;
    if(code===59)stats.doInitAction++;
    if(code===72 || code===82)stats.doABC++;
    if(code===69 && length>=4){
      const flags=new DataView(payload.buffer,payload.byteOffset,4).getUint32(0,true);
      stats.fileAttributesFlags=flags;
      if(flags & 0x08)stats.as3Flag=true;
    }
    if(code===39){
      stats.sprites++;
      if(length<4)throw new Error("A DefineSprite tag is too short.");
      if(depth>=32)throw new Error("Sprite nesting exceeds the parser safety limit.");
      const spriteId=new DataView(payload.buffer,payload.byteOffset,4).getUint16(0,true);
      const spriteFrames=new DataView(payload.buffer,payload.byteOffset,4).getUint16(2,true);
      const nested=parseTagStream(payload,4,payload.length,depth+1,stats);
      tags.push({code,name,length,spriteId,spriteFrames,nested});
    }else{
      tags.push({code,name,length});
    }
    if(code===0){stats.endTags++;break;}
  }
  return tags;
}
async function inspectSwf(file){
  const buffer=await file.arrayBuffer();
  if(buffer.byteLength<8)throw new Error("The file is too small to contain a SWF header.");
  const bytes=new Uint8Array(buffer);
  const signature=String.fromCharCode(...bytes.subarray(0,3));
  if(!["FWS","CWS","ZWS"].includes(signature))throw new Error("Invalid SWF signature. Expected FWS, CWS, or ZWS.");
  const version=bytes[3];
  const declaredLength=new DataView(buffer).getUint32(4,true);
  if(declaredLength<8||declaredLength>250*1024*1024)throw new Error("The declared uncompressed SWF size is invalid or exceeds the 250 MB safety limit.");
  const body=await getUncompressedBody(buffer,signature);
  if(body.length+8!==declaredLength)throw new Error("The SWF length field does not match the decoded file size.");
  const state={bit:0};
  const nbits=readBits(body,state,5);
  const xMin=readSignedBits(body,state,nbits);
  const xMax=readSignedBits(body,state,nbits);
  const yMin=readSignedBits(body,state,nbits);
  const yMax=readSignedBits(body,state,nbits);
  const rectBytes=Math.ceil(state.bit/8);
  if(body.length<rectBytes+4)throw new Error("Incomplete SWF frame header.");
  const frameView=new DataView(body.buffer,body.byteOffset+rectBytes,4);
  const frameRate=frameView.getUint16(0,true)/256;
  const frameCount=frameView.getUint16(2,true);
  const stats={total:0,counts:{},doAction:0,doInitAction:0,doABC:0,sprites:0,endTags:0,as3Flag:false,fileAttributesFlags:null};
  const tags=parseTagStream(body,rectBytes+4,body.length,0,stats);
  const rootCounts={};
  for(const tag of tags)rootCounts[tag.name]=(rootCounts[tag.name]||0)+1;
  const avm2Detected=stats.doABC>0 || stats.as3Flag;
  const avm1Detected=!avm2Detected && (stats.doAction>0 || stats.doInitAction>0);
  const runtime=avm2Detected ? "AVM2" : avm1Detected ? "AVM1" : "unknown";
  const runtimeReason=stats.doABC>0
    ? "DoABC / DoABCDefine bytecode tag"
    : stats.as3Flag
      ? "FileAttributes AS3 flag"
      : avm1Detected
        ? "DoAction / DoInitAction tags"
        : "no decisive ActionScript runtime marker";
  return {
    signature,version,declaredLength,frameRate,frameCount,
    width:(xMax-xMin)/20,height:(yMax-yMin)/20,
    rootTagCount:tags.length,totalTagCount:stats.total,
    doAction:stats.doAction,doInitAction:stats.doInitAction,doABC:stats.doABC,
    sprites:stats.sprites,endTags:stats.endTags,counts:stats.counts,rootCounts,
    as3Flag:stats.as3Flag,fileAttributesFlags:stats.fileAttributesFlags,
    runtime,runtimeReason
  };
}
form.addEventListener("submit",async e=>{
  e.preventDefault();
  const file=fileInput.files[0];
  if(!file)return setStatus("Choose a file","Select the parent SWF first.","error");
  if(!file.name.toLowerCase().endsWith(".swf"))return setStatus("Unsupported file","Only .swf files are accepted.","error");
  if(file.size>100*1024*1024)return setStatus("File too large","The current browser-side limit is 100 MB.","error");
  submitButton.disabled=true;
  submitButton.textContent="Analyzing in browser…";
  setStatus("Reading SWF locally","The file stays in this browser. Parsing the header and nested timelines.");
  try{
    const r=await inspectSwf(file);
    lastParentFile=file;
    lastAnalysis=r;
    injectActions.hidden=false;
    injectNote.textContent="Ready for a local preflight. No changes have been made to the selected SWF.";
    const actionText=r.runtime==="AVM2" ? "AVM2 detected." : r.runtime==="AVM1" ? "AVM1 detected." : "Runtime is ambiguous; choose a loader manually.";
    const details=r.signature+" · SWF "+r.version+" · "+r.width.toFixed(0)+" × "+r.height.toFixed(0)+" px · "+r.frameRate.toFixed(2)+" FPS · "+r.frameCount+" root frames · "+r.rootTagCount+" root tags · "+r.totalTagCount+" total tags including sprites. "+r.sprites+" sprites. "+actionText+" Evidence: "+r.runtimeReason+". DoAction: "+r.doAction+" · DoInitAction: "+r.doInitAction+" · DoABC: "+r.doABC+".";
    const top=Object.entries(r.rootCounts).slice(0,7).map(([name,count])=>name+": "+count).join(", ");
    showLoaderChoice(r.runtime);
    setStatus("SWF analyzed successfully",details+" Root tags: "+top+". The matching loader source is selected automatically when detection is conclusive. Injection and output generation are not enabled yet.","good");
  }catch(error){
    setStatus("Could not analyze SWF",error.message||"Unknown parsing error.","error");
  }finally{
    submitButton.disabled=false;
    submitButton.innerHTML="Analyze SWF in browser <span>↗</span>";
  }
});


/*
 * Injection preflight.
 * This intentionally does not fabricate bytecode. The parent loader .as
 * sources must be compiled for the selected AVM before a real tag injection
 * can be performed. A future compiler integration can be connected here.
 */
injectButton.addEventListener("click",async()=>{
  if(!lastParentFile || !lastAnalysis){
    setStatus("Analyze a parent first","Select and analyze the parent SWF before attempting injection.","error");
    return;
  }

  const runtime=document.querySelector("#runtime-choice").value;
  const detected=lastAnalysis.runtime;
  const childUrl=childUrlInput.value.trim();
  const loaderPath=runtime==="AVM2"
    ? "loader/avm2/ExternalSwfLoader.as"
    : "loader/avm1/ExternalSwfLoader.as";
  const childName=runtime==="AVM2"
    ? "TestPanel-AVM2.swf"
    : "TestPanel-AVM1.swf";

  injectButton.disabled=true;
  injectButton.textContent="Checking injection requirements…";
  setStatus("Preparing injection attempt","Checking runtime compatibility, parent structure, and loader prerequisites.");

  try{
    if(detected!=="unknown" && detected!==runtime){
      throw new Error("Runtime mismatch: the parent was detected as "+detected+", but "+runtime+" was selected. The parent was not modified.");
    }
    if(!childUrl){
      throw new Error("Enter the URL or relative path of the separate "+childName+" child SWF.");
    }
    if(lastAnalysis.signature==="ZWS"){
      throw new Error("ZWS/LZMA parents are not supported by this browser build. The parent was not modified.");
    }
    if(!lastAnalysis.endTags){
      throw new Error("The parent timeline has no recognized End tag. Safe tag insertion cannot be attempted.");
    }

    const compiler=globalThis.BashSwfCompiler;
    if(!compiler || typeof compiler.compileLoader!=="function"){
      injectNote.textContent="Preflight stopped: no in-browser ActionScript compiler is connected yet.";
      throw new Error(
        "Preflight passed for "+runtime+" and selected "+loaderPath+
        ", with child "+childUrl+". Injection stopped because this page has no compatible in-browser ActionScript compiler/bytecode adapter. The .as source cannot be inserted directly. No bytes were changed and no output file was created."
      );
    }

    // Compiler integrations must explicitly return a bytecode payload and a
    // tag-injection adapter. Never accept source text as compiled bytecode.
    const compiled=await compiler.compileLoader({runtime,sourcePath:loaderPath,childUrl});
    if(!compiled || !(compiled.bytecode instanceof Uint8Array) || typeof compiler.injectIntoParent!=="function"){
      throw new Error("The compiler integration did not return a valid bytecode payload and parent injection adapter. No output was created.");
    }

    const output=await compiler.injectIntoParent({
      parentFile:lastParentFile,
      parentAnalysis:lastAnalysis,
      runtime,
      bytecode:compiled.bytecode,
      childUrl
    });
    if(!(output instanceof Blob) || output.size===0){
      throw new Error("The injection adapter did not return a non-empty SWF Blob. No download was created.");
    }

    const outputName=lastParentFile.name.replace(/\.swf$/i,"")+"[execinstalled].swf";
    const objectUrl=URL.createObjectURL(output);
    const anchor=document.createElement("a");
    anchor.href=objectUrl;
    anchor.download=outputName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
    injectNote.textContent="Injection adapter returned a SWF. Download requested: "+outputName;
    setStatus("Injection adapter completed","The compiler integration returned a patched SWF download. Test it in the target player before relying on it.","good");
  }catch(error){
    setStatus("Injection attempt stopped",error.message||"Unknown injection error.","error");
  }finally{
    injectButton.disabled=false;
    injectButton.innerHTML="Attempt loader injection <span>↗</span>";
  }
});
