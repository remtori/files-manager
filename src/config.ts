import path from 'path';
import cfg from '../config.json';

export const repoPath = path.join(process.cwd(), './tmp');
export const indexPath = path.join(repoPath, 'index.json');
export const uploadFolderPath = path.join(repoPath, cfg.publishPath);

export const config = cfg;
