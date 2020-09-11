import { Router, Request, Response } from 'express';
import { getFilesIndex } from '../filesIndex';

export const getFilesListHandler = Router();

interface FileNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: {
        [name: string]: FileNode;
    };
}

getFilesListHandler.get('/', async (req: Request, res: Response) => {
    const rootFileNode: FileNode = {
        name: 'root',
        path: '/',
        isDirectory: true,
        children: {},
    };

    const fileIndex = await getFilesIndex();
    Object.keys(fileIndex.files).forEach((path) => addFile(rootFileNode, path));

    res.json(rootFileNode);
});

function addFile(root: FileNode, path: string): void {
    let paths = path.split('/');
    if (paths[0].length !== 0) {
        console.log(`[Error]: Relative path found in FilesIndex (${path})`);
        return;
    }

    paths = paths.slice(1);
    let pathOffset = 1;
    let prevNode: FileNode | undefined;
    let node: FileNode | undefined = root;
    for (let i = 0; i < paths.length; i++) {
        if (!node.isDirectory) {
            throw new Error(
                `${paths.slice(0, i).join('/')} is not a directory`
            );
        }

        prevNode = node;
        node = node.children && node.children[paths[i]];
        pathOffset += paths[i].length + 1;

        if (!node) {
            node = {
                name: paths[i],
                path: path.slice(0, pathOffset),
                isDirectory: i < paths.length - 1,
            };

            if (node.isDirectory) node.children = {};
            prevNode.children![node.name] = node;
        }
    }
}
