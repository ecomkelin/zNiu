const path = require('path');
const MdJwt = require(path.resolve(process.cwd(), 'app/middle/MdJwt'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const Authorization = require(path.resolve(process.cwd(), 'app/controllers/Authorization'));

module.exports = (app) => {
	/* ============= 用户登录 ============= */
	app.get('/api/b1/refreshtoken', (req, res) => {
		console.log('/b1/refreshtoken');
		Authorization.refreshtoken(req, res, UserDB);
	});

	app.delete('/api/b1/logout', (req, res) => {
		console.log('/b1/logout');
		Authorization.logout(req, res, UserDB);
	});

	app.post('/api/b1/login', (req, res) => {
		console.log('/b1/login');
		Authorization.login(req, res, UserDB);
	});
};