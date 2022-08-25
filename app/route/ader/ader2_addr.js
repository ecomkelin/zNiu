const AderIsLogin = require("./aderPath");

const _ = require('underscore')

const path = require('path');
const Stint = require(path.resolve(process.cwd(), 'app/config/Stint'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const AreaDB = require(path.resolve(process.cwd(), 'app/models/address/Area'));
const CitaDB = require(path.resolve(process.cwd(), 'app/models/address/Cita'));
const NationDB = require(path.resolve(process.cwd(), 'app/models/address/Nation'));
const PdDB = require(path.resolve(process.cwd(), 'app/models/product/Pd'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

module.exports = (app) => {
	/* ========================================== Nation ========================================== */
	app.get('/adNations', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const Nations = await NationDB.find()
				.sort({is_usable: -1, sort: -1, code: -1});
			return res.render('./ader/Nation/list', {title: '国家列表', curAder, Nations});
		} catch(error) {
			return res.redirect('/?error=adNations Error: '+error+'&reUrl=/adHome');
		}
	})

	app.get('/adNationAdd', AderIsLogin, (req, res) => {res.render('./ader/Nation/add', {title: '添加新国家',curAder : req.session.curAder})})

	app.post('/adNationPost', AderIsLogin, async(req, res) => {
		try{
			let obj = req.body.obj;
			const errorInfo = MdFilter.objMatchStint(Stint.Nation, obj, ['code', 'nome', 'tel']);
			obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
			if(errorInfo) return res.redirect('/?error=adNationPost,Error: '+errorInfo+'&reUrl=/adNationAdd');

			const param = {
				$or:[
					{'code': obj.code},
					{'nome': obj.nome},
					{'tel': obj.tel}
				]
			};
			const objSame = await NationDB.findOne(param);
			if(objSame) {
				let error = "不可添加";
				if(objSame.code == obj.code) error = "此国家编号已经存在";
				if(objSame.nome == obj.nome) error = "此国家名称已经存在";
				return res.redirect('/?error='+error+'&reUrl=/adNationAdd');
			}
			const _object = new NationDB(obj)
			const objSave = await _object.save();
			return res.redirect('/adNations');
		} catch(error) {
			return res.redirect('/?error=adNationPost,Error: '+error+'&reUrl=/adNationAdd');
		}
	});

	app.get('/adNation/:id', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const id = req.params.id;
			const Nation = await NationDB.findOne({_id: id});
			if(!Nation) return res.redirect('/?error=没有找到此国家&reUrl=/adNations');

			return res.render('./ader/Nation/detail', {title: '国家详情', curAder, Nation});
		} catch(error) {
			return res.redirect('/?error=adNation,Error: '+error+'&reUrl=/adNations');
		}
	});

	app.post('/adNationPut/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const obj = req.body.obj;
			if(obj.code) obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			if(obj.nome) obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();

			const Nation = await NationDB.findOne({_id: id});

			const param = {
				$or:[
					{'code': obj.code},
					{'nome': obj.nome}
				]
			};
			const objSame = await NationDB.findOne(param)
				.where('_id').ne(Nation._id);
			if(objSame) {
				let error = "不可修改";
				if(objSame.code == obj.code) error = "此国家编号已经存在";
				if(objSame.nome == obj.nome) error = "此国家名称已经存在";
				return res.redirect('/?error='+error+'&reUrl=/adNation/'+id);
			}

			const _object = _.extend(Nation, obj);
			const objSave = await _object.save();
			return res.redirect('/adNation/'+id);
		} catch(error) {
			return res.redirect('/?error=adNationPost,Error: '+error+'&reUrl=/adNation/'+id);
		}
	});

	app.get('/adNationDel/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const NationExist = await NationDB.findOne({_id: id});
			if(!NationExist) return res.redirect('/?error=没有找到此国家&reUrl=/adNations');
			const Area = await AreaDB.findOne({Nation: id});
			if(Area) return res.redirect('/?error=adAreaDel 请先删除国家中的城市');
			const Pd = await PdDB.findOne({Nation: id});
			const Prod = await ProdDB.findOne({Nation: id});
			if(Pd || Prod) return res.redirect('/?error=adAreaDel 此国家中有产品, 不可删除');

			const objDel = await NationDB.deleteOne({_id: id});
			return res.redirect("/adNations");
		} catch(error) {
			return res.redirect('/?error=adNationDel,Error: '+error+'&reUrl=/adNations');
		}
	});

	/* ========================================== Area ========================================== */
	app.get('/adAreas', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const Areas = await AreaDB.find()
				.populate('Nation', 'code')
				.sort({'is_usable': -1, sort: -1});
			return res.render('./ader/Area/list', {title: '大区列表', curAder, Areas});
		} catch(error) {
			return res.redirect('/?error=adAreas Error: '+error+'&reUrl=/adHome');
		}
	})

	app.get('/adAreaAdd', AderIsLogin, async(req, res) => {
		try{
			const Nations = await NationDB.find({is_usable: 1});
			return res.render('./ader/Area/add', {
				title: '添加新大区',
				curAder : req.session.curAder,
				Nations
			})
		} catch(error) {
			return res.redirect('/?error=adAreaAdd Error: '+error+'&reUrl=/adAreas');
		}
	})

	app.post('/adAreaPost', AderIsLogin, async(req, res) => {
		try{
			let obj = req.body.obj;

			const errorInfo = MdFilter.objMatchStint(Stint.Area, obj, ['code', 'nome']);
			obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
			if(errorInfo) return res.redirect('/?error='+errorInfo+'&reUrl=/adAreaAdd');

			if(obj.Nation) {
				const Nation = await NationDB.findOne({_id: obj.Nation});
				if(!Nation) return res.redirect('/?error=adAreaPost 请重新添加, 因为没有此国家')
			} else {
				obj.Nation = null;
			}
			const param = {
				$or:[
					{'code': obj.code},
					{'nome': obj.nome}
				]
			};
			const objSame = await AreaDB.findOne(param);
			if(objSame) {
				let error = "不可添加";
				if(objSame.code == obj.code) error = "此大区编号已经存在";
				if(objSame.nome == obj.nome) error = "此大区名称已经存在";
				return res.redirect('/?error='+error+'&reUrl=/adAreaAdd');
			}
			const _object = new AreaDB(obj)
			const objSave = await _object.save();
			return res.redirect('/adAreas');
		} catch(error) {
			return res.redirect('/?error=adAreaPost,Error: '+error+'&reUrl=/adAreaAdd');
		}
	});

	app.post('/adAreaPut/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const obj = req.body.obj;
			if(obj.code) obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			if(obj.nome) obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();

			const Area = await AreaDB.findOne({_id: id});

			const param = {
				$or:[
					{'code': obj.code},
					{'nome': obj.nome}
				]
			};
			const objSame = await AreaDB.findOne(param)
				.where('_id').ne(Area._id);
			if(objSame) {
				let error = "不可修改";
				if(objSame.code == obj.code) error = "此大区编号已经存在";
				if(objSame.nome == obj.nome) error = "此大区名称已经存在";
				return res.redirect('/?error='+error+'&reUrl=/adArea/'+id);
			}

			const _object = _.extend(Area, obj);
			const objSave = await _object.save();
			return res.redirect('/adArea/'+id);
		} catch(error) {
			return res.redirect('/?error=adAreaPost,Error: '+error+'&reUrl=/adArea/'+id);
		}
	});

	app.get('/adAreaDel/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const AreaExist = await AreaDB.findOne({_id: id});
			if(!AreaExist) return res.redirect('/?error=没有找到此大区&reUrl=/adAreas');
			
			const Cita = await CitaDB.findOne({Area: id});
			if(Cita) return res.redirect('/?error=adAreaDel 大区中还存在城市 不可删除');

			const objDel = await AreaDB.deleteOne({_id: id});
			return res.redirect("/adAreas");
		} catch(error) {
			return res.redirect('/?error=adAreaDel,Error: '+error+'&reUrl=/adAreas');
		}
	});


	/* ========================================== Cita ========================================== */
	app.get('/adCitas', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const Citas = await CitaDB.find()
				.populate('Area', 'code')
				.sort({'is_usable': -1, 'nome': 1});
			return res.render('./ader/Cita/list', {title: '城市列表', curAder, Citas});
		} catch(error) {
			return res.redirect('/?error=adCitas Error: '+error+'&reUrl=/adHome');
		}
	})

	app.get('/adCitaAdd', AderIsLogin, async(req, res) => {
		try{
			const Areas = await AreaDB.find({is_usable: 1}).sort({sort: -1});
			return res.render('./ader/Cita/add', {
				title: '添加新城市',
				curAder : req.session.curAder,
				Areas
			})
		} catch(error) {
			return res.redirect('/?error=adCitaAdd Error: '+error+'&reUrl=/adCitas');
		}
	})

	app.post('/adCitaPost', AderIsLogin, async(req, res) => {
		try{
			let obj = req.body.obj;

			const errorInfo = MdFilter.objMatchStint(Stint.Cita, obj, ['code', 'nome']);
			obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
			if(errorInfo) return res.redirect('/?error='+errorInfo+'&reUrl=/adCitaAdd');

			if(obj.Area) {
				const Area = await AreaDB.findOne({_id: obj.Area});
				if(!Area) return res.redirect('/?error=adCitaPost 请重新添加, 因为没有此国家&reUrl=/adCitaAdd')
			} else {
				obj.Area = null;
			}
			const param = {
				$or:[
					{'code': obj.code},
					{'nome': obj.nome}
				]
			};
			const objSame = await CitaDB.findOne(param);
			if(objSame) {
				let error = "不可添加";
				if(objSame.code == obj.code) error = "此城市编号已经存在";
				if(objSame.nome == obj.nome) error = "此城市名称已经存在";
				return res.redirect('/?error='+error+'&reUrl=/adCitaAdd');
			}
			const _object = new CitaDB(obj)
			const objSave = await _object.save();
			return res.redirect('/adCitas');
		} catch(error) {
			return res.redirect('/?error=adCitaPost,Error: '+error+'&reUrl=/adCitaAdd');
		}
	});

	app.post('/adCitaPut/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const obj = req.body.obj;
			if(obj.code) obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			if(obj.nome) obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();

			const Cita = await CitaDB.findOne({_id: id});

			const param = {
				$or:[
					{'code': obj.code},
					{'nome': obj.nome}
				]
			};
			const objSame = await CitaDB.findOne(param)
				.where('_id').ne(Cita._id);
			if(objSame) {
				let error = "不可修改";
				if(objSame.code == obj.code) error = "此城市编号已经存在";
				if(objSame.nome == obj.nome) error = "此城市名称已经存在";
				return res.redirect('/?error='+error+'&reUrl=/adCita/'+id);
			}

			const _object = _.extend(Cita, obj);
			const objSave = await _object.save();
			return res.redirect('/adCita/'+id);
		} catch(error) {
			return res.redirect('/?error=adCitaPost,Error: '+error+'&reUrl=/adCita/'+id);
		}
	});

	app.get('/adCitaDel/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const CitaExist = await CitaDB.findOne({_id: id});
			if(!CitaExist) return res.redirect('/?error=没有找到此城市&reUrl=/adCitas');
			
			const Shop = await ShopDB.findOne({Cita: id});
			if(Shop) return res.redirect('/?error=adCitaDel 城市下 还有店铺 不可删除');

			const objDel = await CitaDB.deleteOne({_id: id});
			return res.redirect("/adCitas");
		} catch(error) {
			return res.redirect('/?error=adCitaDel,Error: '+error+'&reUrl=/adCitas');
		}
	});
}