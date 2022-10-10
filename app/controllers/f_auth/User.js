const _ = require('underscore');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const StintUser = require(path.resolve(process.cwd(), 'app/config/stint/StintUser'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

const dbUser = 'User';

exports.UserPost = async(req, res) => {
	console.log("/UserPost");
	try{
		const payload = req.payload;

		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		// console.log(obj);

		const same_param = {$or: []};
		const stints = ['code', 'pwd'];
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		same_param["$or"].push({code: obj.code});

		obj.pwd = obj.pwd.replace(/^\s*/g,"");
		if(obj.phonePre && obj.phoneNum) {
			obj.phonePre = obj.phonePre.replace(/^\s*/g,"");
			obj.phoneNum = obj.phoneNum.replace(/^\s*/g,"");

			obj.phonePre = MdFilter.format_phonePre(obj.phonePre);
			if(!obj.phonePre) return MdFilter.jsonFailed(res, {message: "phonePre 错误"});
			obj.phone = obj.phonePre+obj.phoneNum;
			same_param["$or"].push({phone: obj.phone});

			stints.push('phonePre');
			stints.push('phoneNum');
		}
		if(obj.email) {
			obj.email = obj.email.replace(/^\s*/g,"").toUpperCase();
			same_param["$or"].push({email: obj.email});
		}
		const errorInfo = MdFilter.objMatchStint(StintUser, obj, stints);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

		const objSame = await UserDB.findOne(same_param);
		if(objSame) {
			if(objSame.code === obj.code) return MdFilter.jsonFailed(res, {message: '已有此用户编号'});
			if(objSame.phone === obj.phone) return MdFilter.jsonFailed(res, {message: '已有此用户电话'});
			if(objSame.email === obj.email) return MdFilter.jsonFailed(res, {message: '已有此用户邮箱'});
		}

		if(payload.role === ConfUser.role_set.boss) {
			obj.Shop = payload.Shop._id;
			obj.role = ConfUser.role_set.worker;
		}
		if(!obj.role) return MdFilter.jsonFailed(res, {message: "请选择用户权限"});
		if(payload.role >= obj.role) return MdFilter.jsonFailed(res, {message: "您的权限不足"});
		if(!ConfUser.role_Arrs.includes(parseInt(obj.role))) return MdFilter.jsonFailed(res, {message: '用户权限参数错误'});
		if(obj.role >= ConfUser.role_set.printer) {
			if(!obj.Shop) return MdFilter.jsonFailed(res, {message: '请选择用户的所属分店'});
			if(!MdFilter.isObjectId(obj.Shop)) return MdFilter.jsonFailed(res, {message: '请输入用户所在分店'});
			const Shop = await ShopDB.findOne({_id: obj.Shop, Firm: payload.Firm});
			if(!Shop) return MdFilter.jsonFailed(res, {message: '没有找到您选择的分店信息'});
		} else {
			obj.Shop = null;
		}

		obj.pwd = await MdFilter.encrypt_Prom(obj.pwd);

		obj.Firm = payload.Firm;
		obj.User_crt = payload._id;

		const _object = new UserDB(obj);
		const objSave = await _object.save();
		if(Object.keys(req.query).length > 0) {
			const db_res = await GetDB.db(obtFilterObj(req, objSave._id));
			return MdFilter.jsonSuccess(res, db_res);
		} else {
			return MdFilter.jsonSuccess(res, {data: {object: objSave}, message: 'UserPost'});
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "UserPost", error});
	}
}

exports.UserPut = async(req, res) => {
	console.log("/UserPut");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的User的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		User_path_Func(pathObj, payload);

		const User = await UserDB.findOne(pathObj);
		if(!User) return MdFilter.jsonFailed(res, {message: "没有找到此用户信息"});

		if(payload.role >= User.role && payload._id != User._id) return MdFilter.jsonFailed(res, {message: "您没有权限修改 此用户信息"});

		if(req.body.general) {
			User_general(req, res, User, payload); 
		} else if(req.body.password) {
			User_putPwd(req, res, User, payload); 
		} else {
			return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		}

	} catch(error) {
		return MdFilter.json500(res, {message: "UserPut", error});
	}
}

