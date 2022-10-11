const path = require('path');
const Prod = require(path.resolve(process.cwd(), 'app/controllers/z_other/Prod'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/** 批量打折 修改 Prod pricre_sale  */
	app.post('/api/b1/price_sale_Prod_percent', MdAuth.path_bser, Prod.price_sale_Prod_percent);
};