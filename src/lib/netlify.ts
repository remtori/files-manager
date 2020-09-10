import fs from 'fs-extra';
import path from 'path';
import fetch, { RequestInit } from 'node-fetch';

import { UploadedFileInfo } from '../UploadedFileInfo';
import { uploadFolderPath, config } from '../config';
import { FileIndex } from '../filesIndex';

export function netlifyRequest(endpoint: string, opts: RequestInit) {
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

export function putFile(deployId: string, publicPath: string) {
    if (publicPath[0] === '/') publicPath = publicPath.slice(1);

    return netlifyRequest(`deploys/${deployId}/files/${publicPath}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/octet-stream',
        },
        body: fs.createReadStream(path.join(uploadFolderPath, publicPath)),
    });
}

export async function uploadFiles(
    indexJson: FileIndex,
    uploadedFiles: UploadedFileInfo[]
) {
    const netlifyDeployRes = await netlifyRequest(
        `sites/${config.netlifySite}/deploys`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(indexJson),
        }
    );

    const promiseQueue = [];

    let skip = false;
    for (const sha1 of netlifyDeployRes.required) {
        skip = false;
        for (let i = 0; i < uploadedFiles.length; i++) {
            if (sha1 === uploadedFiles[i].hash) {
                promiseQueue.push(
                    putFile(netlifyDeployRes.id, uploadedFiles[i].publicPath)
                );

                skip = true;
                break;
            }
        }

        if (skip) continue;

        console.log(
            '[WARN]: Required file not found! Finding its in the index...'
        );

        for (const filePath in indexJson.files) {
            if (sha1 === indexJson.files[filePath]) {
                promiseQueue.push(putFile(netlifyDeployRes.id, filePath));

                break;
            }
        }

        console.log(
            `[ERROR]: Required hash ${sha1} can not be found in any of the existing files`
        );
    }

    await Promise.all(promiseQueue);
}
