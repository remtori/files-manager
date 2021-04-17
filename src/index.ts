import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import dev from 'consts:dev';

import { auth } from './middleware/auth';
import { getFilesIndex } from './filesIndex';
import { config } from './config';
import { uploadFilesHandler } from './handler/uploadFilesHandler';
import { viewFilesHandler } from './handler/viewFilesHandler';
import { onlyHttps } from './handler/onlyHttps';
import { rawFilesHandler } from './handler/rawFilesHandler';

global.PORT = process.env.PORT || 4999;
const app = express();

app.use(
	cors({
		origin: ([/https?:\/\/localhost:?\d+/i] as (string | RegExp)[]).concat(config.origin),
	})
);

app.use(morgan('short'));
if (!dev) app.use(onlyHttps);
app.set('view engine', 'ejs');

app.use(auth());
app.use('/explorer', viewFilesHandler);
app.use('/files', uploadFilesHandler);
app.use('/files', rawFilesHandler);
app.get('/dump', (req, res) => {
	getFilesIndex().then(indexJSON => res.json(indexJSON));
});
app.use('/', express.static(path.join(process.cwd(), './views')));

getFilesIndex().then(indexJSON => {
	// console.log(JSON.stringify(indexJSON, null, 2));

	app.listen(global.PORT, () => {
		console.log('Server started! Listening at port: ' + global.PORT);
	});
});
