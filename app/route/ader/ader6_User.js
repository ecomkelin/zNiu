const AderIsLogin = require("./aderPath");

const _ = require('underscore')

const path = require('path');
const Stint = require(path.resolve(process.cwd(), 'app/config/Stint'));
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const FirmDB = require(path.resolve(process.cwd(), 'app/models/auth/Firm'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));

module.exports = (app) => {
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

			obj.able_MBsell = obj.able_MBsell ? true : false;	// 是否能够手机售卖
			obj.able_PCsell = obj.able_PCsell ? true : false;	// 是否能够pc售卖

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

				obj.able_MBsell = obj.able_MBsell ? true : false;
				obj.able_PCsell = obj.able_PCsell ? true : false;

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

}