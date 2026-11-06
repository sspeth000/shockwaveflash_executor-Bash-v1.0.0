import { ByteReader } from "./io/reader.js";
import { lzmaDecompress } from "./compression/lzma.js";
import { readTags, DefineSpriteTag, FileAttributesTag } from "./swf/tags.js";
import { TagCode } from "./swf/tag-codes.js";
async function inflateZlib(data) {
    if (typeof DecompressionStream === "undefined") {
        throw new Error("This browser does not provide the Decompression Streams API required for CWS files.");
    }
    const ownedBuffer = data.slice().buffer;
    const stream = new Blob([ownedBuffer]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function unpackBody(bytes, signature, declaredLength) {
    const bodyLength = declaredLength - 8;
    if (signature === "FWS") {
        if (bytes.length < declaredLength)
            throw new Error("The FWS file is shorter than its declared length.");
        return bytes.subarray(8, declaredLength);
    }
    if (signature === "CWS") {
        const body = await inflateZlib(bytes.subarray(8));
        if (body.length !== bodyLength)
            throw new Error("The decoded CWS body does not match its declared length.");
        return body;
    }
    if (signature === "ZWS") {
        if (bytes.length < 17)
            throw new Error("The ZWS header is truncated.");
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const compressedLength = view.getUint32(8, true);
        if (17 + compressedLength > bytes.length)
            throw new Error("The ZWS compressed data is truncated.");
        const props = bytes.subarray(12, 17);
        const compressed = bytes.subarray(17, 17 + compressedLength);
        return lzmaDecompress(props, compressed, bodyLength);
    }
    throw new Error("Unsupported SWF signature.");
}
export async function inspectSwfBytes(bytes) {
    if (bytes.length < 8)
        throw new Error("The file is too small to contain a SWF header.");
    const signature = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
    if (signature !== "FWS" && signature !== "CWS" && signature !== "ZWS") {
        throw new Error("Invalid SWF signature. Expected FWS, CWS, or ZWS.");
    }
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const version = bytes[3];
    const declaredLength = header.getUint32(4, true);
    if (declaredLength < 12 || declaredLength > 250 * 1024 * 1024) {
        throw new Error("The declared uncompressed SWF size is invalid or exceeds the 250 MB safety limit.");
    }
    const body = await unpackBody(bytes, signature, declaredLength);
    const reader = new ByteReader(body);
    const rectBits = reader.ub(5);
    const xMin = reader.sb(rectBits);
    const xMax = reader.sb(rectBits);
    const yMin = reader.sb(rectBits);
    const yMax = reader.sb(rectBits);
    reader.align();
    const frameRate = reader.u16() / 256;
    const frameCount = reader.u16();
    const { tags, end } = readTags(body, reader.pos, body.length);
    if (end <= reader.pos || !tags.some((tag) => tag.code === TagCode.End)) {
        throw new Error("The root timeline does not contain a complete End tag.");
    }
    const counts = {};
    const rootCounts = {};
    let totalTagCount = 0;
    let doAction = 0;
    let doInitAction = 0;
    let doABC = 0;
    let sprites = 0;
    let endTags = 0;
    let as3Flag = false;
    let fileAttributesFlags = null;
    const visit = (items, root = false) => {
        for (const tag of items) {
            totalTagCount++;
            counts[tag.name] = (counts[tag.name] || 0) + 1;
            if (root)
                rootCounts[tag.name] = (rootCounts[tag.name] || 0) + 1;
            if (tag.code === TagCode.DoAction)
                doAction++;
            if (tag.code === TagCode.DoInitAction)
                doInitAction++;
            if (tag.code === TagCode.DoABC || tag.code === TagCode.DoABC2)
                doABC++;
            if (tag.code === TagCode.End)
                endTags++;
            if (tag instanceof FileAttributesTag) {
                fileAttributesFlags = tag.flags;
                as3Flag = tag.actionScript3;
            }
            if (tag instanceof DefineSpriteTag) {
                sprites++;
                visit(tag.tags);
            }
        }
    };
    visit(tags, true);
    const avm2 = doABC > 0 || as3Flag;
    const avm1 = !avm2 && (doAction > 0 || doInitAction > 0);
    const runtime = avm2 ? "AVM2" : avm1 ? "AVM1" : "unknown";
    const runtimeReason = doABC > 0
        ? "DoABC / DoABC2 bytecode tag"
        : as3Flag
            ? "FileAttributes AS3 flag"
            : avm1
                ? "DoAction / DoInitAction tags"
                : "no decisive ActionScript runtime marker";
    return {
        signature,
        version,
        declaredLength,
        width: (xMax - xMin) / 20,
        height: (yMax - yMin) / 20,
        frameRate,
        frameCount,
        rootTagCount: tags.length,
        totalTagCount,
        counts,
        rootCounts,
        doAction,
        doInitAction,
        doABC,
        sprites,
        endTags,
        as3Flag,
        fileAttributesFlags,
        runtime,
        runtimeReason
    };
}
