const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const OrderProdDB = require(path.resolve(process.cwd(), 'app/models/order/OrderProd'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

const vOrderProd_path_Func = (pathObj, payload, queryObj) => {
	if(!queryObj) return;
	if(MdFilter.isObjectId(queryObj.Order) ) pathObj["Order"] = queryObj.Order;
	if(MdFilter.isObjectId(queryObj.Prod) ) {
		pathObj.Prod = queryObj.Prod;
	}
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
			path_Callback: vOrderProd_path_Func,
			dbName: dbOrderProd,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "OrderProds", error});
	}
}
