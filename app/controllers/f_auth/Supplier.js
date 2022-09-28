const _ = require('underscore');

const path = require('path');

const StintSupplier = require(path.resolve(process.cwd(), 'app/config/stint/StintSupplier'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const SupplierDB = require(path.resolve(process.cwd(), 'app/models/auth/Supplier'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.SupplierPost = async(req, res) => {
	console.log("/SupplierPost");
	try{
		const payload = req.payload;

		let obj = req.body.obj;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Supplier", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		obj.Firm = payload.Firm._id || payload.Firm;
		obj.Shop = payload.Shop._id || payload.Shop;

		obj.User_crt = payload._id;

		// 判断参数是否符合要求
		const errorInfo = MdFilter.objMatchStint(StintSupplier, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		// 供应商的编号或者名称是否相同
		const objSame = await SupplierDB.findOne({'code': obj.code, Firm: payload.Firm});
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

		const id = req.params.id;		// 所要更改的Supplier的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据 _id"});

		const pathObj = {_id: id};
		Supplier_path_Func(pathObj, payload, req.query);

		const Supplier = await SupplierDB.findOne(pathObj);
		if(!Supplier) return MdFilter.jsonFailed(res, {message: "没有找到此店铺信息"});

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

		const id = req.params.id;		// 所要更改的Supplier的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		Supplier_path_Func(pathObj, payload, req.query);

		const Supplier = await SupplierDB.findOne(pathObj);
		if(!Supplier) return MdFilter.jsonFailed(res, {message: "没有找到此店铺信息"});

		if(req.body.general) {
			Supplier_general(res, req.body.general, Supplier, payload);
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
		let Firm = payload.Firm._id || payload.Firm;

		if(obj.code && (obj.code = obj.code.replace(/^\s*/g,"").toUpperCase()) && (obj.code !== Supplier.code)) {
			const errorInfo = MdFilter.objMatchStint(StintSupplier, obj, ['code']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
			const same_param = {_id: {$ne: Supplier._id},Firm, code: Supplier.code};
			const objSame = await SupplierDB.findOne(same_param);
			if(objSame) return MdFilter.jsonFailed(res, {message: '此店铺编号已被占用, 请查看'});
			Supplier.code = obj.code;
		}

		if(obj.nome) Supplier.nome = obj.nome;
		if(obj.contact) Supplier.contact = obj.contact;
		if(obj.tel) Supplier.tel = obj.tel;
		if(obj.addr) Supplier.addr = obj.addr;
		if(obj.zip) Supplier.zip = obj.zip;
		// if(obj.typeSupplier) Supplier.typeSupplier = obj.typeSupplier;
		if(obj.img_url && (obj.img_url != Supplier.img_url) && Supplier.img_url && Supplier.img_url.split("Supplier").length > 1){
			await MdFiles.rmPicture(Supplier.img_url);
			Supplier.img_url = obj.img_url;
		}

		Supplier.User_upd = payload._id;
		const objSave = await Supplier.save();

		return MdFilter.jsonSuccess(res, {message: "修改成功", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Supplier_general", error});
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
	if(payload.Shop) pathObj.Shop = payload.Shop._id || payload.Shop;

	if(!queryObj) return;
}