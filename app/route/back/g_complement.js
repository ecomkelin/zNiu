const path = require('path');
const Brand = require(path.resolve(process.cwd(), 'app/controllers/g_complement/Brand'));
const Categ = require(path.resolve(process.cwd(), 'app/controllers/g_complement/Categ'));
const Pnome = require(path.resolve(process.cwd(), 'app/controllers/g_complement/Pnome'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* ------------------------ Brand ------------------------ */
	app.delete('/api/b1/Brand/:id', MdAuth.path_bser, Brand.BrandDelete);
	app.get('/api/b1/Brand/:id', MdAuth.path_User, Brand.Brand);
	app.put('/api/b1/Brand/:id', MdAuth.path_bser, Brand.BrandPut);
	app.post('/api/b1/Brand', MdAuth.path_bser, Brand.BrandPost);
	app.get('/api/b1/Brands', MdAuth.path_User, Brand.Brands);

	/* ------------------------ Categ ------------------------ */
	app.delete('/api/b1/Categ/:id', MdAuth.path_bser, Categ.CategDelete);
	app.get('/api/b1/Categ/:id', MdAuth.path_User, Categ.Categ);
	app.put('/api/b1/Categ/:id', MdAuth.path_bser, Categ.CategPut);
	app.post('/api/b1/Categ', MdAuth.path_bser, Categ.CategPost);
	app.get('/api/b1/Categs', MdAuth.path_User, Categ.Categs);


	/* ------------------------ Pnome ------------------------ */
	app.get('/api/b1/PnomeRevise', MdAuth.path_User, Pnome.PnomeRevise);
	app.get('/api/b1/Pnomes', MdAuth.path_User, Pnome.Pnomes);
};