const AderIsLogin = require("./aderPath");

const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const AderDB = require(path.resolve(process.cwd(), 'app/models/auth/Ader'));
const FirmDB = require(path.resolve(process.cwd(), 'app/models/auth/Firm'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));

module.exports = (app) => {

	/* ========================================== Ader 首页 登录页面 登录 登出 ========================================== */
	app.get('/adHome', async(req, res, next) => {
		const Firms = await FirmDB.find();
		const Shops = await ShopDB.find();
		return res.render('./ader/adHome', {title: '超级管理', Firms, Shops, curAder : req.session.curAder}); 
	});
	app.post('/loginAder', async(req, res) => {
		try {
			const code = req.body.code.replace(/^\s*/g,"").toUpperCase();
			const pwd = req.body.pwd.replace(/^\s*/g,"");
			let Ader = await AderDB.findOne({code: code});
			if(!Ader) return res.redirect('/?error=Adminnistrator Code 不正确, 请重新登陆&reUrl=/adHome');

			const pwd_match_res = await MdFilter.matchBcryptProm(pwd, Ader.pwd);
			if(pwd_match_res.status != 200) return res.redirect('/?error=Adminnistrator Code 密码不符, 请重新登陆&reUrl=/adHome');

			req.session.curAder = Ader
			return res.redirect('/adHome')
		} catch(error) {
			return res.redirect('/?error=admin登录时数据库错误, 请联系管理员&reUrl=/adHome');
		}
	});

	app.get('/logout', (req, res) => {
		delete req.session.curAder;
		return res.redirect('/');
	});
}