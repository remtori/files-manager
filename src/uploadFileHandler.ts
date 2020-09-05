import { Router, Request, Response } from 'express';
import child_process, { ExecOptions } from 'child_process';
import fetch, { RequestInit } from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';

import {
    uploadFileMiddleware,
    UploadedFile,
} from './uploadFile/uploadFileMiddleware';
import cfg from '../config.json';

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
const uploadFolder = path.join(REPO_PATH, cfg.publishPath);

interface UploadedFileInfo extends UploadedFile {
    publicPath: string;
}

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
            indexJson.files = indexJson.files || {};
        } catch (e) {}

        next();
    },
    uploadFileMiddleware({ uploadFolder }),
    async (req: Request, res: Response) => {
        if (!req.files) return res.json({ ok: false });

        const uploadedFiles = req.files.files as UploadedFileInfo[];
        if (!uploadedFiles) return res.json({ ok: false });

        for (let i = 0; i < uploadedFiles.length; i++) {
            const publicPath = path
                .relative(uploadFolder, uploadedFiles[i].filePath)
                .replace(/\\/g, '/');

            console.log(
                `Received file: ${uploadedFiles[i].name}, save as ${publicPath}`
            );

            uploadedFiles[i].publicPath = publicPath;
        }

        res.json({
            ok: true,
            links: Object.fromEntries(
                uploadedFiles.map((file) => [
                    file.name,
                    `https://${cfg.netlifySite}/${file.publicPath}`,
                ])
            ),
        });

        try {
            // Upload to github
            uploadedFiles.forEach((file) => {
                if (indexJson.files['/' + file.publicPath])
                    console.log(
                        '[ERROR]: Collision on generated guid !!! Overriding old file...'
                    );

                indexJson.files['/' + file.publicPath] = file.hash;
            });
            await writeJson(indexPath, indexJson);

            await exec(`sh ./src/commit.sh`, {
                env: {
                    COMMIT_MSG: `[api] Uploaded ${uploadedFiles.length} files`,
                },
            });

            queuePush();

            // Upload to netlify
            const netlifyDeployRes = await netlifyRequest(
                `sites/${cfg.netlifySite}/deploys`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(indexJson),
                }
            );

            const promiseQueue = [];
            for (const sha1 of netlifyDeployRes.required) {
                for (let i = 0; i < uploadedFiles.length; i++) {
                    if (sha1 === uploadedFiles[i].hash) {
                        promiseQueue.push(
                            uploadFile(
                                netlifyDeployRes.id,
                                uploadedFiles[i].publicPath
                            )
                        );

                        break;
                    }
                }

                console.log(
                    '[WARN]: Required file not found! Finding its in the index...'
                );

                for (const filePath in indexJson.files) {
                    if (sha1 === indexJson.files[filePath]) {
                        promiseQueue.push(
                            uploadFile(netlifyDeployRes.id, filePath)
                        );

                        break;
                    }
                }
            }

            await Promise.all(promiseQueue);
        } catch (err) {
            console.log(
                'Error while uploading: ' + JSON.stringify(uploadedFiles)
            );
            console.log(err);
        }
    }
);

function netlifyRequest(endpoint: string, opts: RequestInit) {
    return fetch(`https://api.netlify.com/api/v1/${endpoint}`, {
        ...opts,
        headers: {
            ...opts.headers,
            Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
        },
    })
        .then((r) => r.json())
        .then((res) => {
            if (res.code && res.code != 200) {
                console.log(`Netlify error (${res.code})`);
                throw new Error(res.message);
            }

            return res;
        });
}

function uploadFile(deployId: string, publicPath: string) {
    if (publicPath[0] === '/') publicPath = publicPath.slice(1);

    return netlifyRequest(`deploys/${deployId}/files/${publicPath}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/octet-stream',
        },
        body: fs.createReadStream(path.join(uploadFolder, publicPath)),
    });
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
    pushTimeoutHandler = setTimeout(push, cfg.gitPushTimeout);
}

const push = () =>
    exec(
        `git push https://${process.env.GITHUB_TOKEN}@github.com/${cfg.owner}/${cfg.repo}.git`,
        { cwd: REPO_PATH }
    );

const readJson = (path: string) =>
    fs.readFile(path, 'utf8').then((text) => JSON.parse(text));

const writeJson = (path: string, obj: any) =>
    fs.writeFile(path, JSON.stringify(obj, null, 2));
