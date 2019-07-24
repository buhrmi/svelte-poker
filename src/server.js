import sirv from 'sirv';
import polka from 'polka';
import compression from 'compression';
import * as sapper from '@sapper/server';

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === 'development';

function authenticate(req, res, next) {
	req.user = {
		id: 1,
		access_token: 'user-1-token'
	}
	next()
}

polka() // You can also use Express
	.use(
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		authenticate,
		sapper.middleware({
			session: (req, res) => ({
				user: req.user
			})
		})
	)
	.listen(PORT, err => {
		if (err) console.log('error', err);
	});
