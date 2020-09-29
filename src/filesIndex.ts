import { config } from './config';
import { netlifyRequest } from './lib/netlify';
import { UploadedFileInfo } from './UploadedFileInfo';

interface NetlifyFile {
    id: string;
    path: string;
    sha: string;
    size: number;
}

export interface FileIndex {
    files: NetlifyFile[];
    hashes: {
        [path: string]: string /* sha1 hash */;
    };
}

let indexJson: FileIndex | undefined;
const filesIndexPromise: Promise<FileIndex> = (async () => {
    if (indexJson) return indexJson;

    const indexes: NetlifyFile[] = await netlifyRequest(
        `sites/${config.netlifySite}/files`,
        { method: 'GET' }
    );

    indexJson = { files: indexes, hashes: {} };
    indexes.forEach(file => {
        indexJson!.hashes[file.path] = file.sha;
    });

    return indexJson;
})();

export const getFilesIndex = () => filesIndexPromise;

export function addFileToIndex(file: UploadedFileInfo) {
    if (!indexJson) throw new Error('You needed to call `getFilesIndex` at least once before this function');

    const netlifyFile = {
        id: '/' + file.publicPath,
        path: '/' + file.publicPath,
        sha: file.hash,
        size: file.size,
    };

    indexJson.hashes[file.publicPath] = file.hash;
    indexJson.files.push(netlifyFile);

    console.log('File added:');
    console.log(netlifyFile);
}