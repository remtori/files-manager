const filePatterns = {
    image: {
        png: /^\x89PNG/,
        gif: /^GIF8[79]a/,
        jpeg: /^\xFF\xD8\xFF/,
        webp: /^RIFF....WEBP/,
    },
    audio: {
        ogg: /^OggS/,
        wav: /^RIFF....WAVE/,
        midi: /^MThd/,
        mp3: /^\xFF[\xFB\xF3\xF2]/,
    },
    video: {
        avi: /^RIFF....AVI /,
        mlv: /^MLVI/,
        mp4: /^ftypisom/,
    },
};

interface FileInfo {
    ext?: string;
    type: string;
}

export function fileInfoFromContentHead(content: string): FileInfo {
    for (const type in filePatterns) {
        const matchers = filePatterns[type as keyof typeof filePatterns];
        for (const ext in matchers) {
            const matcher: RegExp = matchers[ext as keyof typeof matchers];
            if (matcher.test(content)) {
                return {
                    ext: '.' + ext,
                    type: type,
                };
            }
        }
    }

    return { type: 'file' };
}
