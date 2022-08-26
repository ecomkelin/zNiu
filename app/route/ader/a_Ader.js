const _ = require('underscore')
const multipart = require('connect-multiparty')
const postForm = multipart();

const path = require('path');
const Stint = require(path.resolve(process.cwd(), 'app/config/Stint'));
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const StintBrand = require(path.resolve(process.cwd(), 'app/config/stint/StintBrand'));
const StintPd = require(path.resolve(process.cwd(), 'app/config/stint/StintPd'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const AderDB = require(path.resolve(process.cwd(), 'app/models/auth/Ader'));
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const FirmDB = require(path.resolve(process.cwd(), 'app/models/auth/Firm'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const AreaDB = require(path.resolve(process.cwd(), 'app/models/address/Area'));
const CitaDB = require(path.resolve(process.cwd(), 'app/models/address/Cita'));
const NationDB = require(path.resolve(process.cwd(), 'app/models/address/Nation'));
const BrandDB = require(path.resolve(process.cwd(), 'app/models/complement/Brand'));
const CategDB = require(path.resolve(process.cwd(), 'app/models/complement/Categ'));
const PdDB = require(path.resolve(process.cwd(), 'app/models/product/Pd'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

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
			if(Pd) return res.redirect('/?error=adAreaDel 此国家中有产品, 不可删除');

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


	/* ========================================== Firm ========================================== */
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

			const User = await UserDB.findOne({Firm: id});
			if(User) return res.redirect('/?error=此公司中还有员工，请先删除此公司的员工&reUrl=/adFirms');
					
			const objDel = await FirmDB.deleteOne({_id: id});
			return res.redirect("/adFirms");
		} catch(error) {
			return res.redirect('/?error=adFirmDel,Error: '+error+'&reUrl=/adFirms');
		}
	});

	/* ========================================== User ========================================== */
	app.get('/adUsers', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const Users = await UserDB.find()
				.populate('Firm', 'code nome')
				.sort({'is_usable': -1, 'Frim': 1, 'role': 1})
			return res.render('./ader/User/list', {title: '用户列表', curAder, Users });
		} catch(error) {
			return res.redirect('/?error=adUsers,Error: '+error+'&reUrl=/adHome');
		}
	});

	app.get('/adUserAdd', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const Firms = await FirmDB.find({'is_usable': true});
			const Shops = await ShopDB.find({'is_usable': true});
			if(!Firms || Firms.length == 0) return res.redirect('/?error=请先添加公司&reUrl=/adUsers');
			if(!Shops || Shops.length == 0) return res.redirect('/?error=请先添加商店&reUrl=/adUsers');
			return res.render('./ader/User/add', {title: 'Add 用户', curAder, Firms, Shops});
		} catch(error) {
			return res.redirect('/?error=adUserAdd,Error: '+error+'&reUrl=/adUsers');
		}
	})
	app.post('/adUserPost', AderIsLogin, async(req, res) => {
		try{
			const obj = req.body.obj;

			const same_param = {"$or": []};
			same_param["$or"].push({'code': obj.code});
			const stints = ['code', 'pwd'];

			obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			obj.pwd = obj.pwd.replace(/^\s*/g,"").toUpperCase();
			// if(obj.phonePre && obj.phoneNum) {
			// 	obj.phonePre = obj.phonePre.replace(/^\s*/g,"").toUpperCase();
			// 	obj.phoneNum = obj.phoneNum.replace(/^\s*/g,"").toUpperCase();
			// 	obj.phone = String(obj.phonePre) + obj.phoneNum;
			// 	stints.push('phonePre')
			// 	stints.push('phoneNum')
			// 	same_param["$or"].push({'phone': String(obj.phonePre)+obj.phoneNum});
			// }
			// if(obj.email) {
			// 	obj.email = obj.email.replace(/^\s*/g,"").toUpperCase();
			// 	stints.push('email')
			// 	same_param["$or"].push({'email': obj.email});
			// }

			const errorInfo = MdFilter.objMatchStint(Stint.User, obj, stints);
			if(errorInfo) return res.redirect('/?error=没有找到此公司,请重新选择'+errorInfo+'&reUrl=/adUserAdd');

			obj.pwd = await MdFilter.encrypt_Prom(obj.pwd);
			const Firm = await FirmDB.findOne({'_id': obj.Firm});
			if(!Firm) return res.redirect('/?error=没有找到此公司,请重新选择&reUrl=/adUserAdd');
			if(!ConfUser.role_Arrs.includes(parseInt(obj.role))) return res.redirect('/?error=用户角色参数错误&reUrl=/adUserAdd');
			// obj.role = ConfUser.role_set.owner;
			
			const objSame = await UserDB.findOne(same_param);
			if(objSame) {
				let errorInfo = '';
				if(objSame.code === obj.code) errorInfo = '已有此账号，请重新注册';
				else if(objSame.phone === obj.phone) errorInfo = '已有此电话，请重新注册';
				else if(objSame.email === obj.email) errorInfo = '已有此邮箱，请重新注册';
				return res.redirect('/?error='+errorInfo+'&reUrl=/adUserAdd');
			}

			const _object = new UserDB(obj)
			const objSave = await _object.save();
			return res.redirect('/adUsers')
		} catch(error) {
			return res.redirect('/?error=adUserPost,Error: '+error+'&reUrl=/adUserAdd')
		}
	})

	app.get('/adUser/:id', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const id = req.params.id;
			const User = await UserDB.findOne({_id: id}, {pwd: 0, refreshToken: 0})
				.populate("Firm", "code nome")
			if(!User) return res.redirect('/?error=没有找到此用户&reUrl=/adUsers');
			return res.render('./ader/User/detail', {title: '用户详情', curAder, User})
		} catch(error) {
			return res.redirect('/?error=adUser,Error: '+error+'&reUrl=/adUsers')
		}
	})

	app.post('/adUserPut/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id
			const User = await UserDB.findOne({'_id': id});
			if(!User) return res.redirect('/?error=没有找到此用户&reUrl=/adUsers');
			const obj = req.body.obj
			if(obj.firm) return res.redirect('/?error=不允许修改公司&reUrl=/adUser/'+id);
			if(obj.role && !ConfUser.role_Arrs.includes(parseInt(obj.role))) {
				return res.redirect('/?error=用户角色参数错误&reUrl=/adUser/'+id);
			}
			if(obj.code) {
				obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
				const errorInfo = MdFilter.objMatchStint(Stint.User, obj, ['code']);
				if(errorInfo) return res.redirect('/?error=账号参数错误: '+errorInfo+'&reUrl=/adUser/'+id);

				const objSame = await UserDB.findOne({'code': obj.code})
					.where('_id').ne(User._id);
				if(objSame) return res.redirect('/?error=已有此账号&reUrl=/adUser/'+id);
				User.code = obj.code;
				const objSave = await User.save();
			} else if(obj.pwd) {
				obj.pwd = obj.pwd.replace(/^\s*/g,"");
				const errorInfo = MdFilter.objMatchStint(Stint.User, obj, ['pwd']);
				if(errorInfo) return res.redirect('/?error=密码参数错误: '+errorInfo+'&reUrl=/adUser/'+id);

				User.pwd = await MdFilter.encrypt_Prom(obj.pwd);
				const objSave = await User.save();
			} else {
				const _object = _.extend(User, obj);
				const objSave = await _object.save();
			}
			return res.redirect("/adUser/"+id)
		} catch(error) {
			return res.redirect('/?error=adUserPutPwd,Error: '+error+'&reUrl=/adUsers');
		}
	});

	app.get('/adUserDel/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const objDel = await UserDB.deleteOne({'_id': id});
			return res.redirect("/adUsers");
		} catch(error) {
			return res.redirect('/?error=adUserDel,Error: '+error+'&reUrl=/adUsers');
		}
	});

	/* ========================================== Shop ========================================== */
	app.get('/adShops', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const Shops = await ShopDB.find()
				.populate('Firm', 'code nome')
				.sort({'Frim': 1, 'is_usable': -1})
			return res.render('./ader/Shop/list', {title: '商店列表', curAder, Shops });
		} catch(error) {
			return res.redirect('/?error=adShops,Error: '+error+'&reUrl=/adHome');
		}
	});

	app.get('/adShopAdd', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const Firms = await FirmDB.find({'is_usable': true});
			if(!Firms || Firms.length == 0) return res.redirect('/?error=请先添加公司&reUrl=/adShops');
			return res.render('./ader/Shop/add', {title: 'Add 商店', curAder, Firms});
		} catch(error) {
			return res.redirect('/?error=adShopAdd,Error: '+error+'&reUrl=/adShops');
		}
	})
	app.post('/adShopPost', AderIsLogin, async(req, res) => {
		try{
			const obj = req.body.obj;

			const same_param = {};
			const stints = ['code'];

			obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			same_param.code = obj.code;
			const errorInfo = MdFilter.objMatchStint(Stint.Shop, obj, stints);
			if(errorInfo) return res.redirect('/?error=没有找到此公司,请重新选择'+errorInfo+'&reUrl=/adShopAdd');
					
			const Firm = await FirmDB.findOne({'_id': obj.Firm});
			if(!Firm) return res.redirect('/?error=没有找到此公司,请重新选择&reUrl=/adShopAdd');
			// if(!ConfShop.role_Arrs.includes(parseInt(obj.role))) return res.redirect('/?error=商店角色参数错误&reUrl=/adShopAdd');
			
			const objSame = await ShopDB.findOne(same_param);
			if(objSame) {
				let errorInfo = '已有此账号，请重新注册';
				return res.redirect('/?error='+errorInfo+'&reUrl=/adShopAdd');
			}

			const _object = new ShopDB(obj)
			const objSave = await _object.save();
			return res.redirect('/adShops')
		} catch(error) {
			return res.redirect('/?error=adShopPost,Error: '+error+'&reUrl=/adShopAdd')
		}
	})

	app.get('/adShop/:id', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const id = req.params.id;
			const Shop = await ShopDB.findOne({_id: id}, {pwd: 0, refreshToken: 0})
				.populate("Firm", "code nome")
			if(!Shop) return res.redirect('/?error=没有找到此商店&reUrl=/adShops');
			return res.render('./ader/Shop/detail', {title: '商店详情', curAder, Shop})
		} catch(error) {
			return res.redirect('/?error=adShop,Error: '+error+'&reUrl=/adShops')
		}
	})

	app.post('/adShopPut/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id
			const Shop = await ShopDB.findOne({'_id': id});
			if(!Shop) return res.redirect('/?error=没有找到此商店&reUrl=/adShops');
			const obj = req.body.obj
			if(obj.firm) return res.redirect('/?error=不允许修改公司&reUrl=/adShop/'+id);

			if(obj.code) {
				obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
				const errorInfo = MdFilter.objMatchStint(Stint.Shop, obj, ['code']);
				if(errorInfo) return res.redirect('/?error=账号参数错误: '+errorInfo+'&reUrl=/adShop/'+id);

				const objSame = await ShopDB.findOne({'code': obj.code})
					.where('_id').ne(Shop._id);

				if(objSame) return res.redirect('/?error=已有此账号&reUrl=/adShop/'+id);
				Shop.code = obj.code;
				const objSave = await Shop.save();
			} else {
				const _object = _.extend(Shop, obj);
				const objSave = await _object.save();
			}
			return res.redirect("/adShop/"+id)
		} catch(error) {
			console.log(error);
			return res.redirect('/?error=adShopPut,Error: '+error+'&reUrl=/adShops');
		}
	});

	app.get('/adShopDel/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const objDel = await ShopDB.deleteOne({'_id': id});
			return res.redirect("/adShops");
		} catch(error) {
			return res.redirect('/?error=adShopDel,Error: '+error+'&reUrl=/adShops');
		}
	});





	let BP_Nations = null;
	app.post('/excel_Brand', postForm, async(req, res) => {
		console.log("Ader Brand excel");
		if(!BP_Nations) BP_Nations = await NationDB.find();
		try{
			const Firm = req.body.obj.Firm;
			const fileData = req.files.mulFile;
			if(!fileData) return res.redirect('/?error=!req.files.mulFile');

			const filePath = fileData.path;
			if(!filePath) return res.redirect('/?error=!filePath');

			const types = filePath.split('.');
			const type = types[types.length -1]
			if(type !== 'xlsx') return res.redirect('/?error=!xlsx');
			const excel = require('node-xlsx').parse(filePath)[0];
			const arrs = excel.data;
			for(let i=5; i<arrs.length; i++) {
				const arr = arrs[i];
				const obj = {};
				obj.code = String(arr[1]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				console.log("code", obj.code)
				obj.nome = String(arr[2]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				console.log("nome", obj.nome)
				if(obj.code === 'undefined' || obj.nome === 'undefined') continue;
				const errorInfo = MdFilter.objMatchStint(StintBrand, obj, ['code', 'nome']);
				if(errorInfo) {
					console.log(i+2, xuhao, errorInfo, obj.code);
					continue;
				}

				const objSame = await BrandDB.findOne({'code': obj.code, Firm});
				if(objSame) {
					console.log(i+2, xuhao, '已经有相同的编号', obj.code);
					continue;
				}
				obj.Firm = Firm;

				const NationCode = String(arr[3]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(NationCode.length === 2) {
					const Nation = BP_Nations.find(item => item.code === NationCode);
					if(Nation) obj.Nation = Nation._id;
				}

				const is_usable = String(arr[4]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(is_usable === '1') obj.is_usable = true;

				const img_url = String(arr[5]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(img_url !== "undefined") obj.img_url = '/upload/Brand/'+img_url;

				const _object = new BrandDB(obj);
				const objSave = await _object.save();
			}
			return res.redirect('/adHome');
		} catch(error) {
			console.log(error)
			return res.redirect('/?error=adUserDel,Error: '+error+'&reUrl=/adUsers');
		}
	});

	let P_Brands = null;
	let P_Categs = null;
	app.post('/excel_Pd', postForm, async(req, res) => {
		console.log("Ader Pd excel");
		if(!P_Brands) P_Brands = await BrandDB.find();
		if(!P_Categs) P_Categs = await CategDB.find({level: 2});
		if(!BP_Nations) BP_Nations = await NationDB.find();
		try{
			const Firm = req.body.obj.Firm;
			const fileData = req.files.mulFile;
			if(!fileData) return res.redirect('/?error=!req.files.mulFile');

			const filePath = fileData.path;
			if(!filePath) return res.redirect('/?error=!filePath');

			const types = filePath.split('.');
			const type = types[types.length -1]
			if(type !== 'xlsx') return res.redirect('/?error=!xlsx');
			const excel = require('node-xlsx').parse(filePath)[0];
			const arrs = excel.data;
			for(let i=5; i<arrs.length; i++) {
				const arr = arrs[i];
				const obj = {};
				const xuhao = String(arr[0]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				obj.code = String(arr[1]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				obj.nome = String(arr[2]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(obj.code === 'undefined' || obj.nome === 'undefined') continue;
				const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['code', 'nome']);
				if(errorInfo) {
					console.log(i+2, xuhao, errorInfo);
					continue;
				}

				const objSame = await PdDB.findOne({$or:[{'code': obj.code}, {'nome': obj.nome}], Firm});
				if(objSame) {
					console.log(i+2, xuhao, '有相同的编号或名称');
					continue;
				}
				obj.Firm = Firm;

				obj.unit = String(arr[3]).replace(/(\s*$)/g, "").replace( /^\s*/, '');

				const price_regular = parseFloat(String(arr[4]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(price_regular) || price_regular <= 0) {
					console.log(i+2, xuhao, '价格错误');
					continue;
				}
				obj.price_regular = price_regular;
				obj.price_sale = price_regular;

				const sort = parseInt(String(arr[5]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				obj.sort = isNaN(sort) ? 0 : sort;

				const CategCode = String(arr[6]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				const Categ = P_Categs.find(item => item.code === CategCode);
				if(Categ) obj.Categ = Categ._id;

				const BrandCode = String(arr[7]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				const Brand = P_Brands.find(item => item.code === BrandCode);
				if(Brand) obj.Brand = Brand._id;

				const NationCode = String(arr[8]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(NationCode.length === 2) {
					const Nation = BP_Nations.find(item => item.code === NationCode);
					if(Nation) obj.Nation = Nation._id;
				}

				const is_usable = String(arr[9]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(is_usable === '1') obj.is_usable = true;

				obj.img_urls = [];
				for(let j=10; j<15; j++) {
					const img_url = String(arr[j]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
					if(img_url !== "undefined") obj.img_urls.push('/upload/Pd/'+img_url);
				}

				const _object = new PdDB(obj);
				const objSave = await _object.save();
			}
			return res.redirect('/adHome');
		} catch(error) {
			console.log(error)
			return res.redirect('/?error=adUserDel,Error: '+error+'&reUrl=/adUsers');
		}
	});
	app.post('/excel_Prod', postForm, async(req, res) => {
		console.log("Ader Prod excel");
		if(!P_Brands) P_Brands = await BrandDB.find();
		if(!P_Categs) P_Categs = await CategDB.find({level: 2});
		if(!BP_Nations) BP_Nations = await NationDB.find();
		try{
			const Firm = req.body.obj.Firm;
			const Shop = req.body.obj.Shop;
			const fileData = req.files.mulFile;
			if(!fileData) return res.redirect('/?error=!req.files.mulFile');

			const filePath = fileData.path;
			if(!filePath) return res.redirect('/?error=!filePath');

			const types = filePath.split('.');
			const type = types[types.length -1]
			if(type !== 'xlsx') return res.redirect('/?error=!xlsx');
			const excel = require('node-xlsx').parse(filePath)[0];
			const arrs = excel.data;
			for(let i=1; i<arrs.length; i++) {
				const arr = arrs[i];
				const obj = {};
				// const xuhao = String(arr[0]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				const xuhao = i+1;
				let col = 0;
				obj.code = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(obj.code === 'undefined') continue;
				const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['code']);
				if(errorInfo) {
					console.log(i+2, xuhao, errorInfo, obj.code);
					continue;
				}
				const objSame = await PdDB.findOne({'code': obj.code, Shop});
				if(objSame) {
					console.log(i+2, xuhao, '已经有相同的编号', obj.code);
					continue;
				}

				obj.nomeTR = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				obj.nome = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');

				obj.unit = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');

				obj.price_cost = parseFloat(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.price_cost) || obj.price_cost < 0) obj.price_cost = 0;

				obj.price_regular = parseFloat(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.price_regular) || obj.price_regular <= 0) {
					console.log(i+2, xuhao, '标价错误', obj.price_regular);
					continue;
				}

				obj.price_sale = parseFloat(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.price_sale) || obj.price_sale <= 0) obj.price_sale = obj.price_regular;

				col=9;
				obj.weight = parseFloat(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.weight) || obj.weight < 0) obj.weight = 0;

				obj.num_batch = parseInt(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.num_batch) || obj.num_batch < 0) obj.num_batch = 1;

				obj.iva = parseFloat(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.iva) || obj.iva < 0) obj.iva = 22;

				// const sort = parseInt(String(arr[5]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				// obj.sort = isNaN(sort) ? 0 : sort;

				// const CategCode = String(arr[6]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				// const Categ = P_Categs.find(item => item.code === CategCode);
				// if(Categ) obj.Categ = Categ._id;

				// const BrandCode = String(arr[7]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				// const Brand = P_Brands.find(item => item.code === BrandCode);
				// if(Brand) obj.Brand = Brand._id;

				// const NationCode = String(arr[8]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				// if(NationCode.length === 2) {
				// 	const Nation = BP_Nations.find(item => item.code === NationCode);
				// 	if(Nation) obj.Nation = Nation._id;
				// }

				// const is_usable = String(arr[9]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				// if(is_usable === '1') obj.is_usable = true;

				// obj.img_urls = [];
				// for(let j=10; j<15; j++) {
				// 	const img_url = String(arr[j]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				// 	if(img_url !== "undefined") obj.img_urls.push('/upload/Pd/'+img_url);
				// }
				obj.Firm = Firm;
				obj.Shop = Shop;
				obj.Pd = null;
				obj.is_usable = true;
				obj.is_simple = true;
				obj.is_sell = true;
				const _object = new ProdDB(obj);
				const objSave = await _object.save();
			}
			return res.redirect('/adHome');
		} catch(error) {
			console.log(error)
			return res.redirect('/?error=adUserDel,Error: '+error+'&reUrl=/adUsers');
		}
	});
}
const loadFile = (req, res, next) => {
	if(req.files) {
	} else {
		info = "Please Upload the File";
		Index.mgOptionWrong(req, res, info);
	}
}
const readExcel = () => {
	const path = require('path');
	const XLSX = require('xlsx');
	const wb = XLSX.readFile(path.join(__dirname, './test.xlsx'));
	const SheetNames = wb.SheetNames;
	console.log(SheetNames);
	const ws = wb.Sheets[SheetNames[0]]
	console.log("ws", ws);
	const data = XLSX.utils.sheet_to_json(ws);
	console.log("data", data)
}
const writeExcel = () => {
	const path = require('path');
	const XLSX = require('xlsx');

	const json = [
		{"big Title": "title big1"},
		{"littleTitle": "title little1"},
		{"little Title": "title little2"},
		{"big Title": "title big2"},
		{Name: 'name_01', Age: 21, Address: 'address_01'},
		{Name: 'name_02', Age: 22, Address: 'address_02'},
		{Name: 'name_03', Age: 23, Address: 'address_03'},
		{Name: 'name_04', Age: 24, Address: 'address_04'},
	];
	const ws = XLSX.utils.json_to_sheet(json);
	const keys = Object.keys(ws).sort();
	const ref = keys[1]+':'+keys[keys.length -1];
	const wb = {
		SheetNames: ['order'],
		Sheets: {
			'order': Object.assign({},ws, {'!ref': ref})
		}
	};

	console.log(wb)
	XLSX.writeFile(wb, path.join(__dirname, './out.xlsx'));

	return res.render('./index', {title: 'Excel'});
}
const AderIsLogin = function(req, res, next) {
	let curAder = req.session.curAder;
	if(!curAder) {
		return res.redirect('/?info=需要您的Administrator账户');
	} else {
		next();
	}
};