const _ = require('underscore');

const path = require('path');
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles')); 
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter')); 
const PaidtypeDB = require(path.resolve(process.cwd(), 'app/models/finance/Paidtype')); 
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.PaidtypePost = async(req, res) => {
	console.log('/PaidtypePost');
	try {
		const payload = req.payload;
		let Firm = payload.Firm;
		if(Firm._id) Firm = Firm._id;

		let obj = req.body.obj;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Paidtype", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(obj.code) obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		if(!obj.code) return MdFilter.jsonFailed(res, {message: '请输入支付方式的名称代号'});

		let objSame = await PaidtypeDB.findOne({'code': obj.code, Firm});
		if(objSame) return MdFilter.jsonFailed(res, {message: '支付方式代号或名称相同'});

		if((obj.is_default == 1) || (obj.is_default === 'true')) obj.is_default = true;
		if(obj.is_default) {
			objSame = await PaidtypeDB.findOne({Firm, is_default: true});
			if(objSame) return MdFilter.jsonFailed(res, {message: '支付方式代号或名称相同'});

			obj.sort = 1000;
		} else {
			obj.sort = parseInt(obj.sort);
			if(isNaN(obj.sort)) obj.sort = 0;
			if(obj.sort > 100) obj.sort = 100;
		}

		if((obj.is_cash == 1) || (obj.is_cash === 'true')) obj.is_cash = true;
		if(!MdFilter.isObjectId(obj.Coin)) return MdFilter.jsonFailed(res, {message: '请输入支付方式的币种'});


		const _object = new PaidtypeDB(obj);
		const objSave = await _object.save();

		return MdFilter.jsonSuccess(res, {message: "PaidtypePost", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "PaidtypePost"});
	}
}

exports.PaidtypePut = async(req, res) => {
	console.log('/PaidtypePut');
	try {
		const payload = req.payload;
		let Firm = payload.Firm;
		if(Firm._id) Firm = Firm._id;

		const id = req.params.id;		// 所要更改的Paidtype的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Paidtype = await PaidtypeDB.findOne({_id: id});
		if(!Paidtype) return MdFilter.jsonFailed(res, {message: "没有找到此商品信息支付方式"});

		let obj = req.body.general;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Paidtype", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!obj.code) obj.code = Paidtype.code;
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		if(MdFilter.isObjectId(obj.Coin) && obj.Coin != Paidtype.Coin) Paidtype.Coin = obj.Coin;

		if(obj.code !== Paidtype.code) {
			const objSame = await PaidtypeDB.findOne({_id: {$ne: Paidtype._id}, code: obj.code, Firm});
			if(objSame) return MdFilter.jsonFailed(res, {message: '此支付方式编号已被占用, 请查看'});
		}
		if(obj.is_cash) {
			if((obj.is_cash == 1) || (obj.is_cash === 'true')) {
				obj.is_cash = true;
			} else if((obj.is_cash == 0) || (obj.is_cash === 'false')) {
				obj.is_cash = false;
			} else {
				return MdFilter.jsonFailed(res, {message: "is_cash 为Boolen"});
			}
		}

		if(obj.sort) {
			obj.sort = parseInt(obj.sort);
			if(isNaN(obj.sort)) obj.sort = 0;
			if(obj.sort > 100) obj.sort = 100;
		}

		if((obj.is_default == 1 || obj.is_default === 'true') && (Paidtype.is_default === false)) {
			notDefault_sort = obj.sort || 0;
			default_Paidtype = await PaidtypeDB.updateOne({Firm, is_default: true}, {is_default: false, sort: notDefault_sort});
			obj.sort = 1000;
		}
		const _object = _.extend(Paidtype, obj);

		const objSave = await _object.save();
		return MdFilter.jsonSuccess(res, {message: "PaidtypePut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "PaidtypePut", error});
	}
}

exports.PaidtypeDelete = async(req, res) => {
	console.log("/PaidtypeDelete");
	try {
		const payload = req.payload;
		const id = req.params.id;		// 所要更改的Paidtype的id
		const queryObj = req.query;
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {status: "请传递正确的数据_id"});
		const Paidtype = await PaidtypeDB.findOne({_id: id, is_default: false});
		if(!Paidtype) return MdFilter.jsonFailed(res, {status: "没有找到此支付方式 或者 不能删除默认支付方式"});

		if(Paidtype.img_url && Paidtype.img_url.split("Paidtype").length > 1) await MdFiles.rmPicture(Paidtype.img_url);
		const objDel = await PaidtypeDB.deleteOne({_id: id});
		return MdFilter.jsonSuccess(res, {message: "PaidtypeDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "PaidtypeDelete", error});
	}
}







const dbPaidtype = 'Paidtype';
exports.Paidtypes = async(req, res) => {
	console.log("/Paidtypes");
	try {
		const dbs_res = await GetDB.dbs(obtFilterObj(req));
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Paidtypes", error});
	}
}

exports.Paidtype = async(req, res) => {
	console.log("/Paidtype");
	try {
		const db_res = await GetDB.db(obtFilterObj(req, req.params.id));
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Paidtype", error});
	}
}

const obtFilterObj = (req, id) => {
	const DB_filter =  {
		payload: req.payload,
		queryObj: req.query,

		objectDB: PaidtypeDB,
		path_Callback: Paidtype_path_Func,
		dbName: dbPaidtype,
	};
	if(id) DB_filter.id = id;

	return DB_filter;
}


const Paidtype_path_Func = (pathObj, payload, queryObj) => {
	if(!queryObj) return;
	if(queryObj.is_cash) {
		const is_cash = (queryObj.is_cash == 1 || queryObj.is_cash === 'true') ? 1 :  0;
		pathObj["is_cash"] = {'$eq': is_cash};
	}
}