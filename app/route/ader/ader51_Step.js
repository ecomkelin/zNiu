const AderIsLogin = require("./aderPath");

const _ = require('underscore')

const path = require('path');
const Stint = require(path.resolve(process.cwd(), 'app/config/Stint'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const StepDB = require(path.resolve(process.cwd(), 'app/models/order/Step'));
const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));

module.exports = (app) => {
	app.get('/adSteps/:Shop_id', AderIsLogin, async(req, res) => {
		try{
			let curAder = req.session.curAder;
			let Shop_id = req.params.Shop_id;
			let Shop = await ShopDB.findOne({_id: Shop_id});
			let Steps = await StepDB.find({Shop: Shop_id})
				.populate("rels.Step", "code")
				.populate("crels.Step", "code")
				.sort({'sort': 1, 'code': 1});
			return res.render('./ader/Shop/Step/list', {title: '状态列表', curAder, Shop, Steps });
		} catch(error) {
			return res.redirect('/?error=adSteps,Error: '+error+'&reUrl=/adHome');
		}
	});

	app.get('/adStepAdd/:Shop_id', AderIsLogin, async(req, res) => {
		try{
			let curAder = req.session.curAder;

			let Shop_id = req.params.Shop_id;
			let Shop = await ShopDB.findOne({_id: Shop_id});
			if(!Shop) return res.redirect('/?error=没有找到此商店&reUrl=/adSteps');

			return res.render('./ader/Shop/Step/add', {title: 'Add 状态', curAder, Shop});
		} catch(error) {
			return res.redirect('/?error=adStepAdd,Error: '+error+'&reUrl=/adSteps');
		}
	})
	app.post('/adStepPost', AderIsLogin, async(req, res) => {
		try{
			let obj = req.body.obj;
			obj.code = parseInt(obj.code);
			if(isNaN(obj.code)) return res.redirect('/?error=编号只能为数字&reUrl=/adStepAdd/'+obj.Shop);
			if(!obj.nome) return res.redirect('/?error=名称不能为空&reUrl=/adStepAdd/'+obj.Shop);

			let Shop = await ShopDB.findOne({_id: obj.Shop});
			if(!Shop) return res.redirect('/?error=Shop错误&reUrl=/adStepAdd/'+obj.Shop);

			let same_param = {
				Shop: obj.Shop,
				code: obj.code,
			};
			let objSame = await StepDB.findOne(same_param);
			if(objSame) return res.redirect('/?error=有相同的状态&reUrl=/adStepAdd/'+obj.Shop);

			// 
			let exist = await StepDB.findOne({Shop: obj.Shop, is_initUser: true});
			obj.is_initUser = exist ? false: true;

			obj.rels = [];
			obj.crels = [];

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
				.populate("crels.Step", "code nome_Client")
				.populate("Shop", "code nome")
			if(!Step) return res.redirect('/?error=没有找到此状态&reUrl=/adSteps');

			let Steps = await StepDB.find({_id: {$ne: id}, Shop: Step.Shop._id});

			return res.render('./ader/Shop/Step/detail', {title: '状态详情', curAder, Step, Steps})
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
			if(obj.rels) {	// 修改关联状态
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

				let crels = [];
				for(i in obj.crels) {
					let rel = obj.crels[i];
					rel.confirm = rel.confirm ? true: false;
					if(rel.confirm) {
						delete rel.confirm;
						if(!rel.Step || !rel.btn_val) return res.redirect('/?error=关联状态不能没有 Step或btn_val&reUrl=/adStep/'+id);
						crels.push(rel);
					}
				}
				Step.crels = crels;
				await Step.save();
			} else {	// 修改基本信息
				/* 修改 User 信息 */
				obj.is_initUser = obj.is_initUser ? true : false;

				if(obj.code) {	
					obj.code = parseInt(obj.code);
					if(isNaN(obj.code)) return res.redirect('/?error=编号只能为数字');
					if(obj.code !== Step.code) { // 同一个shop不能有相同的 code
						const same = await StepDB.findOne({_id: {$ne: Step._id}, Shop: Step.Shop, code: obj.code});
						if(same) return res.redirect('/?error=已有此账号');
					}
				}

				if(obj.is_initUser !== Step.is_initUser) {	// 同一个Shop下 只能有一个 is_initUser 为 true
					if(obj.is_initUser) {
						await StepDB.updateOne({Shop: Step.Shop, is_initUser: true}, {is_initUser: false});
					} else {
						return res.redirect('/?error=不可以手动把 init 变为false');
					}
				}

				/* 修改 Client 信息 */
				obj.exist_Client = obj.exist_Client ? true : false;
				obj.is_initClient = obj.is_initClient ? true : false;
				if(obj.sort) obj.sort = parseInt(obj.sort);
				if(isNaN(obj.sort)) obj.sort = 0;

				let exist = null;
				if(obj.exist_Client !== Step.exist_Client) {
					if(obj.exist_Client) {	// 如果为true 相当于增加一个 Client 状态
						exist = await StepDB.findOne({Shop: Step.Shop, is_initClient: true});
						obj.is_initClient = exist ? false: true;
						if(!obj.nome_Client) obj.nome_Client = obj.nome;
					} else {	// 相当于删除一个Client状态
						if(Step.is_initClient) {
							exist = await StepDB.findOne({Shop: Step.Shop, is_initClient: false});
							if(exist) return res.redirect('/?error=adStepPut 请先取消 Client 非 init状态');
						}
						exist = await StepDB.findOne({Shop: Step.Shop, "crels.Step": id});
						if(exist) return res.redirect('/?error=adStepPut 请先取消 关联此 Step 的 Step');

						obj.is_initClient = false;
						obj.nome_Client = null;
					}
				}
				if(obj.is_initClient !== Step.is_initClient) {	// 同一个Shop下 只能有一个 is_initClient 为 true
					if(obj.is_initClient) {
						await StepDB.updateOne({Shop: Step.Shop, is_initClient: true}, {is_initClient: false});
					} else {
						if(obj.exist_Client) return res.redirect('/?error=不可以手动把 Client init 变为false');
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
			if(!Step) return res.redirect('/?error=adStepPut 没有找到此状态, 不可删除');

			let exist = null;
			if(Step.is_initUser) {
				exist = await StepDB.findOne({Shop: Step.Shop, is_initUser: false});
				if(exist) return res.redirect('/?error=adStepPut 请先删除 User 非 init状态');
			}
			if(Step.is_initClient) {
				exist = await StepDB.findOne({Shop: Step.Shop, is_initClient: false});
				if(exist) return res.redirect('/?error=adStepPut 请先删除 Client 非 init状态');
			}

			exist = await StepDB.findOne({Shop: Step.Shop, $or: [{"rels.Step": id}, {"crels.Step": id}]});
			if(exist) return res.redirect('/?error=adStepPut 请先删除 关联此 Step 的 Step');

			exist = await OrderDB.findOne({Step: id});
			if(exist) return res.redirect('/?error=adStepPut 订单中还有次状态, 不可删除');

			const objDel = await StepDB.deleteOne({'_id': id});

			return res.redirect("/adSteps/"+Step.Shop);
		} catch(error) {
			return res.redirect('/?error=adStepDel,Error: '+error+'&reUrl=/adSteps');
		}
	});



}