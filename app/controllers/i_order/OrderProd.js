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

exports.OrderProds_Analys = async(req, res) => {
	console.log("/OrderProds_Analys");
	
	try {
		const payload = req.payload
		const queryObj = req.query;

		// 过一遍整体 path
		const match = MdFilter.path_Func(queryObj);
		// 再过一遍 特殊 path
		OrderProd_path_Func(match, payload, queryObj);

		const group = {
			_id: null,
			count: {$sum: 1},
			tot_weight: {$sum: '$goods_weight'},
			tot_quantity: {$sum: '$goods_quantity'},
			tot_regular: {$sum: 'order_regular'},
			tot_sale: {$sum: '$order_sale'},
			tot_imp: {$sum: '$order_imp'},
			tot_paid: {$sum: '$order_paid'},
			tot_noPay: {$sum: '$order_noPay'},
		};
		if(queryObj.field) group._id = queryObj.field;	// Paidtype
		let analys = await OrderProdDB.aggregate([
			{$match: match}, 
			{$group: group}
		])
		
		// const GetDB_Filter = {
		// 	payload: payload,
		// 	queryObj: req.query,
		// 	objectDB: OrderProdDB,
		// 	path_Callback: OrderProd_path_Func,
		// 	dbName: dbOrderProd,
		// };
		// const dbs_res = await GetDB.dbs(GetDB_Filter);
		// dbs_res.analys = analys;
		// dbs_res.message = '分析成功';
		// // console.log('obj', count)
		// return MdFilter.jsonSuccess(res, dbs_res);
		return MdFilter.jsonSuccess(res, {status: 200, message: '分析成功', analys});
	} catch(error) {
		return MdFilter.json500(res, {message: "OrderProds", error});
	}
}
