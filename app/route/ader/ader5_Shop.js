const AderIsLogin = require("./aderPath");

const _ = require('underscore')

const path = require('path');
const Stint = require(path.resolve(process.cwd(), 'app/config/Stint'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const FirmDB = require(path.resolve(process.cwd(), 'app/models/auth/Firm'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

module.exports = (app) => {
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

			const objSame = await ShopDB.findOne(same_param);
			if(objSame) {
				let errorInfo = '已有此账号，请重新注册';
				return res.redirect('/?error='+errorInfo+'&reUrl=/adShopAdd');
			}

			obj.able_MBsell = obj.able_MBsell ? true : false;	// 是否能够手机售卖
			obj.able_PCsell = obj.able_PCsell ? true : false;	// 是否能够pc售卖
			obj.allow_codeDuplicate = obj.allow_codeDuplicate ? true : false;	// 是否允许多code
			obj.is_Pnome = obj.is_Pnome ? true : false;			// 是否存储产品名称

			const _object = new ShopDB(obj)
			const objSave = await _object.save();
			return res.redirect('/adShops')
		} catch(error) {
			return res.redirect('/?error=adShopPost,Error: '+error+'&reUrl=/adShopAdd')
		}
	})

	app.post('/adShopPut/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id
			const Shop = await ShopDB.findOne({'_id': id});
			if(!Shop) return res.redirect('/?error=没有找到此商店&reUrl=/adShops');
			const obj = req.body.obj
			if(obj.firm) return res.redirect('/?error=不允许修改公司&reUrl=/adShop/'+id);

			// 注释 看 Post
			obj.able_MBsell = obj.able_MBsell ? true : false;
			obj.able_PCsell = obj.able_PCsell ? true : false;
			obj.allow_codeDuplicate = obj.allow_codeDuplicate ? true : false;
			obj.is_Pnome = obj.is_Pnome ? true : false;

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
	});

	app.get('/adShopDel/:id', AderIsLogin, async(req, res) => {
		try{
			const id = req.params.id;
			const objDel = await ShopDB.deleteOne({'_id': id});

			const User = await UserDB.findOne({Shop: id});
			if(User) return res.redirect('/?error=adAreaDel 此商店中有员工, 不可删除');

			const Prod = await ProdDB.findOne({Shop: id});
			if(Prod) return res.redirect('/?error=adAreaDel 此商店中有产品, 不可删除');

			return res.redirect("/adShops");
		} catch(error) {
			return res.redirect('/?error=adShopDel,Error: '+error+'&reUrl=/adShops');
		}
	});



}