import path from 'path';
import { Router, Request, Response } from 'express';
import dev from 'consts:dev';

import {
	UploadedFile,
	uploadFileMiddleware,
} from '../middleware/uploadFile/uploadFileMiddleware';
import { tempPath } from '../config';
import { UploadedFileInfo } from '../UploadedFileInfo';
import { uploadFiles } from '../lib/netlify';
import { getFilesIndex, addFileToIndex } from '../filesIndex';
import { isAbsolute, linkFromPublicPath } from '../utils';

export const uploadFilesHandler = Router();

uploadFilesHandler.post(
	'/',
	uploadFileMiddleware({
		uploadFolder: tempPath,
	}),
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
				.relative(tempPath, uploadedFiles[i].filePath)
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
			if (indexJson.hashes['/' + file.publicPath])
				console.log(
					'[ERROR]: Collision on generated guid !!! Overriding old file...'
				);

			addFileToIndex(file.publicPath, file.hash, file.size);
		});

		if (!dev) await uploadFiles(indexJson, uploadedFiles);
	}
);

uploadFilesHandler.put(
	'/:path',
	uploadFileMiddleware({
		uploadFolder: tempPath,
		filterFileByCategory: false,
	}),
	async (req: Request, res: Response) => {
		if (
			!req.files ||
			!req.params ||
			typeof req.params.path !== 'string' ||
			!isAbsolute(req.params.path)
		)
			return res.json({ ok: false });

		let file: UploadedFile | undefined;
		for (const field in req.files) {
			if (Array.isArray(req.files[field])) {
				return res.json({ ok: false });
			}

			file = req.files[field] as UploadedFile;
		}

		if (!file)
			return res.json({ ok: false });

		if (req.params.path[0] !== '/')
			req.params.path = '/' + req.params.path;

		const publicPath: string = req.params.path;

		res.json({
			ok: true,
			link: linkFromPublicPath(publicPath.slice(1)),
		});

		const uploadedFile: UploadedFileInfo = {
			...file,
			publicPath: publicPath,
		};

		const indexJson = await getFilesIndex();
		addFileToIndex(uploadedFile.publicPath, uploadedFile.hash, uploadedFile.size);

		if (!dev) await uploadFiles(indexJson, [uploadedFile]);
	}
);
