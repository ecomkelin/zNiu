const path = require('path');
const Prod = require(path.resolve(process.cwd(), 'app/controllers/h_product/Prod'));
const Sku = require(path.resolve(process.cwd(), 'app/controllers/h_product/Sku'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* ================================== Prod ================================== */
	app.get('/api/v1/Prods', MdAuth.is_Client, Prod.Prods);
	app.get('/api/v1/Prod/:id', MdAuth.is_Client, Prod.Prod);

	/* ================================== Sku ================================== */
	app.get('/api/v1/Skus', MdAuth.is_Client, Sku.Skus);
	app.get('/api/v1/Sku/:id', MdAuth.is_Client, Sku.Sku);
};