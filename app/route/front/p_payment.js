const bodyParser = require("body-parser");

const path = require('path');
const Payment = require(path.resolve(process.cwd(), 'app/controllers/p_payment/Payment'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* ========================================== Payment ========================================== */
	/* -------------------------------------- stripe -------------------------------------- */
	app.post('/api/v1/create-checkout-session', MdAuth.path_Client, Payment.stripePayment);
	app.post('/api/v1/webhook', bodyParser.raw({type: 'application/json'}), Payment.webhook);

	/* -------------------------------------- paypel -------------------------------------- */
	app.post('/api/v1/create-order', MdAuth.path_Client, Payment.paypalPayment);
	app.post('/api/v1/check-order', Payment.paypalCheckout);
};