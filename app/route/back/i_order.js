const path = require('path');
const Order = require(path.resolve(process.cwd(), 'app/controllers/i_order/Order'));
const OrderProd = require(path.resolve(process.cwd(), 'app/controllers/i_order/OrderProd'));
const OrderSku = require(path.resolve(process.cwd(), 'app/controllers/i_order/OrderSku'));
const Order_status = require(path.resolve(process.cwd(), 'app/controllers/i_order/Order_status'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* ============================== OrderProd ============================== */
	app.get('/api/b1/OrderProds', MdAuth.path_User, OrderProd.OrderProds);
	app.get('/api/b1/OrderProds_Analys', MdAuth.path_User, OrderProd.OrderProds_Analys);

	/* ============================== OrderSku ============================== */
	app.delete('/api/b1/OrderSku/:id', MdAuth.path_User, OrderSku.OrderSkuDelete);
	app.put('/api/b1/OrderSku/:id', MdAuth.path_User, OrderSku.OrderSkuPut);
	app.post('/api/b1/OrderSku', MdAuth.path_User, OrderSku.OrderSkuPost);
	app.get('/api/b1/OrderSkus', MdAuth.path_User, OrderSku.OrderSkus);

	/* =============================== Order =============================== */
	app.delete('/api/b1/Order/:id', MdAuth.path_mger, Order.OrderDelete);
	app.post('/api/b1/Order', MdAuth.path_User, Order.OrderPost);
	app.get('/api/b1/Orders', MdAuth.path_User, Order.Orders);
	// app.get('/api/b1/Orders_Analys', Order.Orders_Analys);
	app.get('/api/b1/Orders_Analys', MdAuth.path_User, Order.Orders_Analys);
	app.get('/api/b1/Order/:id', MdAuth.path_User, Order.Order);
	/* ------------------- Order_status ------------------- */
	app.put('/api/b1/Order_change_status/:id', MdAuth.path_User, Order_status.Order_change_status);
};