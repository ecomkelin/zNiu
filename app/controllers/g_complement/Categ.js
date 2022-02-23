const _ = require('underscore');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const ConfCateg = require(path.resolve(process.cwd(), 'app/config/conf/ConfCateg'));
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
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Categ", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		
		const errorInfo = MdFilter.objMatchStint(StintCateg, obj, ['code']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		obj.Firm = payload.Firm;
		obj.User_crt = payload._id;

		const objSame = await CategDB.findOne({'code': obj.code, Firm: payload.Firm});
		if(objSame) return MdFilter.jsonFailed(res, {message: '分类编号或名称相同'});

		const _object = new CategDB(obj);

		if(!ConfCateg.type_arrs.includes(obj.type)) return MdFilter.jsonFailed(res, {message: '请输入正确的分类 类型'});
		if(obj.level == 2) {
			if(!MdFilter.isObjectId(obj.Categ_far)) return MdFilter.jsonFailed(res, {message: "父分类:请传递正确的数据 _id"});
			const Categ_far = await CategDB.findOne({_id: obj.Categ_far, Firm: payload.Firm});
			if(!Categ_far.Categ_sons) Categ_far.Categ_sons = [];
			Categ_far.Categ_sons.push(_object._id);
			await Categ_far.save();
		} else {
			obj.level = 1;
		}

		let object = await _object.save();
		/* kelin 为了 react 的 二级分类 */
		if(object.level === 2) {
			object = await CategDB.findOne({_id: object.Categ_far})
				.populate({path: 'Categ_sons'})
		}
		/* kelin 为了 react 的 二级分类 */

		return MdFilter.jsonSuccess(res, {message: "创建成功", data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CategPost", error});
	}
}

exports.CategDelete = async(req, res) => {
	console.log("/CategDelete");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Categ的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const pathObj = {_id: id};
		Categ_path_Func(pathObj, payload);

		const Categ = await CategDB.findOne(pathObj);
		if(!Categ) return MdFilter.jsonFailed(res, {message: "没有找到此分类信息"});

		let Categ_far = null;
		if(Categ.level == 1) {
			const Categ_sec = await CategDB.findOne({Categ_far: Categ._id});
			if(Categ_sec) return MdFilter.jsonFailed(res, {message: "此分类下还有子分类, 不可删除"});
		} else if(Categ.level == 2) {
			const Pd = await PdDB.findOne({Categ: Categ._id});
			if(Pd) return MdFilter.jsonFailed(res, {message: "请先删除分类中的产品"});
			Categ_far = await CategDB.findOne({_id: Categ.Categ_far});
			Categ_far.Categ_sons.remove(id);
		}

		if(Categ.img_url && Categ.img_url.split("Categ").length > 1) await MdFiles.rmPicture(Categ.img_url);
		const objDel = await CategDB.deleteOne({_id: Categ._id});
		if(Categ_far) await Categ_far.save();

		return MdFilter.jsonSuccess(res, {message: "删除成功"});
	} catch(error) {
		return MdFilter.json500(res, {message: "CategDelete", error});
	}
}



exports.CategPut = async(req, res) => {
	console.log("/CategPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

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
		if(obj.code && (obj.code = obj.code.replace(/^\s*/g,"").toUpperCase()) && obj.code !== Categ.code){
			const errorInfo = MdFilter.objMatchStint(StintCateg, obj, ['code']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

			if(objSame) return MdFilter.jsonFailed(res, {message: '此分类编号已被占用, 请查看'});
			const objSame = await CategDB.findOne({_id: {$ne: Categ._id}, code: obj.code, Firm: payload.Firm});
			Categ.code = obj.code;
		}

		// 如果不是顶级分类 并且新的父分类与原父分类不同
		if((Categ.level > 1) && (obj.Categ_far && obj.Categ_far != Categ.Categ_far)) {
			// 新的父分类添加子分类 _id
			if(!MdFilter.isObjectId(obj.Categ_far)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
			const Categ_far = await CategDB.findOne({_id: obj.Categ_far, Firm: payload.Firm});
			if(!Categ_far) return MdFilter.jsonFailed(res, {message: "没有找到要改变的父分类"});

			if(!Categ_far.Categ_sons) Categ_far.Categ_sons = [];
			Categ_far.Categ_sons.push(id);
			const Categ_farSave = await Categ_far.save();
			if(!Categ_farSave) return MdFilter.jsonFailed(res, {message: "父分类 存储错误"})

			// 原父分类删除子分类 _id
			const Org_far = await CategDB.findOne({_id: Categ.Categ_far});
			if(!Org_far) return MdFilter.jsonFailed(res, {message: "原父分类信息错误"});
			Org_far.Categ_sons.remove(id);
			const Org_farSave = await Org_far.save();
			if(!Org_farSave) return MdFilter.jsonFailed(res, {message: "原父分类 存储错误"});

			Categ.Categ_far = obj.Categ_far;
		}

		if(obj.img_url && (obj.img_url != Categ.img_url) && Categ.img_url && Categ.img_url.split("Categ").length > 1){
			await MdFiles.rmPicture(Categ.img_url);
			Categ.img_url = obj.img_url;
		}
		
		Categ.User_upd = payload._id;
		let object = await Categ.save();
		// kelin 为了 react 的 二级分类
		if(object.level === 2) {
			object = await CategDB.findOne({_id: object.Categ_far})
				.populate({path: 'Categ_sons'})
		}
		return MdFilter.jsonSuccess(res, {message: "修改成功", data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Categ_general", error});
	}
}












const Categs_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm;
		if(payload.role > ConfUser.role_set.manager) pathObj.is_usable = 1;
	} else {
		pathObj.is_usable = 1;
	}

	if(!queryObj) return;
	if(MdFilter.isObjectId(queryObj.Categ_far)) {
		pathObj["Categ_far"] = queryObj.Categ_far;
	} else {
		pathObj.level = 1;
	}
	if(!isNaN(queryObj.type)) {
		pathObj["type"] = parseInt(queryObj.type);
	}
}
const Categ_path_Func = (pathObj, payload, queryObj) => {
	pathObj.Firm = payload.Firm;
	if(payload.role > ConfUser.role_set.manager) pathObj.is_usable = 1;
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
