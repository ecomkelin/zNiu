const _ = require('underscore');
const path = require('path');

const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const RecordDB = require(path.resolve(process.cwd(), 'app/models/complement/Record'));

const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));


exports.RecordPost_func = (payload, recordObj, object, obj={}) => {
	/** 删除日志 记录 */
	let {dbName, is_Delete} = recordObj;
	if(!dbName) {
		console.log("Error RecordPost_func non dbName");
		return;
	}

	recordObj.datas = [];

	if(is_Delete) {
		let fields = [];
		if(dbName === "Order") fields = ["code", "type_Order", "order_imp"];
		else if(dbName === "Prod") fields = ["code", "nome", "desp", "price_regular"];

		for(i in fields) {
			let field = fields[i];
			let data = {
				field,
				valPre: object[field]
			};
			recordObj.datas.push(data);
		}
	} else {
		let basicFields = [];
		if(dbName === "Prod") basicFields = ["code", "nome", "nomeTR", "price_regular", "price_sale", "price_cost", "quantity"];

		let fields = Object.keys(obj);
		if(fields.length === 0) {
			console.log("Error RecordPost_func, dbName: "+dbName)
			return;
		}
		
		for(i in fields) {
			let field = fields[i];
			if(!basicFields.includes(field)) {
				continue;
			}
			if(obj[field] instanceof Object) {
				continue;
			}
			if(obj[field] == object[field]){
				continue;
			}

			let data = {
				field,
				valPre: object[field],
				val: obj[field]
			};
			recordObj.datas.push(data);
		}
	}
	if(recordObj.datas.length > 0) {
		recordObj.User_crt = payload._id;
		recordObj.Shop = payload.Shop._id || payload.Shop;
		let _object = new RecordDB(recordObj);
		_object.save();
	}

}


const Record_path_Func = (pathObj, payload, queryObj) => {
	pathObj.Shop = payload.Shop._id || payload.Shop;

	if(!queryObj) return;
	
	let r_dbNames = ["Prod", "Order"];
	if(r_dbNames.includes(queryObj.dbName)) {
		pathObj["dbName"] = queryObj.dbName;
	}
	if(queryObj.is_Delete) {
		let is_Delete = (queryObj.is_Delete == 1 || queryObj.is_Delete === 'true') ? true : false;
		pathObj["is_Delete"] = is_Delete;
	}
}


const dbRecord = 'Record';
exports.Records = async(req, res) => {
	console.log("/Records");
	try {
		const payload = req.payload || req.ip;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: RecordDB,
			path_Callback: Record_path_Func,
			dbName: dbRecord,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Records", error});
	}
}