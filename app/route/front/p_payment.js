const bodyParser = require("body-parser");

const path = require('path');
const Payment = require(path.resolve(process.cwd(), 'app/controllers/p_payment/Payment'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

const xmlparser = require('express-xml-bodyparser');

module.exports = (app) => {
	/* ========================================== Payment ========================================== */
	/* -------------------------------------- stripe -------------------------------------- */
	app.post('/api/v1/create-checkout-session', MdAuth.path_Client, Payment.stripePayment);
	app.post('/api/v1/webhook', bodyParser.raw({type: 'application/json'}), Payment.webhook);

	/* -------------------------------------- paypel -------------------------------------- */
	app.post('/api/v1/create-order', MdAuth.path_Client, Payment.paypalPayment);
	app.post('/api/v1/check-order', Payment.paypalCheckout);

	/* -------------------------------------- weixin -------------------------------------- */
	app.post('/api/v1/wxPayment', MdAuth.path_Client,  Payment.wxPayment);
	app.post('/api/v1/wxPaymentSuccess', MdAuth.path_Client,  Payment.wxPaymentSuccess);
	app.post('/api/v1/wx_notify_url', xmlparser({trim: false, explicitArray: false}), Payment.wx_notify_url);

	/**  货到付款？ */
	app.post('/api/v1/payAfter', MdAuth.path_Client,  Payment.payAfter);

};