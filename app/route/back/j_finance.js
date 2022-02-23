const path = require('path');
const Coin = require(path.resolve(process.cwd(), 'app/controllers/j_finance/Coin'));
const Paidtype = require(path.resolve(process.cwd(), 'app/controllers/j_finance/Paidtype'));
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));

module.exports = (app) => {
	/* =============================== Coin =============================== */
	app.delete('/api/b1/Coin/:id', MdAuth.path_bser, Coin.CoinDelete);
	app.post('/api/b1/Coin', MdAuth.path_bser, Coin.CoinPost);
	app.put('/api/b1/Coin/:id', MdAuth.path_bser, Coin.CoinPut);
	app.get('/api/b1/Coins', MdAuth.path_bser, Coin.Coins);
	app.get('/api/b1/Coin/:id', MdAuth.path_bser, Coin.Coin);

	/* =============================== Paidtype =============================== */
	app.delete('/api/b1/Paidtype/:id', MdAuth.path_bser, Paidtype.PaidtypeDelete);
	app.post('/api/b1/Paidtype', MdAuth.path_bser, Paidtype.PaidtypePost);
	app.put('/api/b1/Paidtype/:id', MdAuth.path_bser, Paidtype.PaidtypePut);
	app.get('/api/b1/Paidtypes', MdAuth.path_bser, Paidtype.Paidtypes);
	app.get('/api/b1/Paidtype/:id', MdAuth.path_bser, Paidtype.Paidtype);
};