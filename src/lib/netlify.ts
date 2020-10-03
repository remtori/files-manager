import fs from 'fs-extra';
import path from 'path';
import { pipeline } from 'stream';
import got, { Options, Progress } from 'got';

import { UploadedFileInfo } from '../UploadedFileInfo';
import { config, tempPath } from '../config';
import { FileIndex } from '../filesIndex';

export const netlifyRequest = got.extend({
    prefixUrl: 'https://api.netlify.com/api/v1/',
    headers: {
        Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
    },
});

export function putFile(deployId: string, file: UploadedFileInfo) {
    let publicPath = file.publicPath;
    if (publicPath[0] === '/') publicPath = publicPath.slice(1);

    return new Promise(resolve => {
        const putStream = got.stream.put(
            `https://api.netlify.com/api/v1/deploys/${deployId}/files/${publicPath}`,
            {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
                },
            }
        );

        pipeline(
            fs.createReadStream(file.filePath),
            putStream,
            (err) => {
                if (err) {
                    console.log(err);
                    resolve();
                }
            }
        );

        putStream.on('uploadProgress', (progress: Progress) => {
            console.log(`Uploading ${file.publicPath}: ${progress.transferred}/${file.size} bytes`);
        });

        putStream.on('error', (err) => {
            console.log(err);
            resolve();
        });

        putStream.on('end', resolve);
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
    ).json() as any;

    uploadRequiredFiles(netlifyDeployRes.id, uploadedFiles);
}

async function uploadRequiredFiles(deployId: string, uploadedFiles: UploadedFileInfo[]) {
    const netlifyDeploy = await netlifyRequest(`deploys/${deployId}`).json() as any;
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
                    putFile(deployId, uploadedFiles[i])
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