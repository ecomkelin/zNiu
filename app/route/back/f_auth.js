const path = require('path');
const Lang = require(path.resolve(process.cwd(), 'app/controllers/f_auth/Lang'));
const Firm = require(path.resolve(process.cwd(), 'app/controllers/f_auth/Firm'));
const Shop = require(path.resolve(process.cwd(), 'app/controllers/f_auth/Shop'));
const Supplier = require(path.resolve(process.cwd(), 'app/controllers/f_auth/Supplier'));
const User = require(path.resolve(process.cwd(), 'app/controllers/f_auth/User'));
const Bind = require(path.resolve(process.cwd(), 'app/controllers/f_auth/Bind'));
const Client = require(path.resolve(process.cwd(), 'app/controllers/f_auth/Client'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* ------------------------ Lang ------------------------ */
	app.get('/api/b1/Langs', MdAuth.path_ower, Lang.Langs);
	app.post('/api/b1/Lang', MdAuth.path_ower, Lang.LangPost);
	app.put('/api/b1/Lang/:id', MdAuth.path_ower, Lang.LangPut);

	/* ------------------------ Firm ------------------------ */
	app.get('/api/b1/Firm/:id', MdAuth.path_User, Firm.Firm);
	app.put('/api/b1/Firm/:id', MdAuth.path_mger, Firm.FirmPut);

	/* ------------------------ Shop ------------------------ */
	app.delete('/api/b1/Shop/:id', MdAuth.path_mger, Shop.ShopDelete);
	app.get('/api/b1/Shop/:id', MdAuth.path_User, Shop.Shop);
	app.put('/api/b1/Shop/:id', MdAuth.by_bser, Shop.ShopPut);
	app.post('/api/b1/Shop', MdAuth.path_mger, Shop.ShopPost);
	app.get('/api/b1/Shops', MdAuth.path_User, Shop.Shops);

	/* ------------------------ User ------------------------ */
	app.delete('/api/b1/User/:id', MdAuth.by_bser, User.UserDelete);
	app.get('/api/b1/User/:id', MdAuth.path_User, User.User);
	app.put('/api/b1/User/:id', MdAuth.path_User, User.UserPut);
	app.post('/api/b1/User', MdAuth.by_bser, User.UserPost);
	app.get('/api/b1/Users', MdAuth.by_bser, User.Users);

	/* ------------------------ Supplier ------------------------ */
	app.delete('/api/b1/Supplier/:id', MdAuth.by_bser, Supplier.SupplierDelete);
	app.get('/api/b1/Supplier/:id', MdAuth.path_User, Supplier.Supplier);
	app.put('/api/b1/Supplier/:id', MdAuth.by_bser, Supplier.SupplierPut);
	app.post('/api/b1/Supplier', MdAuth.by_bser, Supplier.SupplierPost);
	app.get('/api/b1/Suppliers', MdAuth.path_User, Supplier.Suppliers);

	// /* ------------------------ Client ------------------------ */
	app.delete('/api/b1/Client/:id', MdAuth.by_bser, Client.ClientDelete);
	app.get('/api/b1/Client/:id', MdAuth.path_User, Client.Client);
	app.put('/api/b1/Client/:id', MdAuth.path_User, Client.ClientPut);
	app.post('/api/b1/Client', MdAuth.path_User, Client.ClientPost);
	app.get('/api/b1/Clients', MdAuth.path_User, Client.Clients);

	/* ------------------------ Bind ------------------------ */
	app.delete('/api/b1/Bind/:id', MdAuth.path_User, Bind.BindDelete);
	app.get('/api/b1/Bind/:id', MdAuth.path_User, Bind.Bind);
	app.put('/api/b1/Bind/:id', MdAuth.path_User, Bind.BindPut);
	app.get('/api/b1/Binds', MdAuth.path_User, Bind.Binds);
};
