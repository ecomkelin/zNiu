const _ = require('underscore');

const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const BindDB = require(path.resolve(process.cwd(), 'app/models/auth/Bind'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.BindPut = async(req, res) => {
	console.log("/BindPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Bind的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};

		const Bind = await BindDB.findOne(pathObj);
		if(!Bind) return MdFilter.jsonFailed(res, {message: "没有找到此Bind信息"});

		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		const _object = _.extend(Bind, obj);

		const objSave = await _object.save();
		return MdFilter.jsonSuccess(res, {message: "BindPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "BindPut", error});
	}
}

exports.BindDelete = async(req, res) => {
	console.log("/BindDelete");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Bind的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据 _id"});

		const pathObj = {_id: id};

		const Bind = await BindDB.findOne(pathObj);
		if(!Bind) return MdFilter.jsonFailed(res, {message: "没有找到此Bind信息"});

		const objDel = await BindDB.deleteOne({_id: Bind._id});
		return MdFilter.jsonSuccess(res, {message: "BindDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "BindDelete", error});
	}
}







const dbBind = "Bind";
const Bind_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm;
	} else {
		pathObj.Client = payload.Client;
	}

	if(!queryObj) return;
}

exports.Binds = async(req, res) => {
	console.log("/Binds");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: BindDB,
			path_Callback: Bind_path_Func,
			dbName: dbBind,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Binds", error});
	}
}

exports.Bind = async(req, res) => {
	console.log("/Bind");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: BindDB,
			path_Callback: Bind_path_Func,
			dbName: dbBind,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Bind", error});
	}
}