const path = require('path');
const Prod = require(path.resolve(process.cwd(), 'app/controllers/z_other/Prod'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* =============================== Prod =============================== */
	app.post('/api/b1/price_sale_Prod_percent', MdAuth.path_bser, Prod.price_sale_Prod_percent);
	app.post('/api/b1/price_sale_Prod_recover', MdAuth.path_bser, Prod.price_sale_Prod_recover);
};