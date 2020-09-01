import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

import { auth } from './auth';
import { uploadFileHandler } from './uploadFile';

const PORT = process.env.PORT || 4999;
const app = express();

app.use(
    cors({
        origin: [
            /http:\/\/localhost:?\d+/i,
            'https://remtori.netlify.app',
            'https://files-remtori.netlify.app',
            'https://remtori-files.herokuap.com/',
        ],
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
    res.send(`
        <form action="/uploadFile" method="POST" encType="multipart/form-data">
            <input type="file" name="file" id="file" />
            <input type="submit" value="Submit" />
        </form>
    `);
});

app.listen(PORT, () => {
    console.log('Server started! Listening at port: ' + PORT);
});
