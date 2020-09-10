import crypto from 'crypto';

const rands8Pool = new Uint8Array(64); // # of random values to pre-allocate
let poolPtr = rands8Pool.length;

function rng() {
    if (poolPtr > rands8Pool.length - 4) {
        crypto.randomFillSync(rands8Pool);
        poolPtr = 0;
    }

    return rands8Pool.slice(poolPtr, (poolPtr += 4));
}

export function generateID(): string {
    const buf = Buffer.alloc(12);

    // First 8 bytes are date time information
    buf.writeBigInt64LE(BigInt(Date.now()), 0);

    // Next 4 bytes are random
    buf.set(rng(), 8);

    const base64ID = buf.toString('base64');
    return base64ID.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/, '');
}
