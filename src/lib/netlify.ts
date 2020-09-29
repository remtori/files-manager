import fs from 'fs-extra';
import path from 'path';
import fetch, { RequestInit } from 'node-fetch';

import { UploadedFileInfo } from '../UploadedFileInfo';
import { config, tempPath } from '../config';
import { FileIndex } from '../filesIndex';

export function netlifyRequest(endpoint: string, opts: RequestInit = {}) {
    return fetch(`https://api.netlify.com/api/v1/${endpoint}`, {
        ...opts,
        headers: {
            ...opts.headers,
            Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
        },
    })
        .then((r) => r.text())
        .then(text => {
            try {
                return JSON.parse(text);
            } catch (e) {
                console.log('Failed to parse:');
                console.log(text);
                console.log(e);
            }
        })
        .then((res) => {
            if (res.code && res.code != 200) {
                console.log(`Netlify error (${res.code})`);
                throw new Error(res.message);
            }

            return res;
        });
}

export function putFile(deployId: string, publicPath: string, filePath: string) {
    if (publicPath[0] === '/') publicPath = publicPath.slice(1);

    return netlifyRequest(`deploys/${deployId}/files/${publicPath}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/octet-stream',
        },
        body: fs.createReadStream(path.join(tempPath, filePath)),
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
            body: JSON.stringify({
                async: true,
                files: indexJson.hashes,
            }),
        }
    );

    uploadRequiredFiles(netlifyDeployRes.id, uploadedFiles);
}

async function uploadRequiredFiles(deployId: string, uploadedFiles: UploadedFileInfo[]) {
    const netlifyDeploy = await netlifyRequest(`deploys/${deployId}`);
    if (netlifyDeploy.state === 'ready' || netlifyDeploy.state === 'error') return;

    console.log('=========================================================');
    console.log(`Deploy id: ${deployId}`);
    console.log('Required hashes:');
    console.log('\t' + netlifyDeploy.required.join('\n\t'));

    const promiseQueue = [];

    let skip = false;
    for (const sha1 of netlifyDeploy.required) {
        skip = false;
        for (let i = 0; i < uploadedFiles.length; i++) {
            if (sha1 === uploadedFiles[i].hash) {
                promiseQueue.push(
                    putFile(deployId, uploadedFiles[i].publicPath, uploadedFiles[i].filePath)
                );

                skip = true;
                break;
            }
        }

        if (!skip) console.log(`[ERROR]: Required file not found! hash: ${sha1}`);
    }

    await Promise.all(promiseQueue);
    console.log(`Uploaded ${promiseQueue.length} to Netlify`);

    await uploadRequiredFiles(deployId, uploadedFiles);
}