import path from 'path';
import dev from 'consts:dev';
import { config } from './config';
import { FileIndex, IFileNode } from './filesIndex';

export const linkFromPublicPath = (publicPath: string, isDev = dev) =>
    isDev
        ? `http://localhost:${global.PORT}/files/${publicPath}`
        : `https://${config.netlifySite}/${publicPath}`;


export function isAbsolute(p: string) {
    if (p[0] === '/') p = p.slice(1);
    return path.posix.normalize(p + '/') === path.posix.normalize(path.posix.resolve(p) + '/');
}

/**
 * Return `IFileNode` if the file exist,
 * otherwise return `false` if the path is invalid
 *           return `true` if we can create a new file at the path
 */
export function getFileNode(publicPath: string, indexJSON: FileIndex): IFileNode | boolean {
    if (publicPath === '/') return indexJSON.root;

    let destNode: IFileNode = indexJSON.root;
    const paths = publicPath.split('/');
    for (let i = 1; i < paths.length; i++) {
        if (i < paths.length - 1 && !destNode.isDirectory) return false;
        if (!destNode.children![paths[i]]) return true;
        destNode = destNode.children![paths[i]];
    }

    return destNode;
}

export function isValidPath(publicPath: string, indexJSON: FileIndex): boolean {
    return Boolean(getFileNode(publicPath, indexJSON));
}
