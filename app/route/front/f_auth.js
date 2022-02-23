const path = require('path');
const Shop = require(path.resolve(process.cwd(), 'app/controllers/f_auth/Shop'));
const Client = require(path.resolve(process.cwd(), 'app/controllers/f_auth/Client'));
const Bind = require(path.resolve(process.cwd(), 'app/controllers/f_auth/Bind'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* ------------------------------ Shop ------------------------------ */
	app.get('/api/v1/Shops', MdAuth.is_Client, Shop.Shops);
	app.get('/api/v1/Shop/:id', MdAuth.is_Client, Shop.Shop);

	/* ------------------------------ Client ------------------------------ */
	app.get('/api/v1/Client', MdAuth.path_Client, Client.Client);
	app.put('/api/v1/Client', MdAuth.path_Client, Client.vClientPut);

	/* ------------------------------ Bind ------------------------------ */
	app.delete('/api/v1/Bind/:id', MdAuth.path_Client, Bind.BindDelete);
	app.get('/api/v1/Bind/:id', MdAuth.path_Client, Bind.Bind);
	app.put('/api/v1/Bind/:id', MdAuth.path_Client, Bind.BindPut);
	app.get('/api/v1/Binds', MdAuth.path_Client, Bind.Binds);
};
