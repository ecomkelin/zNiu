const AderIsLogin = require("./aderPath");

const _ = require('underscore')

const path = require('path');
const Stint = require(path.resolve(process.cwd(), 'app/config/Stint'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const StepDB = require(path.resolve(process.cwd(), 'app/models/order/Step'));
const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));

const ConfStep = require(path.resolve(process.cwd(), 'app/config/conf/ConfStep'));

module.exports = (app) => {
	app.get('/adSteps/:Shop_id', AderIsLogin, async(req, res) => {
		try{
			let curAder = req.session.curAder;
			let Shop_id = req.params.Shop_id;
			let Shop = await ShopDB.findOne({_id: Shop_id});
			let Steps = await StepDB.find({Shop: Shop_id}).sort({'typeStep': 1, 'code': 1});
			return res.render('./ader/Shop/Step/list', {title: '状态列表', curAder, Shop, Steps, ConfStep });
		} catch(error) {
			return res.redirect('/?error=adSteps,Error: '+error+'&reUrl=/adHome');
		}
	});

	app.get('/adStepAdd/:Shop_id', AderIsLogin, async(req, res) => {
		try{
			let curAder = req.session.curAder;

			let typeStep = parseInt(req.query.typeStep);
			if(!ConfStep.typeStep_Arrs.includes(typeStep)) return res.redirect('/?error=typeStep错误&reUrl=/adSteps');
			let Shop_id = req.params.Shop_id;

			let Shop = await ShopDB.findOne({_id: Shop_id});
			if(!Shop) return res.redirect('/?error=没有找到此商店&reUrl=/adSteps');

			return res.render('./ader/Shop/Step/add', {title: 'Add 状态', curAder, ConfStep, Shop, typeStep});
		} catch(error) {
			return res.redirect('/?error=adStepAdd,Error: '+error+'&reUrl=/adSteps');
		}
	})
	app.post('/adStepPost', AderIsLogin, async(req, res) => {
		try{
			let obj = req.body.obj;
			obj.code = parseInt(obj.code);
			if(isNaN(obj.code)) return res.redirect('/?error=编号只能为数字&reUrl=/adStepAdd/'+obj.Shop+"?typeStep="+obj.typeStep);
			if(!obj.nome) return res.redirect('/?error=名称不能为空&reUrl=/adStepAdd/'+obj.Shop+"?typeStep="+obj.typeStep);

			let Shop = await ShopDB.findOne({_id: obj.Shop});
			if(!Shop) return res.redirect('/?error=Shop错误&reUrl=/adStepAdd/'+obj.Shop+"?typeStep="+obj.typeStep);

			delete obj.Firm;
			delete obj.rels;

			let same_param = {
				Shop: obj.Shop,
				typeStep: obj.typeStep,
				code: obj.code,
			};
			let objSame = await StepDB.findOne(same_param);
			if(objSame) return res.redirect('/?error=有相同的状态&reUrl=/adStepAdd/'+obj.Shop+"?typeStep="+obj.typeStep);

			
			let exist = await StepDB.findOne({Shop: obj.Shop, typeStep: obj.typeStep, isUnique_init: true});
			obj.isUnique_init = exist ? false: true;

			const _object = new StepDB(obj)
			const objSave = await _object.save();
			return res.redirect('/adSteps/'+obj.Shop)
		} catch(error) {
			return res.redirect('/?error=adStepPost,Error: '+error)
		}
	})

	app.get('/adStep/:id', AderIsLogin, async(req, res) => {
		try{
			const curAder = req.session.curAder;
			const id = req.params.id;
			const Step = await StepDB.findOne({_id: id}, {pwd: 0, refreshToken: 0})
				.populate("rels.Step", "code nome")
				.populate("Shop", "code nome")
			if(!Step) return res.redirect('/?error=没有找到此状态&reUrl=/adSteps');

			let Steps = await StepDB.find({_id: {$ne: id}, Shop: Step.Shop._id, typeStep: Step.typeStep});

			return res.render('./ader/Shop/Step/detail', {title: '状态详情', curAder, Step, ConfStep, Steps})
		} catch(error) {
			return res.redirect('/?error=adStep,Error: '+error+'&reUrl=/adSteps')
		}
	})

	app.post('/adStepPut/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id
			const Step = await StepDB.findOne({'_id': id});
			if(!Step) return res.redirect('/?error=没有找到此状态&reUrl=/adStep/'+id);

			const obj = req.body.obj
			if(obj.rels) {
				let rels = [];
				for(i in obj.rels) {
					let rel = obj.rels[i];
					rel.confirm = rel.confirm ? true: false;
					if(rel.confirm) {
						delete rel.confirm;
						if(!rel.Step || !rel.btn_val) return res.redirect('/?error=关联状态不能没有 Step或btn_val&reUrl=/adStep/'+id);
						rels.push(rel);
					}
				}
				Step.rels = rels;
				await Step.save();
			} else {

				obj.isUnique_init = obj.isUnique_init ? true : false;
				delete obj.Firm;
				delete obj.Shop;
				delete obj.rels;

				if(obj.code) {
					obj.code = parseInt(obj.code);
					if(isNaN(obj.code)) return res.redirect('/?error=编号只能为数字');
					if(obj.code !== Step.code) {
						const same = await StepDB.findOne({_id: {$ne: Step._id}, Shop: Step.Shop, typeStep: Step.typeStep, code: obj.code});
						if(same) return res.redirect('/?error=已有此账号');
					}
				}

				if(obj.isUnique_init !== Step.isUnique_init) {
					if(obj.isUnique_init) {
						await StepDB.updateOne({Shop: Step.Shop, typeStep: Step.typeStep, isUnique_init: true}, {isUnique_init: false});
					} else {
						return res.redirect('/?error=不可以手动把 init 变为false');
					}
				}

				let _object = _.extend(Step, obj);
				const objSave = await _object.save();

			}

			return res.redirect("/adStep/"+id)
		} catch(error) {
			console.log(error);
			return res.redirect('/?error=adStepPut,Error: '+error+'&reUrl=/adSteps');
		}
	});

	app.get('/adStepDel/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			let Step = await StepDB.findOne({_id: id});
			if(!Step) return res.redirect('/?error=adAreaDel 没有找到此状态, 不可删除');
			if(Step.isUnique_init) {
				let exist = await StepDB.findOne({Shop: Step.Shop, typeStep: Step.typeStep, isUnique_init: false});
				if(exist) return res.redirect('/?error=adAreaDel 请先删除 非 init状态');
			}

			const objDel = await StepDB.deleteOne({'_id': id});

			const Order = await OrderDB.findOne({Step: id});
			if(Order) return res.redirect('/?error=adAreaDel 订单中还有次状态, 不可删除');

			return res.redirect("/adSteps/"+Step.Shop);
		} catch(error) {
			return res.redirect('/?error=adStepDel,Error: '+error+'&reUrl=/adSteps');
		}
	});



}