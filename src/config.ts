import path from 'path';
import cfg from '../config.json';

export const tempPath = path.join(process.cwd(), './tmp');
export const repoPath = path.join(tempPath, './files');
export const indexPath = path.join(repoPath, 'index.json');
export const uploadFolderPath = path.join(repoPath, cfg.publishPath);
export const managedFolderPath = path.join(uploadFolderPath, './managed');

export const config = cfg;
