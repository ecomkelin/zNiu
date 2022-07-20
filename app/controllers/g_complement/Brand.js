const _ = require('underscore');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const StintBrand = require(path.resolve(process.cwd(), 'app/config/stint/StintBrand'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const NationDB = require(path.resolve(process.cwd(), 'app/models/address/Nation'));
const BrandDB = require(path.resolve(process.cwd(), 'app/models/complement/Brand'));
const PdDB = require(path.resolve(process.cwd(), 'app/models/product/Pd'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.BrandPost = async(req, res) => {
	console.log("/BrandPost");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});
		const obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Brand", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!obj.code) obj.code = obj.nome;
		const errorInfo = MdFilter.objMatchStint(StintBrand, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		let match = {$or:[{'code': obj.code}, {'nome': obj.nome}], Firm: payload.Firm};
		if(payload.Shop) match.Shop = payload.Shop;
		const objSame = await BrandDB.findOne(match);
		if(objSame) return MdFilter.jsonFailed(res, {message: '品牌编号或名称相同'});

		// if(!MdFilter.isObjectId(obj.Nation)) return MdFilter.jsonFailed(res, {message: '请输入品牌所属国家'});
		// const Nation = await NationDB.findOne({_id: obj.Nation});
		// if(!Nation) return MdFilter.jsonFailed(res, {message: '没有找到您选择的国家信息'});

		obj.Firm = payload.Firm;
		if(payload.Shop) obj.Shop = payload.Shop;
		obj.User_crt = payload._id;
		const _object = new BrandDB(obj);
		const objSave = await _object.save();

		return MdFilter.jsonSuccess(res, {message: "BrandPost", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "BrandPost", error});
	}
}

exports.BrandDelete = async(req, res) => {
	console.log("/BrandDelete");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Brand的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const pathObj = {_id: id};
		Brand_path_Func(pathObj, payload);

		const Brand = await BrandDB.findOne(pathObj);
		if(!Brand) return MdFilter.jsonFailed(res, {message: "没有找到此品牌信息"});

		const Pd = await PdDB.findOne({Brand: Brand._id});
		// console.log(Pd);
		if(Pd) return MdFilter.jsonFailed(res, {message: "请先删除品牌中的产品"});

		if(Brand.img_url && Brand.img_url.split("Brand").length > 1) await MdFiles.rmPicture(Brand.img_url);
		const objDel = await BrandDB.deleteOne({_id: Brand._id});
		return MdFilter.jsonSuccess(res, {message: "BrandDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "BrandDelete", error});
	}
}



exports.BrandPut = async(req, res) => {
	console.log("/BrandPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Brand的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		Brand_path_Func(pathObj, payload);

		const Brand = await BrandDB.findOne(pathObj);
		if(!Brand) return MdFilter.jsonFailed(res, {message: "没有找到此品牌信息"});

		let obj = req.body.general;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Brand", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!obj.code) obj.code = Brand.code;
		if(!obj.nome) obj.nome = Brand.nome;
		const errorInfo = MdFilter.objMatchStint(StintBrand, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		if(obj.code !== Brand.code || obj.nome !== Brand.nome) {
			let match = {_id: {$ne: Brand._id}, $or:[{'code': obj.code}, {'nome': obj.nome}], Firm: payload.Firm};
			if(payload.Shop) match.Shop = payload.Shop;
			const objSame = await BrandDB.findOne(match);
			if(objSame) return MdFilter.jsonFailed(res, {message: '此品牌编号已被占用, 请查看'});
		}

		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

		if(obj.Nation && (obj.Nation != Brand.Nation)) {
			if(!MdFilter.isObjectId(obj.Nation)) return MdFilter.jsonFailed(res, {message: '国家数据需要为 _id 格式'});
			const Nation = await NationDB.findOne({_id: obj.Nation});
			if(!Nation) return MdFilter.jsonFailed(res, {message: '没有找到此国家信息'});
		}
		if(obj.img_url && (obj.img_url != Brand.img_url) && Brand.img_url && Brand.img_url.split("Brand").length > 1){
			await MdFiles.rmPicture(Brand.img_url);
		}

		obj.User_upd = payload._id;
		const _object = _.extend(Brand, obj);

		const objSave = await Brand.save();
		return MdFilter.jsonSuccess(res, {message: "BrandPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "BrandPut", error});
	}
}








const Brand_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm;
		if(payload.Shop) pathObj.Shop = payload.Shop;
		if(payload.role > ConfUser.role_set.manager) {
			pathObj.is_usable = 1;
		}
	} else {
		pathObj.is_usable = 1;
	}

	if(!queryObj) return;
	if(queryObj.Nations) {
		const ids = MdFilter.stringToObjectIds(queryObj.Nations);
		pathObj["Nation"] = {$in: ids};
	}
}

const dbBrand = 'Brand';
exports.Brands = async(req, res) => {
	console.log("/Brands");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: BrandDB,
			path_Callback: Brand_path_Func,
			dbName: dbBrand,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Brands", error});
	}
}

exports.Brand = async(req, res) => {
	console.log("/Brand");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: BrandDB,
			path_Callback: Brand_path_Func,
			dbName: dbBrand,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Brand", error});
	}
}