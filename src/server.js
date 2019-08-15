import sirv from 'sirv';
import polka from 'polka';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import * as sapper from '@sapper/server';

// import { Pool } from 'pg';
// const pool = new Pool({
//   connectionString: 'postgres://buka-db.dyndns.org:5432/buhrmi',
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// })

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === 'development';

// Use a database connection from the pool and assign it to the request object
async function setDatabaseClientForRequest(req, res, next) {
	try {
		console.log('CONNECTING')
		req.db = await pool.connect()
		await next()
	}
	catch (e) {
		console.log(e.message)
		res.end(JSON.stringify(e.message))
	}
	finally {
		console.log('RELEASING')
		if (req.db) req.db.release()
	}

}

polka() // You can also use Express
	.use(
		compression({ threshold: 0 }),
		sirv('static', { dev }),
		cookieParser(),
		// setDatabaseClientForRequest,
		// authenticate,
		sapper.middleware({
			session: (req, res) => ({
				access_token: req.cookies.access_token
			})
		})
	)
	.listen(PORT, err => {
		if (err) console.log('error', err);
	});
