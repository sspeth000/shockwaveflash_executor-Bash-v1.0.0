import { ByteReader } from '../io/reader.js';
import { ByteWriter } from '../io/writer.js';
import { AbcFile } from '../abc/abc-file.js';
import { CHARACTER_DEFINING_TAGS, TagCode, tagName } from './tag-codes.js';
/** Base class for all SWF tags. */
export class Tag {
    /**
     * Write this tag with a long (6-byte) record header even if its body is
     * shorter than 63 bytes. Set automatically when parsed from a file that
     * used the long form, so unmodified files round-trip byte-for-byte.
     */
    longHeader = false;
    get name() {
        return tagName(this.code);
    }
    /** Character id for character-defining tags, otherwise `undefined`. */
    get characterId() {
        return undefined;
    }
}
/** A tag kept as opaque bytes. Every tag type not modelled explicitly is a RawTag. */
export class RawTag extends Tag {
    code;
    data;
    constructor(code, data) {
        super();
        this.code = code;
        this.data = data;
    }
    get characterId() {
        if (CHARACTER_DEFINING_TAGS.has(this.code) && this.data.length >= 2) {
            return this.data[0] | (this.data[1] << 8);
        }
        return undefined;
    }
    /** Change the character id of a character-defining tag in place. */
    setCharacterId(id) {
        if (!CHARACTER_DEFINING_TAGS.has(this.code))
            throw new Error(`${this.name} does not define a character`);
        this.data = this.data.slice();
        this.data[0] = id & 0xff;
        this.data[1] = (id >> 8) & 0xff;
    }
    encodeBody() {
        return this.data;
    }
}
/**
 * DoABC (72) / DoABC2 (82): an ActionScript 3 bytecode block.
 *
 * The ABC payload is parsed lazily on first access to {@link abc}. As long as
 * it has not been accessed, the original bytes are written back untouched.
 */
