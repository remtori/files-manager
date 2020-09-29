import path from 'path';
import cfg from '../config.json';

export const tempPath = path.join(process.cwd(), './tmp');
export const config = cfg;
