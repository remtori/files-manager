import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import dev from 'consts:dev';

import { auth } from './middleware/auth';
import { uploadFileHandler } from './routes/uploadFileHandler';
import cfg from '../config.json';
import { getFilesIndex } from './filesIndex';
import { uploadFolderPath } from './config';
import { getFilesListHandler } from './routes/getFilesList';

global.PORT = process.env.PORT || 4999;
const app = express();

app.use(
    cors({
        origin: ([/https?:\/\/localhost:?\d+/i] as (string | RegExp)[]).concat(
            cfg.origin
        ),
    })
);

app.use(morgan('short'));

if (!dev) {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https')
            res.redirect(`https://${req.header('host')}${req.url}`);
        else next();
    });
}

app.use(auth());
app.use('/uploadFile', uploadFileHandler);
app.use('/filesList', getFilesListHandler);
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), './src/page.html'));
});

if (dev) {
    app.use('/publish', express.static(uploadFolderPath));
}

getFilesIndex().then(() => {
    app.listen(global.PORT, () => {
        console.log('Server started! Listening at port: ' + global.PORT);
    });
});
