import { Request, Response } from 'express';
import Busboy from 'busboy';
import path from 'path';

import { isEligibleRequest } from './isEligibleRequest';
import { TimeoutTimer } from './TimeoutTimer';
import { FileStreamHandler, fileStreamHandler } from './fileStreamHandler';
import { applyField } from './utils';

const waitFlushProperty = Symbol('wait flush property symbol');

export interface UploadedFile {
	name: string;
	filePath: string;
	hash: string;
	size: number;
	encoding: string;
	mimeType: string;
}

declare global {
	namespace Express {
		interface Request {
			files?: {
				[field: string]: UploadedFile | UploadedFile[];
			};
			[waitFlushProperty]?: Promise<void>[];
		}
	}
}

export interface Options {
	uploadTimeout: number;
	uploadFolder: string;
	fileStreamHandler: FileStreamHandler;
	filterFileByCategory: boolean;
	useFileExtension: boolean;
}

export const uploadFileMiddleware = (opts: Partial<Options>) => (
	req: Request,
	res: Response,
	next: (err?: Error) => void
) => {
	const options: Options = Object.assign(
		{
			uploadTimeout: 30 * 60 * 1000,
			uploadFolder: path.join(process.cwd(), 'tmp'),
			fileStreamHandler: fileStreamHandler,
			filterFileByCategory: true,
			useFileExtension: true,
		},
		opts
	);

	if (!isEligibleRequest(req)) {
		console.log('Request is not eligible for file upload!');
		return next();
	}

	const busboy = new Busboy({ headers: req.headers });

	busboy.on('field', (field, value) => (req.body = applyField(req.body, field, value)));

	busboy.on('file', (field, file, filename, encoding, mime) => {
		const {
			dataHandler,
			getFilePath,
			getFileSize,
			getHash,
			cleanup,
			getPendingPromise,
		} = options.fileStreamHandler(options.uploadFolder, filename, options);

		const uploadTimer = new TimeoutTimer(options.uploadTimeout, () => {
			file.removeAllListeners('data');
			file.resume();

			// file.destroy() is an internal API
			// available only for NodeJS File Stream (not all ReadableStream interface)
			(file as any).destroy(new Error(`Upload timeout ${field}->${filename}, bytes:${getFileSize()}`));
		});

		file.on('limit', () => {
			console.log(`Size limit reached for ${field}->${filename}, bytes:${getFileSize()}`);

			uploadTimer.stop();
		});

		file.on('data', data => {
			uploadTimer.reset();
			dataHandler(data);
		});

		file.on('end', () => {
			uploadTimer.stop();
			const size = getFileSize();

			if (!filename && size === 0) {
				cleanup();
				return;
			}

			req.files = applyField(req.files, field, {
				name: filename,
				filePath: getFilePath(),
				hash: getHash(),
				size,
				encoding,
				mimeType: mime,
			});
		});

		file.on('error', (err: Error) => {
			uploadTimer.stop();
			console.log(err);
			cleanup();
			next();
		});

		if (!req[waitFlushProperty]) req[waitFlushProperty] = [];
		req[waitFlushProperty]!.push(getPendingPromise());

		uploadTimer.start();
	});

	busboy.on('finish', () => {
		if (!req[waitFlushProperty]) return next();

		Promise.all(req[waitFlushProperty] as Promise<void>[])
			.then(() => {
				delete req[waitFlushProperty];
				next();
			})
			.catch(err => {
				delete req[waitFlushProperty];
				console.log(`Error while waiting files flush: ${err}`);
				next(err);
			});
	});

	busboy.on('error', (err: Error) => {
		console.log('Busboy error');
		next(err);
	});

	req.pipe(busboy);
};