const User_putPwd = async(req, res, User, payload) => {
	try{
		const obj = req.body.password;
		if(!obj.pwd || !obj.pwdConfirm) return MdFilter.jsonFailed(res, {message: '密码不能为空'});
		obj.pwd = obj.pwd.replace(/(\s*$)/g, "").replace( /^\s*/, '');
		obj.pwdConfirm = obj.pwdConfirm.replace(/(\s*$)/g, "").replace( /^\s*/, '');
		if(obj.pwd !== obj.pwdConfirm) return MdFilter.jsonFailed(res, {message: '确认密码不一致'});
		const errorInfo = MdFilter.objMatchStint(StintUser, obj, ['pwd']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		if(payload.role >= User.role) {
			if(!obj.pwdOrg) return MdFilter.jsonFailed(res, {message: "请输入原密码, 如果忘记, 请联系管理员"});
			const pwdOrg = obj.pwdOrg.replace(/(\s*$)/g, "").replace( /^\s*/, '');
			const pwd_match_res = await MdFilter.matchBcryptProm(pwdOrg, User.pwd);
			if(pwd_match_res.status != 200) return MdFilter.jsonFailed(res, {message: "原密码错误，请重新操作"});
		}
		User.pwd = await MdFilter.encrypt_Prom(obj.pwd);
		const objSave = await User.save();
		if(Object.keys(req.query).length > 0) {
			const db_res = await GetDB.db(obtFilterObj(req, objSave._id));
			return MdFilter.jsonSuccess(res, db_res);
		} else {
			return MdFilter.jsonSuccess(res, {data: {object: objSave}, message: 'User_putPwd'});
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "User_putPwd", error});
	}
}
const User_general = async(req, res, User, payload) => {
	try{
		const obj = req.body.general

		const same_param = {_id: {$ne: User._id}, "$or": []};
		const stints = [];
		if(obj.code) {
			// 只有管理员以上可以更改
			obj.code = obj.code.replace(/^\s*/g,"").toUpperCase()
			if(obj.code !== User.code) {
				User.code = obj.code;
				same_param["$or"].push({code: obj.code});
				stints.push('code');
			}
		}

		if(obj.phonePre && obj.phoneNum) {
			obj.phonePre = obj.phonePre.replace(/^\s*/g,"");
			obj.phoneNum = obj.phoneNum.replace(/^\s*/g,"");
			obj.phonePre = MdFilter.format_phonePre(obj.phonePre);
			if(!obj.phonePre) return MdFilter.jsonFailed(res, {message: "phonePre 错误"});

			obj.phone = obj.phonePre + obj.phoneNum;
			
			if(obj.phone !== User.phone) {
				User.phonePre = obj.phonePre;
				User.phoneNum = obj.phoneNum;
				User.phone = obj.phone;
				same_param["$or"].push({phone: obj.phone});
				stints.push('phonePre');
				stints.push('phoneNum');
			}
		}
		if(obj.email) {
			obj.email = obj.email.replace(/^\s*/g,"").toUpperCase();
			if(obj.email !== User.email) {
				User.email = obj.email;
				same_param["$or"].push({email: obj.email});
			}
		}

		if(stints.length > 0) {
			const errorInfo = MdFilter.objMatchStint(StintUser, obj, stints);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		}

		if(same_param["$or"].length !== 0) {
			const objSame = await UserDB.findOne(same_param);
			if(objSame) return MdFilter.jsonFailed(res, {message: '此用户账户已被占用, 请查看'});
		}

		if(!obj.Shop) obj.Shop = User.Shop;

		if(obj.role && (obj.role != User.role)) {
			obj.role = parseInt(obj.role);
			if(!ConfUser.role_Arrs.includes(obj.role)) return MdFilter.jsonFailed(res, {message: '您设置的用户权限参数不存在'});
			if(obj.role <= payload.role) return MdFilter.jsonFailed(res, {message: '您无权授予此权限'});
 
			if(obj.role >= ConfUser.role_set.printer && !obj.Shop) return MdFilter.jsonFailed(res, {message: '请为该角色设置分店'});
			if(obj.role < ConfUser.role_set.printer) obj.Shop = null;
			User.role = obj.role;
		}

		if(obj.Shop && (obj.Shop != User.Shop)) {
			const role = obj.role || User.role;
			if(role >= ConfUser.role_set.printer) {
				if(!MdFilter.isObjectId(obj.Shop)) return MdFilter.jsonFailed(res, {message: '分店数据需要为 _id 格式'});
				if(payload.role >= ConfUser.role_set.manager)	return MdFilter.jsonFailed(res, {message: '修改用户所属店铺需要总公司管理权限'});
				const Shop = await ShopDB.findOne({_id: obj.Shop, Firm: payload.Firm});
				if(!Shop) return MdFilter.jsonFailed(res, {message: '没有找到此分店信息'});
				User.Shop = obj.Shop;
			} else {
				User.Shop = null;
			}
		}

		if(payload._id != User._id) User.User_upd = payload._id;

		const objSave = await User.save();

		if(Object.keys(req.query).length > 0) {
			const db_res = await GetDB.db(obtFilterObj(req, objSave._id));
			return MdFilter.jsonSuccess(res, db_res);
		} else {
			return MdFilter.jsonSuccess(res, {status: 200, data: {object: objSave}, message: 'User_general'});
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "User_general", error});
	}
}

exports.UserDelete = async(req, res) => {
	console.log("/UserDelete");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的User的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const pathObj = {_id: id};
		User_path_Func(pathObj, payload);

		const User = await UserDB.findOne(pathObj);
		if(!User) return MdFilter.jsonFailed(res, {message: "没有找到此用户信息"});
		if(payload.role >= User.role) return MdFilter.jsonFailed(res, {message: "您没有权限删除此用户"});

		const objDel = await UserDB.deleteOne({_id: User._id});
		return MdFilter.jsonSuccess(res, {message: '删除成功'});
	} catch(error) {
		return MdFilter.json500(res, {message: "UserDelete", error});
	}
}











exports.Users = async(req, res) => {
	console.log("/Users");
	try {
		const dbs_res = await GetDB.dbs(obtFilterObj(req));
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Users", error});
	}
}

exports.User = async(req, res) => {
	console.log("/User")
	try {
		const db_res = await GetDB.db(obtFilterObj(req, req.params.id));
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "User", error});
	}
}

const obtFilterObj = (req, id) => {
	const DB_filter =  {
		payload: req.payload,
		queryObj: req.query,

		objectDB: UserDB,
		path_Callback: User_path_Func,
		dbName: dbUser,
	};
	if(id) DB_filter.id = id;

	return DB_filter;
}


const User_path_Func = (pathObj, payload, queryObj) => {
	pathObj.Firm = payload.Firm;
	pathObj.role = {$gte: payload.role};
	if(payload.Shop) pathObj.Shop = payload.Shop._id;
	if(payload.role == ConfUser.role_set.staff || payload.role == ConfUser.role_set.worker) pathObj._id = payload._id;

	if(!queryObj) return;
}