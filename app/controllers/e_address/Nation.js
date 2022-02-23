const _ = require('underscore');
const path = require('path');
const StintNation = require(path.resolve(process.cwd(), 'app/config/stint/StintNation'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const NationDB = require(path.resolve(process.cwd(), 'app/models/address/Nation'));
const AreaDB = require(path.resolve(process.cwd(), 'app/models/address/Area'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));



exports.NationPost = async(req, res) => {
	console.log('/NationPost');
	try {
		const payload = req.payload;
		const obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Nation", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		const errorInfo = MdFilter.objMatchStint(StintNation, obj, ['code', 'nome']);
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

		const objSame = await NationDB.findOne({$or:[{'code': obj.code}, {'nome': obj.nome}]});
		if(objSame) return MdFilter.jsonFailed(res, {message: '国家代号或名称相同'});
		const _object = new NationDB(obj);
		const objSave = await _object.save();

		return MdFilter.jsonSuccess(res, {message: "NationPost", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "NationPost", error});
	}
}
exports.NationPut = async(req, res) => {
	try {
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Cita的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Nation = await NationDB.findOne({_id: id});
		if(!Nation) return MdFilter.jsonFailed(res, {message: "没有找到此国家信息"});

		let obj = req.body.general;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Nation", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!obj.code) obj.code = Nation.code;
		if(!obj.nome) obj.nome = Nation.nome;
		const errorInfo = MdFilter.objMatchStint(StintNation, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase()
		obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase()
		if(obj.code !== Nation.code || obj.nome !== Nation.nome) {
			const objSame = await NationDB.findOne({_id: {$ne: Nation._id}, $or: [{code: obj.code}, {nome: obj.nome}]});
			if(objSame) return MdFilter.jsonFailed(res, {message: '此城市编号已被占用, 请查看'});
		}

		if(obj.img_url && (obj.img_url != Nation.img_url) && Nation.img_url && Nation.img_url.split("Nation").length > 1){
			await MdFiles.rmPicture(Nation.img_url);
		}

		obj.User_upd = payload._id;
		const _object = _.extend(Nation, obj);

		const objSave = await _object.save();
		return MdFilter.jsonSuccess(res, {message: "NationPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "NationPut", error});
	}
}
exports.NationDelete = async(req, res) => {
	try {
		const payload = req.payload;
		const id = req.params.id;		// 所要更改的Cita的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Nation = await NationDB.findOne({_id: id});
		if(!Nation) return MdFilter.jsonFailed(res, {message: "没有找到此国家信息"});

		const Area = await AreaDB.findOne({Nation: id});
		if(Area) return MdFilter.jsonFailed({message: "请先删除城市中的商店"});

		if(Nation.img_url && Nation.img_url.split("Nation").length > 1) await MdFiles.rmPicture(Nation.img_url);
		const objDel = await NationDB.deleteOne({_id: id});
		return MdFilter.jsonSuccess(res, {message: "NationDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "NationDelete", error});
	}
}








const Nations_path_Func = (pathObj, payload, queryObj) => {
	if(!payload || !payload.role) pathObj.is_usable = 1;
}

exports.Nations = async(req, res) => {
	try {
		const payload = req.payload;
		const dbNation = 'Nation';
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: NationDB,
			path_Callback: Nations_path_Func,
			dbName: dbNation,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Nations", error});
	}
}