const _ = require('underscore');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const StintSupplier = require(path.resolve(process.cwd(), 'app/config/stint/StintSupplier'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const SupplierDB = require(path.resolve(process.cwd(), 'app/models/auth/Supplier'));
const FirmDB = require(path.resolve(process.cwd(), 'app/models/auth/Firm'));
const CitaDB = require(path.resolve(process.cwd(), 'app/models/address/Cita'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.SupplierPost = async(req, res) => {
	console.log("/SupplierPost");
	try{
		const payload = req.payload;

		let obj = req.body.obj;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Supplier", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(obj.Firm === 'Supplier') {
			obj.Firm = null;
			obj.typeSupplier = 'Supplier';
			obj.Firm = payload.Firm._id;
			if(!MdFilter.isObjectId(obj.Cita)) obj.Cita = null;
		} else {
			if(payload.role > ConfUser.role_set.manager) return MdFilter.jsonFailed(res, {message: "需要公司管理者权限"});
			obj.Firm = payload.Firm;

			if(!MdFilter.isObjectId(obj.Cita)) return MdFilter.jsonFailed(res, {message: '请输入商店所在城市'});
			const Cita = await CitaDB.findOne({_id: obj.Cita});
			if(!Cita) return MdFilter.jsonFailed(res, {message: '没有找到您选择的城市信息'});

			obj.User_crt = payload._id;
			obj.price_ship = 0;
			obj.serve_Citas = [];
			const serve_Cita = {};
			serve_Cita.Cita = Cita._id;
			serve_Cita.price_ship = 0;
			obj.serve_Citas.push(serve_Cita);
		}

		// 判断参数是否符合要求
		const errorInfo = MdFilter.objMatchStint(StintSupplier, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		if(obj.cassa_auth) {
			let {hide_orders, hide_clients} = obj.cassa_auth;
			obj.cassa_auth.hide_orders = (hide_orders == 1 || hide_orders === 'true') ? true : false;
			obj.cassa_auth.hide_clients = (hide_clients == 1 || hide_clients === 'true') ? true : false;
		}

		// 分店的编号或者名称是否相同
		const objSame = await SupplierDB.findOne({$or:[{'code': obj.code}, {'nome': obj.nome}], Firm: payload.Firm});
		if(objSame) return MdFilter.jsonFailed(res, {message: '店铺编号或名称相同'});
		const _object = new SupplierDB(obj);
		const objSave = await _object.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "SupplierPost 数据库保存失败"});
		// console.log("/SupplierPost", objSave)
		return MdFilter.jsonSuccess(res, {message: "创建成功", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "SupplierPost", error});
	}
}


exports.SupplierDelete = async(req, res) => {
	console.log("/SupplierDelete");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Supplier的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据 _id"});

		const pathObj = {_id: id};
		Supplier_path_Func(pathObj, payload, req.query);

		const Supplier = await SupplierDB.findOne(pathObj);
		if(!Supplier) return MdFilter.jsonFailed(res, {message: "没有找到此店铺信息"});

		if((payload.role > ConfUser.role_set.manager) && (Supplier.Firm === payload.Firm)) {
			return MdFilter.jsonFailed(res, {message: "需要公司管理者权限"});
		}

		const User = await UserDB.findOne({Supplier: Supplier._id});
		if(User) return MdFilter.jsonFailed(res, {message: "请先删除店铺中的所有用户"});

		const Prod = await ProdDB.findOne({Supplier: Supplier._id});
		if(Prod) return MdFilter.jsonFailed(res, {message: "请先删除店铺中的商品"});

		if(Supplier.img_url && Supplier.img_url.split("Supplier").length > 1) await MdFiles.rmPicture(Supplier.img_url);
		const objDel = await SupplierDB.deleteOne({_id: Supplier._id});
		return MdFilter.jsonSuccess(res, {message: "删除成功"});
	} catch(error) {
		return MdFilter.json500(res, {message: "SupplierDelete", error});
	}
}



exports.SupplierPut = async(req, res) => {
	console.log("/SupplierPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Supplier的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		Supplier_path_Func(pathObj, payload, req.query);

		const Supplier = await SupplierDB.findOne(pathObj);
		if(!Supplier) return MdFilter.jsonFailed(res, {message: "没有找到此店铺信息"});

		if((payload.role > ConfUser.role_set.manager) && (Supplier.Firm === payload.Firm)) {
			return MdFilter.jsonFailed(res, {message: "需要公司管理者权限"});
		}

		if(req.body.general) {
			Supplier_general(res, req.body.general, Supplier, payload);
		} else if(req.body.serveCitaPost) {
			Supplier_serveCitaPost(res, req.body.serveCitaPost, Supplier);
		} else if(req.body.serveCitaPut) {
			Supplier_serveCitaPut(res, req.body.serveCitaPut, Supplier);
		} else if(req.body.serveCitaDelete) {
			Supplier_serveCitaDelete(res, req.body.serveCitaDelete, Supplier, payload);
		} else {
			// 判断是否用上传文件的形式 传递了数据
			const obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Supplier", field: "img_url"});
			if(!obj) return MdFilter.jsonFailed(res, {message: "参数错误"});
			Supplier_general(res, obj, Supplier, payload);
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "SupplierPut", error});
	}
}

