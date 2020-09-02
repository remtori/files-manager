import { Router, Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import child_process, { ExecOptions } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

import cfg from '../config.json';

import { generateID } from './guid';
import { fileInfoFromContentHead } from './fileDescription';

const GIT_PUSH_TIMEOUT = 5 * 60 * 1000;
const REPO_PATH = './tmp/files';

export const uploadFileHandler = Router();

uploadFileHandler.post(
    '/',
    fileUpload({
        useTempFiles: true,
        tempFileDir: './tmp',
    }),
    async (req: Request, res: Response) => {
        if (!req.files || !req.files.file) return res.json({ ok: false });

        const file = req.files.file as UploadedFile;
        if (!file) return res.json({ ok: false });

        const filePath = await filePathFromUploadedFile(file);
        res.json({ ok: true, url: `${cfg.domain}/${filePath}` });

        try {
            const movePath = path.join(REPO_PATH, cfg.publishPath, filePath);

            // Upload to github
            if (!(await fs.pathExists(REPO_PATH))) {
                await exec(
                    `git clone https://github.com/${cfg.owner}/${cfg.repo}.git ${REPO_PATH} --depth=1`
                );
            }

            await fs.ensureDir(path.dirname(movePath));

            await file.mv(movePath);

            await exec(`sh ./src/commit.sh`, {
                env: { COMMIT_MSG: `[api] Uploaded ${filePath}` },
            });

            queuePush();

            // Upload to netlify
        } catch (err) {
            console.log('Error while uploading: ' + JSON.stringify(file));
            console.log(err);
        }
    }
);

function exec(cmd: string, options: ExecOptions = {}) {
    return new Promise((resolve, reject) => {
        child_process.exec(cmd, options, (err, stdout, stderr) => {
            if (err) return reject(err);
            if (stderr) console.error(stderr);
            console.log(stdout);
            resolve(stdout);
        });
    });
}

async function filePathFromUploadedFile(file: UploadedFile): Promise<string> {
    const fd = await fs.open(file.tempFilePath, 'r');
    const buf = Buffer.alloc(12);
    await fs.read(fd, buf, 0, 12, 0);
    await fs.close(fd);

    const desc = fileInfoFromContentHead(buf.toString('binary'));

    const category = desc.type;
    const ext = desc.ext || path.extname(file.name);

    const id = generateID();
    return `${category}/${id}${ext}`;
}

let pushTimeoutHandler: NodeJS.Timeout;
function queuePush() {
    clearTimeout(pushTimeoutHandler);
    pushTimeoutHandler = setTimeout(push, GIT_PUSH_TIMEOUT);
}

const push = () =>
    exec(
        `git push https://${process.env.GITHUB_TOKEN}@github.com/${cfg.owner}/${cfg.repo}.git`,
        { cwd: REPO_PATH }
    );
