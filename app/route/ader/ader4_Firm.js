const AderIsLogin = require("./aderPath");

const _ = require('underscore')

const path = require('path');
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const FirmDB = require(path.resolve(process.cwd(), 'app/models/auth/Firm'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const PdDB = require(path.resolve(process.cwd(), 'app/models/product/Pd'));

module.exports = (app) => {

	app.get('/adFirms', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const Firms = await FirmDB.find()
				.sort({'is_usable': -1, sort: -1});
			return res.render('./ader/Firm/list', {title: '公司列表', curAder, Firms});
		} catch(error) {
			return res.redirect('/?error=adFirms Error: '+error+'&reUrl=/adHome');
		}
	})

	app.get('/adFirmAdd', AderIsLogin, (req, res) => {
		return res.render('./ader/Firm/add', {
			title: '添加新公司',
			curAder : req.session.curAder,
		})
	})

	app.post('/adFirmPost', AderIsLogin, async(req, res) => {
		try{
			let obj = req.body.obj;
			obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

			const param = {
				$or:[
					{'code': obj.code},
					{'nome': obj.nome}
				]
			};
			const objSame = await FirmDB.findOne(param);
			if(objSame) {
				let error = "不可添加";
				if(objSame.code == obj.code) error = "此公司编号已经存在";
				if(objSame.nome == obj.nome) error = "此公司名称已经存在";
				return res.redirect('/?error='+error+'&reUrl=/adFirmAdd');
			}
			const _object = new FirmDB(obj)
			const objSave = await _object.save();
			return res.redirect('/adFirms');
		} catch(error) {
			return res.redirect('/?error=adFirmPost,Error: '+error+'&reUrl=/adFirmAdd');
		}
	});

	app.get('/adFirm/:id', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const id = req.params.id;
			const Firm = await FirmDB.findOne({_id: id});
			if(!Firm) return res.redirect('/?error=没有找到此公司&reUrl=/adFirms');

			return res.render('./ader/Firm/detail', {title: '公司详情', curAder, Firm});
		} catch(error) {
			return res.redirect('/?error=adFirm,Error: '+error+'&reUrl=/adFirms');
		}
	});

	app.post('/adFirmPut/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const obj = req.body.obj;
			if(obj.code) obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			if(obj.nome) obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();

			const Firm = await FirmDB.findOne({_id: id});

			const param = {
				$or:[
					{'code': obj.code},
					{'nome': obj.nome}
				]
			};
			const objSame = await FirmDB.findOne(param)
				.where('_id').ne(Firm._id);
			if(objSame) {
				let error = "不可修改";
				if(objSame.code == obj.code) error = "此公司编号已经存在";
				if(objSame.nome == obj.nome) error = "此公司名称已经存在";
				return res.redirect('/?error='+error+'&reUrl=/adFirm/'+id);
			}

			const _object = _.extend(Firm, obj);
			const objSave = await _object.save();
			return res.redirect('/adFirm/'+id);
		} catch(error) {
			return res.redirect('/?error=adFirmPost,Error: '+error+'&reUrl=/adFirm/'+id);
		}
	});

	app.get('/adFirmDel/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const FirmExist = await FirmDB.findOne({_id: id});
			if(!FirmExist) return res.redirect('/?error=没有找到此公司&reUrl=/adFirms');

			const Pd = await PdDB.findOne({Firm: id});
			if(Pd) return res.redirect('/?error=adAreaDel 此公司中有产品, 不可删除');

			const User = await UserDB.findOne({Firm: id});
			if(User) return res.redirect('/?error=此公司中还有员工，请先删除此公司的员工&reUrl=/adFirms');

			const Shop = await ShopDB.findOne({Firm: id});
			if(Shop) return res.redirect('/?error=此公司中还有店铺，请先删除此店铺&reUrl=/adFirms');
					
			const objDel = await FirmDB.deleteOne({_id: id});
			return res.redirect("/adFirms");
		} catch(error) {
			return res.redirect('/?error=adFirmDel,Error: '+error+'&reUrl=/adFirms');
		}
	});

}