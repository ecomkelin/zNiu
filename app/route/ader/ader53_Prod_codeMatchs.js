const AderIsLogin = require("./aderPath");

const path = require('path');

module.exports = (app) => {

	app.get('Prod_codeMatchs', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			
			
			return res.redirect('/adShops');
		} catch(error) {
			return res.redirect('/?error=adShops,Error: '+error+'&reUrl=/adHome');
		}
	});

}