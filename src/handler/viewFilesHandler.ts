import { encode as queryEncode, decode as queryDecode } from 'querystring';
import { Request, Response, Router } from 'express';
import { getFilesIndex, IFileNode } from '../filesIndex';
import { getFileNode } from '../utils';

export const viewFilesHandler = Router();

viewFilesHandler.get('/*', async (req: Request, res: Response) => {
	const indexJSON = await getFilesIndex();
	const fileNode = getFileNode(req.path, indexJSON);
	if (typeof fileNode === 'boolean') {
		return res.sendStatus(404);
	}

	const queryIndex = req.originalUrl.indexOf('?');
	const queryString =
		queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
	const queryObject = queryDecode(queryString.slice(1));

	const paths = req.path.split('/');
	const urlPaths = paths.slice(0);
	paths[0] = 'root';

	const config: {
		sort: 'name' | 'size';
		order: 'ascending' | 'descending';
		display: 'list' | 'grid' | 'columns';
	} = Object.assign(
		{
			display: 'list',
			sort: 'name',
			order: 'ascending',
		},
		queryObject
	) as any;

	res.render('template', {
		config,
		request: req,
		paths,
		fileNode,
		queryString,
		queryObject,
		urlPaths: urlPaths.map(
			(_, i) => `/explorer${urlPaths.slice(0, i + 1).join('/')}`
		),
		fileList: Object.values(fileNode.children || {}).sort((a, b) => {
			const priority = a[config.sort] < b[config.sort] ? -1 : 1;
			if (a[config.sort] == b[config.sort]) return 0;
			return config.order == 'descending' ? -priority : priority;
		}),
		setQuery: (key: string, value: string) => {
			return (
				'?' +
				queryEncode(
					Object.assign({}, queryObject, {
						[key]: value,
					})
				)
			);
		},
	});
});
