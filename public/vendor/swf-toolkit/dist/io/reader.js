import { SwfFormatError } from '../errors.js';
const utf8Decoder = new TextDecoder('utf-8');
/**
 * Little-endian binary reader with SWF bit-field support.
 *
 * Bit reads (`ub`, `sb`, `fb`) share an internal bit buffer; any byte-aligned
 * read implicitly re-aligns to the next byte boundary, as required by the SWF
 * specification.
 */
export class ByteReader {
    bytes;
    view;
    pos;
    end;
    bitBuf = 0;
    bitCount = 0;
    constructor(bytes, start = 0, end = bytes.length) {
        this.bytes = bytes;
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        this.pos = start;
        this.end = end;
    }
    get remaining() {
        return this.end - this.pos;
    }
    get eof() {
        return this.pos >= this.end;
    }
    need(n) {
        if (this.pos + n > this.end) {
            throw new SwfFormatError(`Unexpected end of data at offset ${this.pos} (need ${n} byte(s), ${this.remaining} left)`);
        }
    }
    align() {
        this.bitCount = 0;
        this.bitBuf = 0;
    }
    u8() {
        this.align();
        this.need(1);
        return this.bytes[this.pos++];
    }
    s8() {
        const v = this.u8();
        return v >= 0x80 ? v - 0x100 : v;
    }
    u16() {
        this.align();
        this.need(2);
        const v = this.view.getUint16(this.pos, true);
        this.pos += 2;
        return v;
    }
    s16() {
        this.align();
        this.need(2);
        const v = this.view.getInt16(this.pos, true);
        this.pos += 2;
        return v;
    }
    u24() {
        this.align();
        this.need(3);
        const b = this.bytes;
        const v = b[this.pos] | (b[this.pos + 1] << 8) | (b[this.pos + 2] << 16);
        this.pos += 3;
        return v;
    }
    s24() {
        const v = this.u24();
        return v & 0x800000 ? v - 0x1000000 : v;
    }
    u32() {
        this.align();
        this.need(4);
        const v = this.view.getUint32(this.pos, true);
        this.pos += 4;
        return v;
    }
    s32() {
        this.align();
        this.need(4);
        const v = this.view.getInt32(this.pos, true);
        this.pos += 4;
        return v;
    }
    f32() {
        this.align();
        this.need(4);
        const v = this.view.getFloat32(this.pos, true);
        this.pos += 4;
        return v;
    }
    f64() {
        this.align();
        this.need(8);
        const v = this.view.getFloat64(this.pos, true);
        this.pos += 8;
        return v;
    }
    /** 8.8 fixed point. */
    fixed8() {
        return this.s16() / 256;
    }
    /** 16.16 fixed point. */
    fixed() {
        return this.s32() / 65536;
    }
    bytesView(n) {
        this.align();
        this.need(n);
        const v = this.bytes.subarray(this.pos, this.pos + n);
        this.pos += n;
        return v;
    }
    /** Copy of the next `n` bytes. */
    bytesCopy(n) {
        return this.bytesView(n).slice();
    }
    rest() {
        return this.bytesView(this.remaining);
    }
    /** Null-terminated UTF-8 string. */
    cstring() {
        this.align();
        const start = this.pos;
        while (this.pos < this.end && this.bytes[this.pos] !== 0)
            this.pos++;
        if (this.pos >= this.end)
            throw new SwfFormatError(`Unterminated string at offset ${start}`);
        const s = utf8Decoder.decode(this.bytes.subarray(start, this.pos));
        this.pos++;
        return s;
    }
    /** Unsigned bit field (MSB first). */
    ub(n) {
        let result = 0;
        for (let i = 0; i < n; i++) {
            if (this.bitCount === 0) {
                this.need(1);
                this.bitBuf = this.bytes[this.pos++];
                this.bitCount = 8;
            }
            this.bitCount--;
            result = result * 2 + ((this.bitBuf >> this.bitCount) & 1);
        }
        return result;
    }
    /** Signed bit field. */
    sb(n) {
        if (n === 0)
            return 0;
        const v = this.ub(n);
        const sign = 2 ** (n - 1);
        return v >= sign ? v - 2 * sign : v;
    }
    /** Signed 16.16 fixed-point bit field. */
    fb(n) {
        return this.sb(n) / 65536;
    }
    /** SWF EncodedU32 / AVM2 variable-length unsigned 32-bit integer. */
    encodedU32() {
        this.align();
        let result = 0;
        let shift = 0;
        for (let i = 0; i < 5; i++) {
            this.need(1);
            const b = this.bytes[this.pos++];
            result += (b & 0x7f) * 2 ** shift;
            if ((b & 0x80) === 0)
                break;
            shift += 7;
        }
        return result >>> 0;
    }
}
