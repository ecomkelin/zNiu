const _ = require('underscore');

const path = require('path');
const StintArea = require(path.resolve(process.cwd(), 'app/config/stint/StintArea'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const NationDB = require(path.resolve(process.cwd(), 'app/models/address/Nation'));
const AreaDB = require(path.resolve(process.cwd(), 'app/models/address/Area'));
const CitaDB = require(path.resolve(process.cwd(), 'app/models/address/Cita'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.AreaPost = async(req, res) => {
	console.log("/AreaPost");
	try {
		const payload = req.payload;
		const obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Area", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		const errorInfo = MdFilter.objMatchStint(StintArea, obj, ['code', 'nome']);
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

		if(!MdFilter.isObjectId(obj.Nation)) return MdFilter.jsonFailed(res, {message: '请输入所属国家'});
		const Nation = await NationDB.findOne({_id: obj.Nation});
		if(!Nation) return MdFilter.jsonFailed(res, {message: '没有找到您选择的大区信息'});

		const objSame = await AreaDB.findOne({$or:[{'code': obj.code}, {'nome': obj.nome}]});
		if(objSame) return MdFilter.jsonFailed(res, {message: '大区代号或名称相同'});
		const _object = new AreaDB(obj);
		const objSave = await _object.save();

		return MdFilter.jsonSuccess(res, {message: "AreaPost", data: {object: objSave}});
	} catch(error) {
		console.log(error);
		return MdFilter.json500(res, {message: "AreaPost"});
	}
}
exports.AreaPut = async(req, res) => {
	console.log("/AreaPut");
	try {
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Cita的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Area = await AreaDB.findOne({_id: id});
		if(!Area) return MdFilter.jsonFailed(res, {message: "没有找到此城市信息"});

		let obj = req.body.general;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Area", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!obj.code) obj.code = Area.code;
		if(!obj.nome) obj.nome = Area.nome;
		const errorInfo = MdFilter.objMatchStint(StintArea, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
		if(obj.code !== Area.code || obj.nome !== Area.nome) {
			const objSame = await AreaDB.findOne({_id: {$ne: Area._id}, $or: [{code: obj.code}, {nome: obj.nome}]});
			if(objSame) return MdFilter.jsonFailed(res, {message: '此城市编号已被占用, 请查看'});
		}

		if(obj.Nation && (obj.Nation != Area.Nation)) {
			if(!MdFilter.isObjectId(obj.Nation)) return AreaDB.jsonFailed(res, {message: '国家数据需要为_id格式'});
			const Nation = await NationDB.findOne({_id: obj.Nation});
			if(!Nation) return MdFilter.jsonFailed(res, {message: '没有找到此国家信息'});
		}

		if(obj.img_url && (obj.img_url != Area.img_url) && Area.img_url && Area.img_url.split("Area").length > 1){
			await MdFiles.rmPicture(Area.img_url);
		}

		obj.User_upd = payload._id;
		const _object = _.extend(Area, obj);

		const objSave = await _object.save();
		return MdFiles.jsonSuccess({message: "AreaPut", data: {object: objSave}});
	} catch(error) {
		return MdFiles.json500({message: "AreaPut", error});
	}
}
exports.AreaDelete = async(req, res) => {
	console.log("/AreaDelete");
	try {
		const payload = req.payload;
		const id = req.params.id;		// 所要更改的Cita的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const Area = await AreaDB.findOne({_id: id});
		if(!Area) return MdFilter.jsonFailed(res, {message: "没有找到此商品信息城市"});

		const Cita = await CitaDB.findOne({Area: id});
		if(Cita) return MdFilter.jsonFailed(res, {message: "请先删除城市中的商店"});

		if(Area.img_url && Area.img_url.split("Area").length > 1) await MdFiles.rmPicture(Area.img_url);
		const objDel = await AreaDB.deleteOne({_id: id});
		return MdFilter.jsonSuccess({message: "AreaDelete"});
	} catch(error) {
		console.log(error);
		return MdFilter.json500({message: "AreaDelete", error});
	}
}









const Areas_path_Func = (pathObj, payload, queryObj) => {
	if(MdFilter.isObjectId(queryObj.Nation)) pathObj["Nation"] = {'$eq': queryObj.Nation};
	if(!payload || !payload.role) pathObj.is_usable = 1;
}
exports.Areas = async(req, res) => {
	console.log("/Areas");
	try {
		const payload = req.payload;
		const dbArea = 'Area';
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: AreaDB,
			path_Callback: Areas_path_Func,
			dbName: dbArea,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		console.log(error);
		return MdFilter.json500(res, {message: "Areas", error});
	}
}