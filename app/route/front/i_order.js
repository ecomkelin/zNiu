const path = require('path');
const Order = require(path.resolve(process.cwd(), 'app/controllers/i_order/Order'));
const Order_post = require(path.resolve(process.cwd(), 'app/controllers/i_order/Order_post'));
const Order_status = require(path.resolve(process.cwd(), 'app/controllers/i_order/Order_status'));
const Order_Step = require(path.resolve(process.cwd(), 'app/controllers/i_order/Order_Step'));
const Step = require(path.resolve(process.cwd(), 'app/controllers/i_order/Step'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {

	/* ============================== Order ============================== */
	app.post('/api/v1/Order', MdAuth.path_Client, Order_post.OrderPost);
	app.put('/api/v1/Order/:id', MdAuth.path_Client, Order.OrderPut);
	app.get('/api/v1/Orders', MdAuth.path_Client, Order.Orders);

	/* ============================== OrderStatus ============================== */
	// app.put('/api/v1/Order_proof/:id', MdAuth.path_Client, Order_status.Order_proof);		// 订单商品及Sku校准
	app.put('/api/v1/Order_change_status/:id', MdAuth.path_Client, Order_status.Order_change_status);


	/* ------------------- Order_Step ------------------- */
	app.put('/api/b1/OrderPutStep/:id', MdAuth.path_Client, Order_Step.OrderPutStep);

	/* ------------------- step ------------------- */
	app.get('/api/v1/Steps/:Shop_id', MdAuth.path_Client, Step.Steps);
};