const utf8Encoder = new TextEncoder();
/** Growable little-endian binary writer with SWF bit-field support. */
export class ByteWriter {
    buf;
    view;
    length = 0;
    bitBuf = 0;
    bitCount = 0;
    constructor(initialCapacity = 1024) {
        this.buf = new Uint8Array(Math.max(16, initialCapacity));
        this.view = new DataView(this.buf.buffer);
    }
    ensure(n) {
        const required = this.length + n;
        if (required <= this.buf.length)
            return;
        let cap = this.buf.length * 2;
        while (cap < required)
            cap *= 2;
        const next = new Uint8Array(cap);
        next.set(this.buf.subarray(0, this.length));
        this.buf = next;
        this.view = new DataView(next.buffer);
    }
    /** Flush pending bits (pads the current byte with zeros). */
    align() {
        if (this.bitCount > 0) {
            this.ensure(1);
            this.buf[this.length++] = (this.bitBuf << (8 - this.bitCount)) & 0xff;
            this.bitBuf = 0;
            this.bitCount = 0;
        }
    }
    u8(v) {
        this.align();
        this.ensure(1);
        this.buf[this.length++] = v & 0xff;
        return this;
    }
    s8(v) {
        return this.u8(v < 0 ? v + 0x100 : v);
    }
    u16(v) {
        this.align();
        this.ensure(2);
        this.view.setUint16(this.length, v & 0xffff, true);
        this.length += 2;
        return this;
    }
    s16(v) {
        this.align();
        this.ensure(2);
        this.view.setInt16(this.length, v, true);
        this.length += 2;
        return this;
    }
    u24(v) {
        this.align();
        this.ensure(3);
        const x = v & 0xffffff;
        this.buf[this.length++] = x & 0xff;
        this.buf[this.length++] = (x >> 8) & 0xff;
        this.buf[this.length++] = (x >> 16) & 0xff;
        return this;
    }
    s24(v) {
        return this.u24(v < 0 ? v + 0x1000000 : v);
    }
    u32(v) {
        this.align();
        this.ensure(4);
        this.view.setUint32(this.length, v >>> 0, true);
        this.length += 4;
        return this;
    }
    s32(v) {
        this.align();
        this.ensure(4);
        this.view.setInt32(this.length, v | 0, true);
        this.length += 4;
        return this;
    }
    f32(v) {
        this.align();
        this.ensure(4);
        this.view.setFloat32(this.length, v, true);
        this.length += 4;
        return this;
    }
    f64(v) {
        this.align();
        this.ensure(8);
        this.view.setFloat64(this.length, v, true);
        this.length += 8;
        return this;
    }
    fixed8(v) {
        return this.s16(Math.round(v * 256));
    }
    fixed(v) {
        return this.s32(Math.round(v * 65536));
    }
    bytes(data) {
        this.align();
        this.ensure(data.length);
        this.buf.set(data, this.length);
        this.length += data.length;
        return this;
    }
    cstring(s) {
        this.bytes(utf8Encoder.encode(s));
        return this.u8(0);
    }
    ub(n, v) {
        for (let i = n - 1; i >= 0; i--) {
            const bit = Math.floor(v / 2 ** i) & 1;
            this.bitBuf = (this.bitBuf << 1) | bit;
            this.bitCount++;
            if (this.bitCount === 8) {
                this.ensure(1);
                this.buf[this.length++] = this.bitBuf & 0xff;
                this.bitBuf = 0;
                this.bitCount = 0;
            }
        }
        return this;
    }
    sb(n, v) {
        return this.ub(n, v < 0 ? v + 2 ** n : v);
    }
    fb(n, v) {
        return this.sb(n, Math.round(v * 65536));
    }
    encodedU32(v) {
        this.align();
        let x = v >>> 0;
        do {
            let b = x & 0x7f;
            x = x >>> 7;
            if (x !== 0)
                b |= 0x80;
            this.u8(b);
        } while (x !== 0);
        return this;
    }
    /** Overwrite a little-endian u32 at an absolute offset. */
    patchU32(offset, v) {
        this.view.setUint32(offset, v >>> 0, true);
    }
    toBytes() {
        this.align();
        return this.buf.slice(0, this.length);
    }
}
/** Number of bits needed to store `v` as an unsigned bit field. */
export function unsignedBits(v) {
    let n = 0;
    while (v > 0) {
        n++;
        v = Math.floor(v / 2);
    }
    return n;
}
/** Number of bits needed to store `v` as a signed bit field. */
export function signedBits(v) {
    if (v === 0)
        return 0;
    return unsignedBits(v < 0 ? -v - 1 : v) + 1;
}
