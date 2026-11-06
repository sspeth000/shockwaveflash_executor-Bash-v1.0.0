/** Thrown when SWF / ABC binary data is malformed or truncated. */
export class SwfFormatError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SwfFormatError';
    }
}
/** Thrown by the P-code assembler, with source position information. */
export class AssemblerError extends Error {
    line;
    column;
    source;
    constructor(message, line, column, source) {
        super(`${source ? source + ':' : ''}${line}:${column}: ${message}`);
        this.name = 'AssemblerError';
        this.line = line;
        this.column = column;
        this.source = source;
    }
}
