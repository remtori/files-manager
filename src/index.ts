import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import dev from 'consts:dev';

import { auth } from './middleware/auth';
import { getFilesIndex } from './filesIndex';
import { uploadFolderPath, config } from './config';
import { uploadFilesHandler } from './routes/uploadFilesHandler';

global.PORT = process.env.PORT || 4999;
const app = express();

app.use(
	cors({
		origin: ([/https?:\/\/localhost:?\d+/i] as (string | RegExp)[]).concat(
			config.origin
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
app.use('/files', uploadFilesHandler);
app.use('/files', express.static(uploadFolderPath));
app.get('/', (req, res) => {
	res.sendFile(path.join(process.cwd(), './src/page.html'));
});


getFilesIndex().then(() => {
	app.listen(global.PORT, () => {
		console.log('Server started! Listening at port: ' + global.PORT);
	});
});
