const keyString =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function base62encode(num: number): string {
    let result = '';
    while (num > 0) {
        result += keyString[num % keyString.length];
        num = Math.floor(num / keyString.length);
    }

    return result;
}

export function generateID(contentMd5: string): string {
    const now = new Date();
    return (
        base62encode(now.getTime() % (1000 * 60 * 60 * 24)) +
        contentMd5.substr(0, 4) +
        base62encode(now.getMonth()) +
        contentMd5.substr(4, 4) +
        base62encode(now.getDate()) +
        contentMd5.substr(8, 4) +
        base62encode(Math.floor(Math.random() * 62)) +
        contentMd5.substr(24, 8)
    );
}
