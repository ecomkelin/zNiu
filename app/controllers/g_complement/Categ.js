const _ = require('underscore');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const StintCateg = require(path.resolve(process.cwd(), 'app/config/stint/StintCateg'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const CategDB = require(path.resolve(process.cwd(), 'app/models/complement/Categ'));
const PdDB = require(path.resolve(process.cwd(), 'app/models/product/Pd'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.CategPost = async(req, res) => {
	console.log("/CategPost");
	try{
		const payload = req.payload;

		let obj = req.body.obj;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Categ", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		obj.code = obj.nome;
		const errorInfo = MdFilter.objMatchStint(StintCateg, obj, ['code']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.nome = obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		obj.Firm = payload.Firm;
		if(payload.Shop) obj.Shop = payload.Shop;
		obj.User_crt = payload._id;

		let match = {'code': obj.code}
		match.Firm = payload.Firm;
		if(payload.Shop) match.Shop = payload.Shop;
		const objSame = await CategDB.findOne(match);
		if(objSame) return MdFilter.jsonFailed(res, {message: '分类编号或名称相同'});
		const _object = new CategDB(obj);

		let object = await _object.save();
		return MdFilter.jsonSuccess(res, {message: "创建成功", data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CategPost", error});
	}
}

exports.CategDelete = async(req, res) => {
	console.log("/CategDelete");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Categ的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const pathObj = {_id: id};
		Categ_path_Func(pathObj, payload);

		const Categ = await CategDB.findOne(pathObj);
		if(!Categ) return MdFilter.jsonFailed(res, {message: "没有找到此分类信息"});


		if(Categ.img_url && Categ.img_url.split("Categ").length > 1) await MdFiles.rmPicture(Categ.img_url);
		const objDel = await CategDB.deleteOne({_id: Categ._id});

		return MdFilter.jsonSuccess(res, {message: "删除成功"});
	} catch(error) {
		return MdFilter.json500(res, {message: "CategDelete", error});
	}
}



exports.CategPut = async(req, res) => {
	console.log("/CategPut");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Categ的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		Categ_path_Func(pathObj, payload);

		const Categ = await CategDB.findOne(pathObj);
		if(!Categ) return MdFilter.jsonFailed(res, {message: "没有找到此分类信息"});

		if(req.body.general) {
			Categ_general(res, req.body.general, Categ, payload);
		} else {
			const obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Categ", field: "img_url"});
			if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
			Categ_general(res, obj, Categ, payload);
		}
		
	} catch(error) {
		return MdFilter.json500(res, {message: "CategPut", error});
	}
}
const Categ_general = async(res, obj, Categ, payload) => {
	try{
		if(obj.nome && (obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase()) && obj.nome !== Categ.nome){
			obj.code = obj.nome;
			const errorInfo = MdFilter.objMatchStint(StintCateg, obj, ['code']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

			if(objSame) return MdFilter.jsonFailed(res, {message: '此分类编号已被占用, 请查看'});
			let match = {_id: {$ne: Categ._id}, code: obj.code};
			match.Firm = payload.Firm;
			if(payload.Shop) match.Shop = payload.Shop;
			const objSame = await CategDB.findOne(match);
			Categ.code = Categ.nome = obj.code;
		}

		// 如果不是顶级分类 并且新的父分类与原父分类不同
		if(obj.img_url && (obj.img_url != Categ.img_url) && Categ.img_url && Categ.img_url.split("Categ").length > 1){
			await MdFiles.rmPicture(Categ.img_url);
			Categ.img_url = obj.img_url;
		}
		
		Categ.User_upd = payload._id;
		let object = await Categ.save();
		return MdFilter.jsonSuccess(res, {message: "修改成功", data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Categ_general", error});
	}
}












const Categs_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm;
		if(payload.Shop) pathObj.Shop = payload.Shop;
		if(payload.role > ConfUser.role_set.boss) pathObj.is_usable = 1;
	} else {
		pathObj.is_usable = 1;
	}

	if(!queryObj) return;
}
const Categ_path_Func = (pathObj, payload, queryObj) => {
	pathObj.Firm = payload.Firm;
	if(payload.Shop) pathObj.Shop = payload.Shop;
	if(payload.role > ConfUser.role_set.boss) pathObj.is_usable = 1;
}

const dbCateg = 'Categ';
exports.Categs = async(req, res) => {
	console.log("/Categs");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: CategDB,
			path_Callback: Categs_path_Func,
			dbName: dbCateg,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Categs", error});
	}
}

exports.Categ = async(req, res) => {
	console.log("/Categ");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: CategDB,
			path_Callback: Categs_path_Func,
			dbName: dbCateg,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Categ", error});
	}
}
