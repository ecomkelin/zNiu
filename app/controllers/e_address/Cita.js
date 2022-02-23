const _ = require('underscore');

const path = require('path');
const StintCita = require(path.resolve(process.cwd(), 'app/config/stint/StintCita')); 
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles')); 
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter')); 
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop')); 
const AreaDB = require(path.resolve(process.cwd(), 'app/models/address/Area')); 
const CitaDB = require(path.resolve(process.cwd(), 'app/models/address/Cita')); 
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.CitaPost = async(req, res) => {
	console.log('/CitaPost');
	try {
		const payload = req.payload;
		const obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Cita", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		const errorInfo = MdFilter.objMatchStint(StintCita, obj, ['code', 'nome']);
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

		if(!MdFilter.isObjectId(obj.Area)) return MdFilter.jsonFailed(res, {message: '请输入所属大区'});
		const Area = await AreaDB.findOne({_id: obj.Area});
		if(!Area) return MdFilter.jsonFailed(res, {message: '没有找到您选择的大区信息'});

		const objSame = await CitaDB.findOne({$or:[{'code': obj.code}, {'nome': obj.nome}]});
		if(objSame) return MdFilter.jsonFailed(res, {message: '城市代号或名称相同'});
		const _object = new CitaDB(obj);
		const objSave = await _object.save();

		return MdFilter.jsonSuccess(res, {message: "CitaPost", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CitaPost"});
	}
}

exports.CitaPut = async(req, res) => {
	console.log('/CitaPut');
	try {
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Cita的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Cita = await CitaDB.findOne({_id: id});
		if(!Cita) return MdFilter.jsonFailed(res, {message: "没有找到此商品信息城市"});

		let obj = req.body.general;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Cita", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!obj.code) obj.code = Cita.code;
		if(!obj.nome) obj.nome = Cita.nome;
		const errorInfo = MdFilter.objMatchStint(StintCita, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		if(obj.code !== Cita.code || obj.nome !== Cita.nome) {
			const objSame = await CitaDB.findOne({_id: {$ne: Cita._id}, $or: [{code: obj.code},{nome: obj.nome}]});
			if(objSame) return MdFilter.jsonFailed(res, {message: '此城市编号已被占用, 请查看'});
		}

		if(obj.Area && (obj.Area != Cita.Area)) {
			if(!MdFilter.isObjectId(obj.Area)) return MdFilter.jsonFailed(res, {message: '大区数据需要为 _id 格式'});
			const Area = await AreaDB.findOne({_id: obj.Area});
			if(!Area) return MdFilter.jsonFailed(res, {message: '没有找到此大区信息'});
		}

		if(obj.img_url && (obj.img_url != Cita.img_url) && Cita.img_url && Cita.img_url.split("Cita").length > 1){
			await MdFiles.rmPicture(Cita.img_url);
		}

		obj.User_upd = payload._id;
		const _object = _.extend(Cita, obj);

		const objSave = await _object.save();
		return MdFilter.jsonSuccess(res, {message: "CitaPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CitaPut", error});
	}
}
exports.CitaDelete = async(req, res) => {
	console.log("/CitaDelete");
	try {
		const payload = req.payload;
		const id = req.params.id;		// 所要更改的Cita的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {status: "请传递正确的数据_id"});
		const Cita = await CitaDB.findOne({_id: id});
		if(!Cita) return MdFilter.jsonFailed(res, {status: "没有找到此城市"});

		const Shop = await ShopDB.findOne({Cita: id});
		if(Shop) return MdFilter.jsonFailed(res, {message: "请先删除城市中的商店"});

		if(Cita.img_url && Cita.img_url.split("Cita").length > 1) await MdFiles.rmPicture(Cita.img_url);
		const objDel = await CitaDB.deleteOne({_id: id});
		return MdFilter.jsonSuccess(res, {message: "CitaDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "CitaDelete", error});
	}
}







const Citas_path_Func = (pathObj, payload, queryObj) => {
	if(MdFilter.isObjectId(queryObj.Area)) pathObj["Area"] = {'$eq': queryObj.Area};
	if(!payload || !payload.role) pathObj.is_usable = 1;
}
exports.Citas = async(req, res) => {
	console.log("/Citas");
	try {
		const payload = req.payload;
		const dbCita = 'Cita';
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: CitaDB,
			path_Callback: Citas_path_Func,
			dbName: dbCita,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Citas"});
	}
}