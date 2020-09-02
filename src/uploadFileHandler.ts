import { Router, Request, Response } from 'express';
import child_process, { ExecOptions } from 'child_process';
import fetch, { RequestInit } from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';

import { uploadFileMiddleware } from './uploadFile/uploadFileMiddleware';
import cfg from '../config.json';

const GIT_PUSH_TIMEOUT = 5 * 60 * 1000;
const REPO_PATH = './tmp/files';

export const uploadFileHandler = Router();

let firstTime = true;

interface FileIndex {
    files: {
        [path: string]: string /* sha1 hash */;
    };
}

let indexJson: FileIndex = { files: {} };

const indexPath = path.join(REPO_PATH, 'index.json');

uploadFileHandler.post(
    '/',
    async (req: Request, res: Response, next: () => void) => {
        if (!firstTime) return next();
        firstTime = false;

        if (await fs.pathExists(REPO_PATH)) {
            await exec(`git pull`, { cwd: REPO_PATH });
        } else {
            await exec(
                `git clone https://github.com/${cfg.owner}/${cfg.repo}.git ${REPO_PATH} --depth=1`
            );
        }

        await fs.ensureFile(indexPath);
        try {
            indexJson = (await readJson(indexPath)) as FileIndex;
        } catch (e) {}

        next();
    },
    uploadFileMiddleware({
        uploadFolder: path.join(REPO_PATH, cfg.publishPath),
    }),
    async (req: Request, res: Response) => {
        if (!req.files) return res.json({ ok: false });

        const file = req.files.file;
        if (!file) return res.json({ ok: false });

        const publicPath = path.relative(REPO_PATH, file.filePath);
        res.json({ ok: true, url: `${cfg.domain}/${publicPath}` });

        try {
            // Upload to github
            await exec(`sh ./src/commit.sh`, {
                env: { COMMIT_MSG: `[api] Uploaded ${publicPath}` },
            });

            queuePush();

            // Upload to netlify
            indexJson.files['/' + publicPath] = file.hash;

            writeJson(indexPath, indexJson);
        } catch (err) {
            console.log('Error while uploading: ' + JSON.stringify(file));
            console.log(err);
        }
    }
);

function netlifyRequest(endpoint: string, opts: RequestInit) {
    return fetch(
        `https://api.netlify.com/api/v1/${endpoint}`,
        Object.assign(
            {
                headers: {
                    Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
                },
            },
            opts
        )
    ).then((r) => r.json());
}

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

const readJson = (path: string) =>
    fs.readFile(path, 'utf8').then((text) => JSON.parse(text));

const writeJson = (path: string, obj: any) =>
    fs.writeFile(path, JSON.stringify(obj));
