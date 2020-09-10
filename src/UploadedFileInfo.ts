import { UploadedFile } from './middleware/uploadFile/uploadFileMiddleware';

export interface UploadedFileInfo extends UploadedFile {
    publicPath: string;
}
