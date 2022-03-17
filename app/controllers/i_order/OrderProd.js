const ObjectId = require('mongodb').ObjectId;

const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const OrderProdDB = require(path.resolve(process.cwd(), 'app/models/order/OrderProd'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

const OrderProd_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm;
		if(payload.role >= ConfUser.role_set.boss) {
			pathObj.Shop = payload.Shop;
		}
	} else {
		pathObj.is_hide_client = false;
		pathObj.Client = payload._id;
	}

	if(!queryObj) return;
	if(MdFilter.isObjectId(queryObj.Order) ) pathObj["Order"] = queryObj.Order;
	if(MdFilter.isObjectId(queryObj.Prod) ) {
		pathObj.Prod = queryObj.Prod;
	}
	if(queryObj.Clients) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Clients);
		if(arrs.length > 0) pathObj.Client = {"$in": arrs};
	}
	if(queryObj.Shops && payload.role < ConfUser.role_set.boss) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Shops);
		if(arrs.length > 0) pathObj.Shop = {"$in": arrs};
	}
	pathObj.type_Order = (queryObj.type_Order == 1) ? 1 : -1;
}

const dbOrderProd = 'OrderProd';
exports.OrderProds = async(req, res) => {
	console.log("/OrderProds");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: OrderProdDB,
			path_Callback: OrderProd_path_Func,
			dbName: dbOrderProd,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "OrderProds", error});
	}
}

exports.OrderProds_Analys = async(req, res) => {
	console.log("/OrderProds_Analys");
	
	try {
		const payload = req.payload
		const queryObj = req.query;

		// 过一遍整体 path
		const match = MdFilter.path_Func(queryObj);
		// 再过一遍 特殊 path
		OrderProd_path_Func(match, payload, queryObj);
		Object.keys(match).forEach(item => {
			if(match[item].length === 24 && MdFilter.isObjectId(match[item])) {
				match[item] = ObjectId(match[item]);
			}
		})

		const group = {
			_id: null,
			count: {$sum: 1},
			tot_weight: {$sum: 'prod_weight'},
			tot_quantity: {$sum: 'prod_quantity'},
			tot_regular: {$sum: 'prod_regular'},
			tot_sale: {$sum: 'prod_sale'},
			tot_price: {$sum: 'prod_price'},
		};
		if(queryObj.field) group._id = '$'+queryObj.field;

		let analys = await OrderProdDB.aggregate([
			{$match: match}, 
			{$group: group}
		])
		
		return MdFilter.jsonSuccess(res, {status: 200, message: '分析成功', analys});
	} catch(error) {
		return MdFilter.json500(res, {message: "OrderProds", error});
	}
}
