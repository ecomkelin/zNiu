const ObjectId = require('mongodb').ObjectId;

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const OrderProdDB = require(path.resolve(process.cwd(), 'app/models/order/OrderProd'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

const OrderProd_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm;
		if(payload.role >= ConfUser.role_set.printer) {
			pathObj.Shop = payload.Shop._id;
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
	if(queryObj.Suppliers) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Suppliers);
		if(arrs.length > 0) pathObj.Supplier = {"$in": arrs};
	}
	
	if(queryObj.Shops && payload.role < ConfUser.role_set.printer) {
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