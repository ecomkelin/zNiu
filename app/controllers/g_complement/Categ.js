const _ = require('underscore');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const StintCateg = require(path.resolve(process.cwd(), 'app/config/stint/StintCateg'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const CategDB = require(path.resolve(process.cwd(), 'app/models/complement/Categ'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.CategPost = async(req, res) => {
	console.log("/CategPost");
	try{
		let payload = req.payload;
		let Firm = payload.Firm._id || payload.Firm;
		let Shop = payload.Shop._id || payload.Shop;

		let obj = req.body.obj;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Categ", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		/** code nome 一致性 */
		if(!obj.code) obj.code = obj.nome;
		obj.nome = obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		let errorInfo = MdFilter.objMatchStint(StintCateg, obj, ['code']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

		/** 基础赋值 */
		obj.Firm = Firm;
		obj.Shop = Shop;
		obj.User_crt = payload._id;

		let paramCateg = {'code': obj.code}	// 判断是否已经存在
		paramCateg.Shop = Shop;
		let objSame = await CategDB.findOne(paramCateg);
		if(objSame) return MdFilter.jsonFailed(res, {message: '分类编号或名称相同'});


		let Categ_far = null;	// 其父分类

		obj.Categ_sons = [];	// 赋值子分类
		obj.num_sons = 0;		// 只读 子分类的个数 子分类个数为0的分类 可添加商品
		if(!MdFilter.isObjectId(obj.Categ_far)) {
			obj.Categ_far = null;
			obj.level = 1;
		} else {
			Categ_far = await CategDB.findOne({_id: obj.Categ_far, Shop});
			if(!Categ_far) return MdFilter.jsonFailed(res, {message: "添加 Categ时 没有找到 父分类"});

			let Prod = await ProdDB.findOne({Categs: Categ_far._id}, {_id: 1});
			if(Prod) return MdFilter.jsonFailed(res, {message: "添加 Categ时 父分类下不可有产品"});

			obj.Categ_far = Categ_far._id;
			obj.level = parseInt(Categ_far.level) + 1;
			if(isNaN(obj.level)) return MdFilter.jsonFailed(res, {message: "添加 Categ时 Categ.level 错误"});
		}

		let _object = new CategDB(obj);

		/** 如果有其有父分类 则为其父分类添加子分类 */
		if(Categ_far) {
			if(!Categ_far.Categ_sons) Categ_far.Categ_sons = [];
			Categ_far.Categ_sons.push(_object._id);
			Categ_far.num_sons = Categ_far.Categ_sons.length;
			Categ_far.save();
		}

		let object = await _object.save();
		return MdFilter.jsonSuccess(res, {message: "创建成功", data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CategPost", error});
	}
}

exports.CategDelete = async(req, res) => {
	console.log("/CategDelete");
	try{
		let payload = req.payload;

		let id = req.params.id;		// 所要更改的Categ的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		let pathObj = {_id: id};
		Categ_path_Func(pathObj, payload);

		let Categ = await CategDB.findOne(pathObj);
		if(!Categ) return MdFilter.jsonFailed(res, {message: "没有找到此分类信息"});

		let Categ_sons = await CategDB.findOne({_id: {$in: Categ.Categ_sons}});
		if(Categ_sons) return MdFilter.jsonFailed(res, {message: "请先删除其子分类"});

		let Prods = await ProdDB.find({Categs: Categ._id});
		if(Prods) return MdFilter.jsonFailed(res, {message: "分类下还有产品, 尽量改名 别删除"});

		if(Categ.img_url && Categ.img_url.split("Categ").length > 1) await MdFiles.rmPicture(Categ.img_url);
		let objDel = await CategDB.deleteOne({_id: Categ._id});

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

		let obj = req.body.general;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Categ", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		delete obj.num_sons;
		delete obj.level;
		delete obj.Categ_sons;
		delete obj.User_crt;
		delete obj.at_crt;
		delete obj.Firm;
		delete obj.Shop;

		Categ_general(res, obj, Categ, payload);
		
	} catch(error) {
		return MdFilter.json500(res, {message: "CategPut", error});
	}
}
const Categ_general = async(res, obj, Categ, payload) => {
	try{
		let Shop = payload.Shop._id || payload.Shop;

		/** code nome 一致性 */
		if(obj.code || obj.nome) {
			if(!obj.code) obj.code = obj.nome;
			obj.nome = obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

			if(obj.code !== Categ.code) {
				const errorInfo = MdFilter.objMatchStint(StintCateg, obj, ['code']);
				if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

				let match = {_id: {$ne: Categ._id}, code: obj.code};
				match.Firm = payload.Firm;
				if(payload.Shop) match.Shop = payload.Shop;
				const objSame = await CategDB.findOne(match);
				if(objSame) return MdFilter.jsonFailed(res, {message: '此分类编号已被占用, 请查看'});

				Categ.code = Categ.nome = obj.code;
			}
		}

		/** 删除图片 */
		if(obj.img_url && (obj.img_url != Categ.img_url) && Categ.img_url && Categ.img_url.split("Categ").length > 1){
			await MdFiles.rmPicture(Categ.img_url);
			Categ.img_url = obj.img_url;
		}

		// 如果不是顶级分类 并且新的父分类与原父分类不同
		if(obj.Categ_far && (obj.Categ_far != Categ.Categ_far)) {

			// 新的父分类添加子分类 _id
			if(!MdFilter.isObjectId(obj.Categ_far)) return res.json({status: 400, message: "[server] 请传递正确的数据 _id"});
			const Categ_far = await CategDB.findOne({_id: obj.Categ_far, Shop});
			if(!Categ_far) return res.json({status: 400, message: "没有找到要改变的父分类"});

			if(!Categ_far.Categ_sons) Categ_far.Categ_sons = [];
			Categ_far.Categ_sons.push(id);
			Categ_far.num_sons = Categ_far.Categ_sons.length;
			

			obj.level = parseInt(Categ_far.level) + 1;
			if(isNaN(obj.level)) return MdFilter.jsonFailed(res, {message: "更新 Categ时 Categ.level 错误"});

			// 原父分类删除子分类 _id
			const Org_far = await CategDB.findOne({_id: Categ.Categ_far});
			if(!Org_far) return res.json({status: 400, message: "原父分类信息错误"});
			let isEOF = ArrayDelChild(Org_far.Categ_sons, id);
			if(isEOF === -2) return MdFilter.jsonFailed(res, {message: "原父分类删除 Categ_sons 元素错误"});

			/** 保存信息 */
			const Categ_farSave = await Categ_far.save();
			if(!Categ_farSave) return res.json({status: 400, message: "父分类 存储错误"});

			const Org_farSave = await Org_far.save();
			if(!Org_farSave) return res.json({status: 400, message: "原父分类 存储错误"});

			Categ.Categ_far = obj.Categ_far;
		}
		
		Categ.User_upd = payload._id;
		let object = await Categ.save();
		return MdFilter.jsonSuccess(res, {message: "修改成功", data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Categ_general", error});
	}
}








const Categs_path_Func = (pathObj, payload, queryObj) => {
	if(payload.role) {
		pathObj.Firm = payload.Firm._id || payload.Firm;
		if(payload.Shop) pathObj.Shop = payload.Shop._id || payload.Shop;
	} else {
		pathObj.is_usable = 1;
	}

	if(!queryObj) return;
	if(!isNaN(queryObj.level)) {
		pathObj["level"] = parseInt(queryObj.level);
	}
	if(queryObj.Categ_fars) {
		let ids = MdFilter.stringToObjectIds(queryObj.Categ_fars);
		pathObj["Categ_far"] = {$in: ids};
	}
	if(queryObj.Categ_sons) {
		let ids = MdFilter.stringToObjectIds(queryObj.Categ_sons);
		pathObj["Categ_sons"] = {$in: ids};
	}
}
const Categ_path_Func = (pathObj, payload, queryObj) => {
	pathObj.Firm = payload.Firm._id || payload.Firm;
	if(payload.Shop) pathObj.Shop = payload.Shop._id || payload.Shop;
	if(!payload.role) pathObj.is_usable = 1;
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
