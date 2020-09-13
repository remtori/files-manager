import { Router, Request, Response } from 'express';
import path from 'path';
import dev from 'consts:dev';

import { uploadFileMiddleware } from '../middleware/uploadFile/uploadFileMiddleware';
import { uploadFolderPath, config } from '../config';
import { UploadedFileInfo } from '../UploadedFileInfo';
import { commit, push } from '../lib/git';
import { uploadFiles } from '../lib/netlify';
import { getFilesIndex, saveFilesIndex } from '../filesIndex';
import { linkFromPublicPath } from '../utils';

export const uploadFilesHandler = Router();

uploadFilesHandler.post(
	'/',
	uploadFileMiddleware({ uploadFolder: uploadFolderPath }),
	async (req: Request, res: Response) => {
		if (!req.files) return res.json({ ok: false });

		const uploadedFiles: UploadedFileInfo[] = [];
		for (const field in req.files) {
			if (Array.isArray(req.files[field])) {
				uploadedFiles.push(...(req.files[field] as any));
			} else {
				uploadedFiles.push(req.files[field] as any);
			}
		}

		if (uploadedFiles.length === 0) return res.json({ ok: false });

		for (let i = 0; i < uploadedFiles.length; i++) {
			const publicPath = path
				.relative(uploadFolderPath, uploadedFiles[i].filePath)
				.replace(/\\/g, '/');

			console.log(
				`Received file: ${uploadedFiles[i].name}, save as ${publicPath}`
			);

			uploadedFiles[i].publicPath = publicPath;
		}

		const uploadFileEntries = uploadedFiles.map((file) => [
			file.name,
			linkFromPublicPath(file.publicPath),
		]);

		res.json({
			ok: true,
			links: Object.fromEntries(uploadFileEntries),
		});

		const indexJson = await getFilesIndex();

		uploadedFiles.forEach((file) => {
			if (indexJson.files['/' + file.publicPath])
				console.log(
					'[ERROR]: Collision on generated guid !!! Overriding old file...'
				);

			indexJson.files['/' + file.publicPath] = file.hash;
		});

		await saveFilesIndex();
		if (dev) return;

		await uploadFiles(indexJson, uploadedFiles);

		await commit(`[api] Uploaded ${uploadedFiles.length} files`);
		await push();
	}
);