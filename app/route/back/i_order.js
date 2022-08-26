const path = require('path');
const Order = require(path.resolve(process.cwd(), 'app/controllers/i_order/Order'));
const OrderProd = require(path.resolve(process.cwd(), 'app/controllers/i_order/OrderProd'));
const OrderSku = require(path.resolve(process.cwd(), 'app/controllers/i_order/OrderSku'));
const Order_status = require(path.resolve(process.cwd(), 'app/controllers/i_order/Order_status'));
const Order_Step = require(path.resolve(process.cwd(), 'app/controllers/i_order/Order_Step'));
const Step = require(path.resolve(process.cwd(), 'app/controllers/i_order/Step'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* ============================== OrderProd ============================== */
	app.get('/api/b1/OrderProds', MdAuth.path_User, OrderProd.OrderProds);

	/* ============================== OrderSku ============================== */
	app.delete('/api/b1/OrderSku/:id', MdAuth.path_User, OrderSku.OrderSkuDelete);
	app.put('/api/b1/OrderSku/:id', MdAuth.path_User, OrderSku.OrderSkuPut);
	app.post('/api/b1/OrderSku', MdAuth.path_User, OrderSku.OrderSkuPost);
	app.get('/api/b1/OrderSkus', MdAuth.path_User, OrderSku.OrderSkus);

	/* =============================== Order =============================== */
	app.delete('/api/b1/Order/:id', MdAuth.path_bser, Order.OrderDelete);
	app.post('/api/b1/Order', MdAuth.path_User, Order.OrderPost);
	app.get('/api/b1/Orders', MdAuth.path_User, Order.Orders);
	app.get('/api/b1/Order/:id', MdAuth.path_User, Order.Order);
	app.put('/api/b1/Order/:id', MdAuth.path_bser, Order.OrderPutBack);

	app.get('/api/b1/addTicket/:id', MdAuth.path_User, Order.addTicket);
	app.get('/api/b1/clearTicket', MdAuth.path_User, Order.clearTicket);
	app.get('/api/b1/printTicket', MdAuth.path_User, Order.printTicket);
	app.get('/api/b1/getTickets', MdAuth.path_User, Order.getTickets);

	/* ------------------- Order_status ------------------- */
	app.put('/api/b1/Order_change_status/:id', MdAuth.path_User, Order_status.Order_change_status);

	/* ------------------- Order_Step ------------------- */
	app.put('/api/b1/OrderPutStep/:id', MdAuth.path_User, Order_Step.OrderPutStep);

	/* ------------------- step ------------------- */
	// app.delete('/api/b1/Step/:id', MdAuth.path_bser, Step.StepDelete);
	// app.get('/api/b1/Step/:id', MdAuth.path_User, Step.Step);
	// app.put('/api/b1/Step/:id', MdAuth.path_bser, Step.StepPut);
	// app.post('/api/b1/Step', MdAuth.path_bser, Step.StepPost);
	app.get('/api/b1/Steps/:Shop_id', MdAuth.path_User, Step.Steps);

};