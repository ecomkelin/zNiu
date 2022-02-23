const path = require('path');
const Brand = require(path.resolve(process.cwd(), 'app/controllers/g_complement/Brand'));
const Categ = require(path.resolve(process.cwd(), 'app/controllers/g_complement/Categ'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* ------------------------ Brand ------------------------ */
	app.get('/api/v1/Brands', MdAuth.is_Client, Brand.Brands);
	app.get('/api/v1/Brand/:id', MdAuth.is_Client, Brand.Brand);

	/* ------------------------ Categ ------------------------ */
	app.get('/api/v1/Categs', MdAuth.is_Client, Categ.Categs);	
	app.get('/api/v1/Categ/:id', MdAuth.is_Client, Categ.Categ);
};