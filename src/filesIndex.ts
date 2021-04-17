import path from 'path';
import { config } from './config';
import { netlifyClient } from './lib/netlify';

export interface IFileNode {
    name: string;
    size: number;
    path: string;
    isDirectory: boolean;
    children?: {
        [name: string]: IFileNode;
    }
}

export interface FileIndex {
    root: IFileNode;
    hashes: {
        [path: string]: string /* sha1 hash */;
    };
}

const indexJson: FileIndex = {
    hashes: {},
    root: {
        name: 'root',
        path: '/',
        size: 0,
        isDirectory: true,
        children: {},
    }
};

const filesIndexPromise: Promise<FileIndex> = (async () => {
    const indexes = await netlifyClient.listSiteFiles({ site_id: config.netlifySite });
    indexes.forEach(file => addFileToIndex(file.path, file.sha, file.size));
    return indexJson;
})();

export const getFilesIndex = () => filesIndexPromise;

export function addFileToIndex(publicPath: string, hash: string, size: number) {
    indexJson.hashes[publicPath] = hash;
    const fileNode: IFileNode = {
        name: path.basename(publicPath),
        path: publicPath,
        isDirectory: false,
        size,
    };

    let destNode: IFileNode = indexJson.root;
    const paths = publicPath.split('/');
    for (let i = 1; i < paths.length - 1; i++) {
        if (!destNode.isDirectory) {
            console.log(`[ERROR]: Can not put file at ${publicPath}`);
            console.log(`[ERROR]: Invalid path, ${paths[i]} is not a directory`);
            return;
        }

        if (!destNode.children![paths[i]]) {
            destNode.children![paths[i]] = {
                name: paths[i],
                path: paths.slice(0, i + 1).join('/'),
                size: 0,
                isDirectory: true,
                children: {},
            }
        }

        destNode.size += fileNode.size;
        destNode = destNode.children![paths[i]];
    }

    destNode.size += fileNode.size;
    destNode.children![fileNode.name] = fileNode;
}