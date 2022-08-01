const _ = require('underscore');

const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const ClientDB = require(path.resolve(process.cwd(), 'app/models/auth/Client'));
const StintClient = require(path.resolve(process.cwd(), 'app/config/stint/StintClient'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.ClientPost = async(req, res) => {
	console.log("/ClientPost");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		// console.log(obj);

		const same_param = {$or: []};
		const stints = ['code', 'pwd'];
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		same_param["$or"].push({code: obj.code});

		if(obj.pwd) obj.pwd = obj.pwd.replace(/^\s*/g,"");
		if(!obj.pwd) obj.pwd = "111111";
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
		const errorInfo = MdFilter.objMatchStint(StintClient, obj, stints);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

		const objSame = await ClientDB.findOne(same_param);
		if(objSame) {
			if(objSame.code === obj.code) return MdFilter.jsonFailed(res, {message: '已有此客户编号'});
			if(objSame.phone === obj.phone) return MdFilter.jsonFailed(res, {message: '已有此客户电话'});
			if(objSame.email === obj.email) return MdFilter.jsonFailed(res, {message: '已有此客户邮箱'});
		}

		obj.pwd = await MdFilter.encrypt_Prom(obj.pwd);

		const _object = new ClientDB(obj);
		const objSave = await _object.save();
		if(Object.keys(req.query).length > 0) {
			const db_res = await GetDB.db(obtFilterObj(req, objSave._id));
			return MdFilter.jsonSuccess(res, db_res);
		} else {
			return MdFilter.jsonSuccess(res, {data: {object: objSave}, message: 'ClientPost'});
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "ClientPost", error});
	}
}

