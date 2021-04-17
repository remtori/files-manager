const NetlifyAPI = require('netlify');

export interface NetlifyFile {
	id: string;
	path: string;
	sha: string;
	size: number;
}

export const netlifyClient: {
	listSiteFiles: (options: { site_id: string }) => Promise<NetlifyFile[]>;
} = new NetlifyAPI(process.env.NETLIFY_TOKEN);
