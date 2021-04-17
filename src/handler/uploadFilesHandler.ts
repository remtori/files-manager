import path from 'path';
import fs from 'fs-extra';
import { Router, Request, Response } from 'express';
import dev from 'consts:dev';
import deploySite from 'netlify-partial-deploy';

import { UploadedFile, uploadFileMiddleware } from '../middleware/uploadFile/uploadFileMiddleware';
import { config, tempPath } from '../config';
import { UploadedFileInfo } from '../UploadedFileInfo';
import { netlifyClient } from '../lib/netlify';
import { getFilesIndex, addFileToIndex } from '../filesIndex';
import { isAbsolute, isValidPath, linkFromPublicPath } from '../utils';

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
			const publicPath = '/' + path.relative(tempPath, uploadedFiles[i].filePath).replace(/\\/g, '/');

			console.log(`Received file: ${uploadedFiles[i].name}, save as ${publicPath}`);

			uploadedFiles[i].publicPath = publicPath;
		}

		const uploadFileEntries = uploadedFiles.map(file => [file.name, linkFromPublicPath(file.publicPath)]);

		const indexJson = await getFilesIndex();

		uploadedFiles.forEach(file => {
			if (indexJson.hashes[file.publicPath])
				console.log('[ERROR]: Collision on generated guid !!! Overriding old file...');

			addFileToIndex(file.publicPath, file.hash, file.size);
		});

		await deploySite(
			netlifyClient,
			config.netlifySite,
			indexJson.hashes,
			publicPath => {
				const file = uploadedFiles.find(file => file.publicPath === publicPath);
				if (file === undefined)
					throw new Error(
						`Required file '${publicPath}' is not found in uploadedFiles\n${JSON.stringify(
							uploadedFiles,
							null,
							2
						)}`
					);

				return fs.createReadStream(file.filePath);
			},
			{ statusCb: status => console.log(status.msg) }
		);

		res.json({
			ok: true,
			links: Object.fromEntries(uploadFileEntries),
		});
	}
);

uploadFilesHandler.put(
	'/:path',
	uploadFileMiddleware({
		uploadFolder: tempPath,
		filterFileByCategory: false,
	}),
	async (req: Request, res: Response) => {
		if (!req.files || !req.params || typeof req.params.path !== 'string' || !isAbsolute(req.params.path))
			return res.json({ ok: false });

		let file: UploadedFile | undefined;
		for (const field in req.files) {
			if (Array.isArray(req.files[field])) {
				return res.json({ ok: false });
			}

			file = req.files[field] as UploadedFile;
		}

		if (!file) return res.json({ ok: false });

		if (req.params.path[0] !== '/') req.params.path = '/' + req.params.path;

		const publicPath: string = req.params.path;
		const indexJson = await getFilesIndex();
		if (!isValidPath(publicPath, indexJson)) {
			return res.json({
				ok: false,
				message: 'Invalid file path',
			});
		}

		const uploadedFile: UploadedFileInfo = {
			...file,
			publicPath: publicPath,
		};

		addFileToIndex(uploadedFile.publicPath, uploadedFile.hash, uploadedFile.size);

		await deploySite(
			netlifyClient,
			config.netlifySite,
			indexJson.hashes,
			publicPath => {
				if (uploadedFile.publicPath !== publicPath)
					throw new Error(
						`Required file '${publicPath}' not found, available ${JSON.stringify(uploadedFile)}`
					);

				return fs.createReadStream(uploadedFile.filePath);
			},
			{ statusCb: status => console.log(status.msg) }
		);

		res.json({
			ok: true,
			link: linkFromPublicPath(publicPath.slice(1)),
		});
	}
);
