import { UploadedFile } from './uploadFile/uploadFileMiddleware';
export interface UploadedFileInfo extends UploadedFile {
    publicPath: string;
}
