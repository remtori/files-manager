import { Router, Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import child_process, { ExecOptions } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

import { generateID } from './guid';
import { fileInfoFromContentHead } from './fileDescription';

export const uploadFileHandler = Router();

uploadFileHandler.post(
    '/',
    fileUpload({
        useTempFiles: true,
        tempFileDir: './tmp',
    }),
    async (req: Request, res: Response) => {
        if (!req.files || !req.files.file) {
            return res.json({ ok: false });
        }

        const file = req.files.file as UploadedFile;

        if (!file) {
            return res.json({ ok: false });
        }

        let ext = path.extname(file.name);
        const desc = fileInfoFromContentHead(
            file.data.toString('ascii', 0, 12)
        );
        const category = desc.type;
        ext = desc.ext || ext;

        const id = generateID(file.md5);
        const filePath = `${category}/${id}${ext}`;

        try {
            const movePath = `./tmp/files/publish/${filePath}`;

            if (!(await fs.pathExists('./tmp/files'))) {
                await exec(
                    `git clone https://github.com/remtori/files.git ./tmp/files --depth=1`
                );
            }

            await fs.ensureDir(path.dirname(movePath));

            await file.mv(movePath);

            await exec(`sh ./src/push.sh`, {
                env: Object.assign(
                    { COMMIT_MSG: `[api] Uploaded ${filePath}` },
                    process.env
                ),
            });

            res.json({
                ok: true,
                url: `https://${req.header('host')}/${filePath}`,
            });
        } catch (err) {
            console.log('Error while uploading: ' + JSON.stringify(file));
            console.log(err);
            return res.json({ ok: false });
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