exports.vClientPut = async(req, res) => {
	console.log("/vClientPut");
	try{
		const payload = req.payload;

		const pathObj = {_id: payload._id};

		const Client = await ClientDB.findOne(pathObj);
		if(!Client) return MdFilter.jsonFailed(res, {message: "没有找到此客户信息"});
		// console.log(req.body)
		// console.log('Client', Client)
		if(req.body.code) {
			return MdFilter.jsonFailed(res, {message: "更改账号功能，暂不开放"});
			let code = req.body.code;
			if(code !== Client.code) {
				code = code.replace(/^\s*/g,"").toUpperCase();
				const errorInfo = MdFilter.objMatchStint(StintClient, req.body, ['code']);
				if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

				const objSame = await ClientDB.findOne({_id: {$ne: Client._id}, code})
				if(objSame) return MdFilter.jsonFailed(res, {message: '此客户账户已被占用, 请查看'});

				Client.code = code;
			} else {
				return MdFilter.jsonFailed(res, {message: '如果您需要修改账户, 请输入与原账户不同的账户'});
			}
		} else if(req.body.password) {
			const password = req.body.password;
			// console.log('password', password)
			if(!password.pwd) return MdFilter.jsonFailed(res, {message: "请输入新密码"});
			const pwd = password.pwd.replace(/(\s*$)/g, "").replace( /^\s*/, '');
			// console.log('pwd', pwd)
			const errorInfo = MdFilter.objMatchStint(StintClient, password, ['pwd']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
			if(!password.pwdOrg) return MdFilter.jsonFailed(res, {message: "请输入原密码"});
			const pwdOrg = password.pwdOrg.replace(/(\s*$)/g, "").replace( /^\s*/, '');
			// console.log("pwdOrg", pwdOrg)
			const pwd_match_res = await MdFilter.matchBcryptProm(pwdOrg, Client.pwd);
			// console.log("pwd_match_res", pwd_match_res)
			if(pwd_match_res.status !== 200) return MdFilter.jsonRes(res, pwd_match_res);
			// console.log('200')
			Client.pwd = await MdFilter.encrypt_Prom(pwd);
			// console.log("Client.pwd", Client.pwd)
		} else if(req.body.general) {
			const general = req.body.general;
			if(general.nome) Client.nome = general.nome.replace(/(\s*$)/g, "").replace( /^\s*/, '');
			// 更改默认付款方式
			if(MdFilter.isObjectId(general.Paidtype)) {
				Client.Paidtype = general.Paidtype;
			}
		} else if(req.body.addr_post) {
			const addr = req.body.addr_post;
			delete addr._id;
			if(!(addr.name)) return MdFilter.jsonFailed(res, {message: 'addr_post name不能为空'});
			if(!(addr.address)) return MdFilter.jsonFailed(res, {message: 'addr_post address不能为空'});
			if(!(addr.postcode)) return MdFilter.jsonFailed(res, {message: 'addr_post postcode不能为空'});
			if(!(addr.phone)) return MdFilter.jsonFailed(res, {message: 'addr_post phone不能为空'});
			if(!(addr.Cita)) return MdFilter.jsonFailed(res, {message: 'addr_post Cita 为 ObjectId'});
			let Cita = null;
			if(MdFilter.isObjectId(addr.Cita)) Cita = await CitaDB.findOne({_id: addr.Cita});
			if(addr.Cita.length === 2) Cita = await CitaDB.findOne({code: addr.Cita});
			if(!Cita) return MdFilter.jsonFailed(res, {message: '没找到此城市信息'});
			addr.Cita = Cita._id;
			if(!Client.addrs) Client.addrs = [];
			Client.addrs.push(addr);
		} else if(req.body.addr_put) {
			const addr = req.body.addr_put;

			if(!(addr.name)) return MdFilter.jsonFailed(res, {message: 'addr_post name不能为空'});
			if(!(addr.address)) return MdFilter.jsonFailed(res, {message: 'addr_post address不能为空'});
			if(!(addr.postcode)) return MdFilter.jsonFailed(res, {message: 'addr_post postcode不能为空'});
			if(!(addr.phone)) return MdFilter.jsonFailed(res, {message: 'addr_post phone不能为空'});
			if(!(addr.Cita)) return MdFilter.jsonFailed(res, {message: 'addr_post Cita 为 ObjectId'});
			let Cita = null;
			if(MdFilter.isObjectId(addr.Cita)) Cita = await CitaDB.findOne({_id: addr.Cita});
			if(addr.Cita.length === 2) Cita = await CitaDB.findOne({code: addr.Cita});
			if(!Cita) return MdFilter.jsonFailed(res, {message: '没找到此城市信息'});
			addr.Cita = Cita._id;

			for(let i=0; i<Client.addrs.length; i++) {
				if(String(Client.addrs[i]._id) === addr._id) {
					Client.addrs[i] = addr;
					break;
				}
			}
		} else if(req.body.addr_sort) {
			const addr_sort = req.body.addr_sort;

			let numTh = 0;
			if(addr_sort.numTh && !isNaN(parseInt(addr_sort.numTh))) numTh = parseInt(addr_sort.numTh) - 1;
			if(numTh < 0) numTh = 0;

			let i=0;
			for(; i<Client.addrs.length; i++) {
				if(String(Client.addrs[i]._id) === addr_sort._id) break;
			}
			if(i !== Client.addrs.length) {
				const addr = {...Client.addrs[i]};
				Client.addrs.splice(i, 1);
				Client.addrs.splice(numTh, 0, addr);
			}
		} else if(req.body.addr_del) {
			const id = req.body.addr_del.addrId;
			let i=0;
			for(; i<Client.addrs.length; i++) {
				if(String(Client.addrs[i]._id) === id) break;
			}
			if(i === Client.addrs.length) return MdFilter.jsonFailed(res, {message: '没有找到此id'});
			if(i !== Client.addrs.length) Client.addrs.splice(i, 1);
		} else {
			return MdFilter.jsonFailed(res, {message: '请查看 API 输入正确的修改参数'});
		}

		const objSave = await Client.save();
		return MdFilter.jsonSuccess(res, {message: 'vClientPut', data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "vClientPut", error});
	}
}

exports.ClientPut = async(req, res) => {
	console.log("/ClientPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Client的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};

		const Client = await ClientDB.findOne(pathObj);
		if(!Client) return MdFilter.jsonFailed(res, {message: "没有找到此客户信息"});

		const obj = req.body.general;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		
		if(obj.is_usable == 1 || obj.is_usable === true || obj.is_usable === 'true') Client.is_usable = true;
		if(obj.is_usable == 0 || obj.is_usable === false || obj.is_usable === 'false') Client.is_usable = false;

		if(obj.contact) Client.contact = obj.contact;
		if(obj.sort && !isNaN(parseInt(obj.sort))) Client.sort = parseInt(obj.sort);

		const objSave = await Client.save();
		return MdFilter.jsonSuccess(res, {message: "ClientPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "ClientPut", error});
	}
}

exports.ClientDelete = async(req, res) => {
	console.log("/ClientDelete");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的User的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const objDel = await ClientDB.deleteOne({_id: id});
		return MdFilter.jsonSuccess(res, {message: '删除成功'})
	} catch(error) {
		return MdFilter.json500(res, {message: "ClientDelete", error});
	}
}




const dbClient = 'Client';
exports.Clients = async(req, res) => {
	console.log("/Clients");
	try {
		const dbs_res = await GetDB.dbs(obtFilterObj(req));
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Clients", error});
	}
}

exports.Client = async(req, res) => {
	console.log("/Client");
	try {
		const db_res = await GetDB.db(obtFilterObj(req, req.params.id));
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Client", error});
	}
}

const obtFilterObj = (req, id) => {
	const DB_filter =  {
		payload: req.payload,
		queryObj: req.query,

		objectDB: ClientDB,
		path_Callback: null,
		dbName: dbClient,
	};
	if(id) DB_filter.id = id;

	return DB_filter;
}