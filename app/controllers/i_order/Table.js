const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const ReserveDB = require(path.resolve(process.cwd(), 'app/models/order/Reserve'));
const TableDB = require(path.resolve(process.cwd(), 'app/models/order/Table'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.TablePost = async(req, res) => {
	console.log("/TablePost");
	try{
		const payload = req.payload;

		// 判断 基本参数 是否正确
		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的obj数据"});

		obj.Firm = payload.Firm;
		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "您的个人信息错误 您的payload.Shop 不存在"});
		obj.Shop = payload.Shop._id;


		// 基本信息赋值
		if(obj.code) obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		if(!obj.code) return MdFilter.jsonFailed(res, {message: "请输入桌子编号"});
		const objSame = await TableDB.findOne({code: obj.code, Shop: obj.Shop});
		if(objSame) return MdFilter.jsonFailed(res, {message: "本店有相同的桌子编号"});

		if(obj.nome) obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
		if(!obj.nome) return MdFilter.jsonFailed(res, {message: "请输入桌子名称"});

		obj.capacity = parseInt(obj.capacity);
		if(isNaN(obj.capacity)) return MdFilter.jsonFailed(res, {message: "请输入桌子能容纳几人"});

		obj.price_post = parseFloat(obj.price_post);
		if(isNaN(obj.price_post)) obj.price_post = 0;

		obj.is_usable = (obj.is_usable == 1 || obj.is_usable === 'true') ? true : false;

		obj.sort = parseInt(obj.sort);
		if(isNaN(obj.sort)) obj.sort = 0;

		obj.User_upd = obj.User_crt = payload._id;

		const _Table = new TableDB(obj);

		const objSave = await _Table.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "餐桌 数据库保存错误"});

		return MdFilter.jsonSuccess(res, {data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "TablePost", error});
	}
}

exports.TablePut = async(req, res) => {
	console.log("/TablePut");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Table的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Table = await TableDB.findOne({_id: id, Shop: payload.Shop._id});
		if(!Table) return MdFilter.jsonFailed(res, {message: "没有找到此Table信息"});

		if(obj.code) {
			obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
			if(obj.code !== Table.code) {
				if(!obj.code) return MdFilter.jsonFailed(res, {message: "请输入桌子名称"});
				const objSame = await TableDB.findOne({_id: {$ne: id}, code: obj.code, Shop: Table.Shop});
				if(objSame) return MdFilter.jsonFailed(res, {message: "本店有相同的桌子编号"});
				Table.code = obj.code;
			}
		}

		if(obj.nome) {
			obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
			if(!obj.nome) return MdFilter.jsonFailed(res, {message: "请输入桌子名称"});
			Table.nome = obj.nome;
		}

		if(obj.capacity) {
			obj.capacity = parseInt(obj.capacity);
			if(isNaN(obj.capacity)) return MdFilter.jsonFailed(res, {message: "请输入桌子能容纳几人"});
			Table.capacity = obj.capacity;
		}
		if(obj.price_post) {
			obj.price_post = parseFloat(obj.price_post);
			if(isNaN(obj.price_post)) return MdFilter.jsonFailed(res, {message: "请输入桌子能容纳几人"});
			Table.price_post = obj.price_post;
		}
		if(obj.is_usable) {
			Table.is_usable = (obj.is_usable == 1 || obj.is_usable === 'true') ? true : false;
		}

		if(obj.sort) {
			obj.sort = parseInt(obj.sort);
			if(isNaN(obj.sort)) return MdFilter.jsonFailed(res, {message: "请输入桌子能容纳几人"});
			Table.sort = obj.sort;
		}

		Table.User_upd = payload._id;

		const objSave = await Table.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "预定 数据库保存错误"});

		return MdFilter.jsonSuccess(res, {message: "TablePut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "TablePut", error});
	}
}

// 只有总部可以删除
exports.TableDelete = async(req, res) => {
	console.log("/TableDelete");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Table的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Table = await TableDB.findOne({_id: id, Shop: payload.Shop._id});
		if(!Table) return MdFilter.jsonFailed(res, {message: "没有找到此Table信息"});

		const objDel = await TableDB.deleteOne({_id: id});

		return MdFilter.jsonSuccess(res, {message: "TableDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "TableDelete", error});
	}
}







const Table_path_Func = (pathObj, payload, queryObj) => {
	pathObj.Firm = payload.Firm;
	if(payload.role >= ConfUser.role_set.printer) {
		pathObj.Shop = payload.Shop._id;
	}

	if(!queryObj) return;
	if(queryObj.status) {
		const arrs = MdFilter.stringToArray(queryObj.status);
		// if(arrs.length > 0) pathObj.status["$in"] = arrs;
		if(arrs.length > 0) pathObj.status = {"$in": arrs};
	}
	if(queryObj.Clients && payload.role < ConfUser.role_set.printer) {
		const arrs = MdFilter.stringToArray(queryObj.Clients);
		if(arrs.length > 0) pathObj.Client = {"$in": arrs};
	}
	if(queryObj.Shops && payload.role < ConfUser.role_set.printer) {
		const arrs = MdFilter.stringToArray(queryObj.Shops);
		if(arrs.length > 0) pathObj.Shop = {"$in": arrs};
	}
}
const dbTable = 'Table';
exports.Tables = async(req, res) => {
	console.log("/Tables");
	// console.log(req.query)
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: TableDB,
			path_Callback: Table_path_Func,
			dbName: dbTable,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Tables", error});
	}
}

exports.Table = async(req, res) => {
	console.log("/Table");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: TableDB,
			path_Callback: Table_path_Func,
			dbName: dbTable,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Table"});
	}
}