import fs from 'fs-extra';

import { exec } from './utils';
import { repoPath, indexPath, config } from './config';

export interface FileIndex {
    async: boolean;
    files: {
        [path: string]: string /* sha1 hash */;
    };
}

let indexJson: any;
const filesIndexPromise: Promise<FileIndex> = (async () => {
    if (indexJson) return indexJson;

    if (await fs.pathExists(repoPath)) {
        console.log('Repo already cloned, pulling for latest changes!');
        await exec(`git pull`, { cwd: repoPath });
    } else {
        console.log(
            `Cloning from https://github.com/${config.owner}/${config.repo}`
        );

        await exec(
            `git clone https://github.com/${config.owner}/${config.repo}.git ${repoPath} --depth=1`
        );
    }

    await fs.ensureFile(indexPath);
    try {
        const jsonText = await fs.readFile(indexPath, 'utf-8');
        indexJson = JSON.parse(jsonText) as FileIndex;
        indexJson.files = indexJson.files || {};
    } catch (e) {
        indexJson = { async: true, files: {} };
    }

    return indexJson;
})();

export const getFilesIndex = () => filesIndexPromise;

export async function saveFilesIndex() {
    await fs.writeFile(indexPath, JSON.stringify(indexJson, null, 2));
}
