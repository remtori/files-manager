import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'crypto';
import { fileInfoFromContentHead } from './fileInfo';
import { generateID } from '../../lib/guid';

export interface FileStreamHandler {
	(uploadFolder: string, filename: string): {
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
	filename
) => {
	let fileSize = 0;
	const hash = createHash('sha1');

	let filePath: string | undefined;
	let writeStream: fs.WriteStream | undefined;
	let writePromise: Promise<void> | undefined;

	return {
		dataHandler(data) {
			if (writeStream) {
				hash.update(data);
				writeStream.write(data);
				fileSize += data.length;
				return;
			}

			const { type, ext } = fileInfoFromContentHead(
				data.toString('binary')
			);
			const fileExt = ext || path.extname(filename);
			filePath = path.join(
				uploadFolder,
				type,
				`${generateID()}${fileExt}`
			);

			fs.ensureDirSync(path.dirname(filePath));
			writeStream = fs.createWriteStream(filePath);
			writePromise = new Promise((resolve, reject) => {
				writeStream!.on('finish', () => resolve());
				writeStream!.on('error', (err) => {
					console.log('Error write file: ' + err);
					reject(err);
				});
			});
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
