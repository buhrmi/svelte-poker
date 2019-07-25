import sirv from 'sirv';
import polka from 'polka';
import compression from 'compression';
import * as sapper from '@sapper/server';

import { Pool } from 'pg';
const pool = new Pool({
  connectionString: 'postgres://localhost:5432/buhrmi',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

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

async function authenticate(req, res, next) {
	// let query = "SELECT user.id from users LEFT JOIN access_tokens ON users.id = access_tokens.user_id WHERE access_tokens.token = ?"
	// let result = await req.db.query(query)
	// console.log(result)
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
		setDatabaseClientForRequest,
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