const Supplier_general = async(res, obj, Supplier, payload) => {
	try{
		const same_arrs = [];
		if(obj.code && (obj.code = obj.code.replace(/^\s*/g,"").toUpperCase()) && (obj.code !== Supplier.code)) {
			const errorInfo = MdFilter.objMatchStint(StintSupplier, obj, ['code']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
			Supplier.code = obj.code;
			same_arrs.push({'code': Supplier.code});
		}
		if(obj.nome && (obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase()) && (obj.nome !== Supplier.nome)) {
			const errorInfo = MdFilter.objMatchStint(StintSupplier, obj, ['nome']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
			Supplier.nome = obj.nome;
			same_arrs.push({'nome': Supplier.nome});
		}

		if(same_arrs.length > 0) {
			const same_param = {_id: {$ne: Supplier._id},Firm: payload.Firm,$or: same_arrs};
			if(obj.code !== Supplier.code || obj.nome !== Supplier.nome) {
				const objSame = await SupplierDB.findOne(same_param);
				if(objSame) return MdFilter.jsonFailed(res, {message: '此店铺编号已被占用, 请查看'});
			}
		}

		if((obj.is_main == 1 || obj.is_main === true || obj.is_main === 'true') && (Supplier.is_main !== true)) {
			const SupplierUpdMany = await SupplierDB.updateMany({Firm: payload.Firm, is_main: true}, {is_main: false});
			Supplier.is_main = true;
			// const mainSupplier = await SupplierDB.findOne({is_main: true});
			// if(mainSupplier) return MdFilter.jsonFailed(res, {message: "只能有一个主店铺, 需要把主店铺关闭, 再开启此主店铺"})
		}

		if(obj.Cita && (obj.Cita != Supplier.Cita)) {
			if(!MdFilter.isObjectId(obj.Cita)) obj.Cita = null;

			if(obj.Cita) {
				const index = MdFilter.indexOfArrayObject(Supplier.serve_Citas, "Cita", obj.Cita);	// 查看服务区中 是否有此城市
				if(index < 0) return MdFilter.jsonFailed(res, {message: '请先添加服务区'});

				const Cita = await CitaDB.findOne({_id: obj.Cita});
				if(!Cita) return MdFilter.jsonFailed(res, {message: '没有找到此城市信息'});
				Supplier.Cita = obj.Cita;
			}
		}
		if(obj.contact) Supplier.contact = obj.contact;
		if(obj.tel) Supplier.tel = obj.tel;
		if(obj.addr) Supplier.addr = obj.addr;
		if(obj.zip) Supplier.zip = obj.zip;
		// if(obj.typeSupplier) Supplier.typeSupplier = obj.typeSupplier;
		if(obj.img_url && (obj.img_url != Supplier.img_url) && Supplier.img_url && Supplier.img_url.split("Supplier").length > 1){
			await MdFiles.rmPicture(Supplier.img_url);
			Supplier.img_url = obj.img_url;
		}

		if(obj.cassa_auth) {
			let {hide_orders, hide_clients} = obj.cassa_auth;
			if(!Supplier.cassa_auth) Supplier.cassa_auth = {};
			Supplier.cassa_auth.hide_orders = (hide_orders == 1 || hide_orders === 'true') ? true : false;
			Supplier.cassa_auth.hide_clients = (hide_clients == 1 || hide_clients === 'true') ? true : false;
		}

		Supplier.User_upd = payload._id;
		const objSave = await Supplier.save();

		return MdFilter.jsonSuccess(res, {message: "修改成功", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Supplier_general", error});
	}
}

const Supplier_serveCitaPost = async(res, obj, Supplier) => {
	try{
		if(isNaN(parseFloat(obj.price_ship)) || !obj.Cita || !MdFilter.isObjectId(obj.Cita)) {
			return MdFilter.jsonFailed(res, {message: "请正确传输 新的服务区参数"});
		}

		const index = MdFilter.indexOfArrayObject(Supplier.serve_Citas, "Cita", obj.Cita);	// 查看服务区中 是否有此城市
		if(index >= 0) return MdFilter.jsonFailed(res, {message: '此服务区已经被添加'});

		Supplier.serve_Citas.push(obj);
		const objSave = await Supplier.save();
		// k-e-l-i-n;
		const object = await SupplierDB.findOne({_id: objSave._id})
			.populate({path: 'serve_Citas.Cita'});
		return MdFilter.jsonSuccess(res, {message: '成功添加新的服务区', data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Supplier_serveCitaPost", error});
	}
}
const Supplier_serveCitaPut = async(res, obj, Supplier) => {
	try{
		const price_ship = parseFloat(obj.price_ship);
		if(isNaN(price_ship)) return MdFilter.jsonFailed(res, {message: '服务费必须为数字'});
		// 找到此服务城市
		let i=0;
		for(; i<Supplier.serve_Citas.length; i++) {
			if(String(Supplier.serve_Citas[i]._id) === obj._id) {
				Supplier.serve_Citas[i].price_ship = price_ship;
				break;
			}
		}
		if(i === Supplier.serve_Citas.length) return MdFilter.jsonFailed(res, {message: '没有找到需要修改的服务区'});

		const objSave = await Supplier.save();
		return MdFilter.jsonSuccess(res, {message: '成功修改服务区', data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Supplier_serveCitaPut", error});
	}
}
const Supplier_serveCitaDelete = async(res, obj, Supplier) => {
	try{
		if(!MdFilter.isObjectId(obj.Cita)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		if(obj.Cita == String(Supplier.Cita)) return MdFilter.jsonFailed(res, {message: "不可删除所在城市服务区"})
		Supplier.serve_Citas.splice(Supplier.serve_Citas.findIndex(serve_Cita => String(serve_Cita.Cita) == obj.Cita), 1);

		const objSave = await Supplier.save();
		return MdFilter.jsonSuccess(res, {message: '成功删除服务区', data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Supplier_serveCitaDelete", error});
	}
}


















const dbSupplier = 'Supplier';
exports.Suppliers = async(req, res) => {
	console.log("/Suppliers");
	try {
		const dbs_res = await GetDB.dbs(obtFilterObj(req));
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Suppliers", error});
	}
}

exports.Supplier = async(req, res) => {
	console.log("/Supplier");
	try {
		const db_res = await GetDB.db(obtFilterObj(req, req.params.id));
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Supplier", error});
	}
}

const obtFilterObj = (req, id) => {
	const DB_filter =  {
		payload: req.payload,
		queryObj: req.query,

		objectDB: SupplierDB,
		path_Callback: Supplier_path_Func,
		dbName: dbSupplier,
	};
	if(id) DB_filter.id = id;

	return DB_filter;
}


const Supplier_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		if(queryObj && queryObj.Firm === "Supplier") {
			pathObj["Firm"] = {$eq: null};
		} else {
			pathObj.Firm = payload.Firm;
		}
		if(payload.role > ConfUser.role_set.manager) {
			pathObj.is_usable = 1;
		}
	} else {
		pathObj.is_usable = 1;
	}

	if(!queryObj) return;
	if(queryObj.is_main) {
		const is_main = (queryObj.is_main == 1 || queryObj.is_main === 'true') ? 1 :  0;
		pathObj["is_main"] = {'$eq': is_main};
	}
	if(queryObj.is_boutique) {
		const is_boutique = (queryObj.is_boutique == 1 || queryObj.is_boutique === 'true') ? 1 : 0;
		pathObj["is_boutique"] = {'$eq': is_boutique};
	}
	if(queryObj.serve_Citas) {
		const ids = MdFilter.stringToObjectIds(queryObj.serve_Citas);
		pathObj["serve_Citas"] = { $elemMatch: {Cita: {$in: ids}}};
	}
	if(queryObj.Citas) {
		const ids = MdFilter.stringToObjectIds(queryObj.Citas);
		pathObj["Cita"] = {$in: ids};
	}
}