export class DoABCTag extends Tag {
    code;
    /** DoABC2 flags. 1 = kDoAbcLazyInitializeFlag. */
    flags;
    /** DoABC2 name. */
    abcName;
    raw;
    parsed;
    constructor(code, flags, abcName, abc) {
        super();
        this.code = code;
        this.flags = flags;
        this.abcName = abcName;
        if (abc instanceof AbcFile)
            this.parsed = abc;
        else
            this.raw = abc;
    }
    static create(abc, name = '', flags = 1) {
        return new DoABCTag(TagCode.DoABC2, flags, name, abc);
    }
    /** Parsed ABC file. Parsing happens once, on first access. */
    get abc() {
        if (!this.parsed) {
            this.parsed = AbcFile.parse(this.raw);
            this.raw = undefined;
        }
        return this.parsed;
    }
    set abc(value) {
        this.parsed = value;
        this.raw = undefined;
    }
    /** True once the ABC has been parsed (and will therefore be re-serialised on save). */
    get isParsed() {
        return this.parsed !== undefined;
    }
    /** Raw ABC bytes (serialises the parsed ABC if needed). */
    abcBytes() {
        return this.parsed ? this.parsed.toBytes() : this.raw;
    }
    encodeBody() {
        const abc = this.abcBytes();
        if (this.code === TagCode.DoABC)
            return abc;
        const w = new ByteWriter(abc.length + this.abcName.length + 8);
        w.u32(this.flags);
        w.cstring(this.abcName);
        w.bytes(abc);
        return w.toBytes();
    }
}
/** SymbolClass (76) and ExportAssets (56): character id ↔ name mappings. */
export class SymbolTableTag extends Tag {
    code;
    symbols;
    constructor(code, symbols) {
        super();
        this.code = code;
        this.symbols = symbols;
    }
    encodeBody() {
        const w = new ByteWriter();
        w.u16(this.symbols.length);
        for (const s of this.symbols) {
            w.u16(s.id);
            w.cstring(s.name);
        }
        return w.toBytes();
    }
}
/** DefineSprite (39): a movie clip with its own control-tag timeline. */
export class DefineSpriteTag extends Tag {
    spriteId;
    frameCount;
    tags;
    trailing;
    code = TagCode.DefineSprite;
    constructor(spriteId, frameCount, tags, 
    /** Bytes after the nested End tag (normally empty). */
    trailing = new Uint8Array(0)) {
        super();
        this.spriteId = spriteId;
        this.frameCount = frameCount;
        this.tags = tags;
        this.trailing = trailing;
    }
    get characterId() {
        return this.spriteId;
    }
    encodeBody() {
        const w = new ByteWriter();
        w.u16(this.spriteId);
        w.u16(this.frameCount);
        writeTags(w, this.tags);
        w.bytes(this.trailing);
        return w.toBytes();
    }
}
/** DefineBinaryData (87). */
export class DefineBinaryDataTag extends Tag {
    id;
    data;
    reserved;
    code = TagCode.DefineBinaryData;
    constructor(id, data, reserved = 0) {
        super();
        this.id = id;
        this.data = data;
        this.reserved = reserved;
    }
    get characterId() {
        return this.id;
    }
    encodeBody() {
        const w = new ByteWriter(this.data.length + 6);
        w.u16(this.id);
        w.u32(this.reserved);
        w.bytes(this.data);
        return w.toBytes();
    }
}
/** Metadata (77): XMP/RDF XML string. */
export class MetadataTag extends Tag {
    xml;
    code = TagCode.Metadata;
    constructor(xml) {
        super();
        this.xml = xml;
    }
    encodeBody() {
        return new ByteWriter().cstring(this.xml).toBytes();
    }
}
/** FileAttributes (69). */
export class FileAttributesTag extends Tag {
    flags;
    code = TagCode.FileAttributes;
    constructor(flags) {
        super();
        this.flags = flags;
    }
    get useDirectBlit() {
        return (this.flags & 0x40) !== 0;
    }
    get useGPU() {
        return (this.flags & 0x20) !== 0;
    }
    get hasMetadata() {
        return (this.flags & 0x10) !== 0;
    }
    get actionScript3() {
        return (this.flags & 0x08) !== 0;
    }
    set actionScript3(v) {
        this.flags = v ? this.flags | 0x08 : this.flags & ~0x08;
    }
    get useNetwork() {
        return (this.flags & 0x01) !== 0;
    }
    set useNetwork(v) {
        this.flags = v ? this.flags | 0x01 : this.flags & ~0x01;
    }
    encodeBody() {
        return new ByteWriter(4).u32(this.flags).toBytes();
    }
}
// ---------------------------------------------------------------------------
// Tag stream parsing / writing
// ---------------------------------------------------------------------------
function decodeTag(code, body) {
    const r = new ByteReader(body);
    switch (code) {
        case TagCode.DoABC:
            return new DoABCTag(code, 0, '', body);
        case TagCode.DoABC2: {
            const flags = r.u32();
            const name = r.cstring();
            return new DoABCTag(code, flags, name, r.rest());
        }
        case TagCode.SymbolClass:
        case TagCode.ExportAssets: {
            const count = r.u16();
            const symbols = [];
            for (let i = 0; i < count; i++)
                symbols.push({ id: r.u16(), name: r.cstring() });
            if (!r.eof)
                return new RawTag(code, body);
            return new SymbolTableTag(code, symbols);
        }
        case TagCode.DefineSprite: {
            const id = r.u16();
            const frameCount = r.u16();
            const { tags, end } = readTags(body, r.pos, body.length);
            return new DefineSpriteTag(id, frameCount, tags, body.slice(end));
        }
        case TagCode.DefineBinaryData: {
            const id = r.u16();
            const reserved = r.u32();
            return new DefineBinaryDataTag(id, r.rest(), reserved);
        }
        case TagCode.Metadata: {
            const xml = r.cstring();
            if (!r.eof)
                return new RawTag(code, body);
            return new MetadataTag(xml);
        }
        case TagCode.FileAttributes:
            if (body.length !== 4)
                return new RawTag(code, body);
            return new FileAttributesTag(r.u32());
        default:
            return new RawTag(code, body);
    }
}
/**
 * Reads a tag stream until (and including) the End tag or the end of data.
 * Returns the tags and the offset right after the last consumed byte.
 */
export function readTags(bytes, start, end) {
    const r = new ByteReader(bytes, start, end);
    const tags = [];
    while (r.remaining >= 2) {
        const codeAndLength = r.u16();
        const code = codeAndLength >> 6;
        let length = codeAndLength & 0x3f;
        const long = length === 0x3f;
        if (long) {
            if (r.remaining < 4)
                break;
            length = r.u32();
        }
        // Clamp truncated tags instead of failing the whole file.
        const body = r.bytesView(Math.min(length, r.remaining)).slice();
        let tag;
        try {
            tag = decodeTag(code, body);
        }
        catch {
            tag = new RawTag(code, body);
        }
        tag.longHeader = long;
        tags.push(tag);
        if (code === TagCode.End)
            break;
    }
    return { tags, end: r.pos };
}
export function writeTag(w, tag) {
    const body = tag.encodeBody();
    if (body.length >= 0x3f || tag.longHeader) {
        w.u16((tag.code << 6) | 0x3f);
        w.u32(body.length);
    }
    else {
        w.u16((tag.code << 6) | body.length);
    }
    w.bytes(body);
}
export function writeTags(w, tags) {
    for (const t of tags)
        writeTag(w, t);
}
