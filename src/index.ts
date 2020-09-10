import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import dev from 'consts:dev';

import { auth } from './auth';
import { uploadFileHandler } from './uploadFileHandler';
import cfg from '../config.json';
import { getFilesIndex } from './filesIndex';

const PORT = process.env.PORT || 4999;
const app = express();

app.use(
    cors({
        origin: ([/https?:\/\/localhost:?\d+/i] as (string | RegExp)[]).concat(
            cfg.origin
        ),
    })
);

app.use(morgan('short'));

if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https')
            res.redirect(`https://${req.header('host')}${req.url}`);
        else next();
    });
}

app.use(auth());
app.use('/uploadFile', uploadFileHandler);
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), './src/page.html'));
});

if (dev) {
    app.use(
        '/publish',
        express.static(path.join('./tmp', cfg.repo, cfg.publishPath))
    );
}

getFilesIndex().then(() => {
    app.listen(PORT, async () => {
        console.log('Server started! Listening at port: ' + PORT);
    });
});
