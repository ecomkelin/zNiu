const AderIsLogin = require("./aderPath");
const _ = require('underscore');

const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const AderDB = require(path.resolve(process.cwd(), 'app/models/auth/Ader'));

module.exports = (app) => {
	/* ========================================== 添加删除(后期要关闭) ========================================== */
	app.get('/AderAdd', (req, res) => { return res.render('./ader/Ader/add', { title: 'Add Page', curAder : req.session.curAder}); });
	app.post('/AderPost', async(req, res) => {
		try{
			const obj = req.body.obj
			obj.code = obj.code.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();;
			obj.pwd = obj.pwd.replace(/(\s*$)/g, "").replace( /^\s*/, '');
			obj.pwd = await MdFilter.encrypt_Prom(obj.pwd);

			const objSame = await AderDB.findOne({code: obj.code});
			if(objSame) return res.redirect('/?error=此帐号已经被注册，请重新注册&reUrl=/AderAdd');

			const _Ader = new AderDB(obj);
			await _Ader.save();

			return res.redirect('/Aders')
		} catch(error) {
			return res.redirect('/?error=admin添加数据错误 '+error+'&reUrl=/AderAdd')
		}
	})
	app.get('/Aders', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const Aders = await AderDB.find();
			return res.render('./ader/Ader/list', {title: 'Ader列表', curAder, Aders });
		} catch(error) {
			return res.redirect('/?error=查看adimn列表时,数据库查找错误 '+error+'&reUrl=/adHome');
		}
	})
	app.get('/AderDel/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const Ader = await AderDB.findOne({_id: id});
			if(!Ader) return res.redirect('/?error=找不到此账号&reUrl=/Aders');
			const objDel = await AderDB.deleteOne({_id: id});
			return res.redirect('/Aders')
		} catch(error) {
			return res.redirect('/?error=删除adimn时,数据库查找错误'+error+'&reUrl=/Aders')
		}
	})
}