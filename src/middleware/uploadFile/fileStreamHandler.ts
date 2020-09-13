import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'crypto';
import { fileInfoFromContentHead } from './fileInfo';
import { generateID } from '../../lib/guid';
import { Options } from './uploadFileMiddleware';

export interface FileStreamHandler {
	(uploadFolder: string, filename: string, opts: Options): {
		dataHandler(data: Buffer): void;
		getFilePath(): string;
		getFileSize(): number;
		getHash(): string;
		cleanup(): void;
		getPendingPromise(): Promise<void>;
	};
}

export const fileStreamHandler: FileStreamHandler = (
	uploadFolder,
	filename,
	opts
) => {
	let fileSize = 0;
	const hash = createHash('sha1');

	let filePath: string | undefined;
	let writeStream: fs.WriteStream | undefined;
	let writePromise: Promise<void> | undefined;

	return {
		dataHandler(data) {
			if (!writeStream) {
				const { type, ext } = fileInfoFromContentHead(
					data.toString('binary', 0, 16)
				);

				let relPath = generateID();
				if (opts.useFileExtension) {
					const fileExt = ext || path.extname(filename);
					relPath += fileExt;
				}

				if (opts.filterFileByCategory) {
					relPath = path.join(type, relPath);
				}

				filePath = path.join(uploadFolder, relPath);

				fs.ensureDirSync(path.dirname(filePath));
				writeStream = fs.createWriteStream(filePath);
				writePromise = new Promise((resolve, reject) => {
					writeStream!.on('finish', () => resolve());
					writeStream!.on('error', (err) => {
						console.log('Error write file: ' + err);
						reject(err);
					});
				});
			}

			hash.update(data);
			writeStream.write(data);
			fileSize += data.length;
		},
		getFilePath: () => filePath || '',
		getFileSize: () => fileSize,
		getHash: () => hash.digest('hex'),
		cleanup() {
			writeStream && writeStream.end();
			if (filePath)
				fs.remove(filePath).catch((err) =>
					console.log(`Clean up temp file ${filePath} failed: ${err}`)
				);
		},
		getPendingPromise: () => writePromise || Promise.resolve(),
	};
};
