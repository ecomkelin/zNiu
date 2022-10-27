const path = require('path');
const RecordDB = require(path.resolve(process.cwd(), 'app/models/complement/Record'));

const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const ConfOrder = require(path.resolve(process.cwd(), 'app/config/conf/ConfOrder'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));
const OrderProdDB = require(path.resolve(process.cwd(), 'app/models/order/OrderProd'));
const OrderSkuDB = require(path.resolve(process.cwd(), 'app/models/order/OrderSku'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const SkuDB = require(path.resolve(process.cwd(), 'app/models/product/Sku'));
const PaidtypeDB = require(path.resolve(process.cwd(), 'app/models/finance/Paidtype'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));




exports.OrderPutBack = async(req, res) => {
	console.log("/OrderPutBack");
	try{
		const payload = req.payload;
		const id = req.params.id;
		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		
		const Order = await OrderDB.findOne({_id: id, Firm: payload.Firm});
		if(!Order) return MdFilter.jsonFailed(res, {message: "没有找到此订单信息"});

		
		if(obj.isPaid == 1 || obj.isPaid == 'true') {
			Order.isPaid = true;
		} else if(obj.isPaid == 0 || obj.isPaid == 'false') {
			Order.isPaid = false;
		}

		if(obj.is_pass == 1 || obj.is_pass == 'true') {
			Order.is_pass = true;
		} else if(obj.is_pass == 0 || obj.is_pass == 'false') {
			Order.is_pass = false;
		}

		const objSave = await Order.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "订单修改存储错误"});

		if(req.query.populateObjs) {
			const GetDB_Filter = {
				id: objSave._id,
				payload,
				queryObj: req.query,
				objectDB: OrderDB,
				path_Callback: null,
				dbName: dbOrder,
			};
			const db_res = await GetDB.db(GetDB_Filter);

			return MdFilter.jsonSuccess(res, db_res);
		} else {
			return MdFilter.jsonSuccess(res, {message: "OrderPutBack", data: {object: objSave}});
		}
		
	} catch(error) {
		console.log("OrderPutBack Error: ", error);
		return MdFilter.json500(res, {message: "OrderPutBack", error});
	}
}







exports.OrderPut = async(req, res) => {
	console.log("/OrderPut_ship");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Order的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Order = await OrderDB.findOne({_id: id, Client: payload._id, status: ConfOrder.status_obj.placing.num})
			.populate({path: "Shop", select: "serve_Citas"});
		if(!Order) return MdFilter.jsonFailed(res, {message: "没有找到此订单信息"});

		const obj = req.body.general;
		if(obj) {
			if(ConfOrder.type_ship_Arrs.includes(obj.type_ship)) Order.type_ship = obj.type_ship;	
			if(MdFilter.isObjectId(obj.Paidtype)) Order.Paidtype = obj.Paidtype;
			if(obj.note_Client) Order.note_Client = obj.note_Client;	
		}

		let Paidtype = null;
		// 修改付款方式
		if(MdFilter.isObjectId(obj.Paidtype) && String(obj.Paidtype) != String(Order.Paidtype)) {
			Paidtype = await PaidtypeDB.findOne({_id: Order.Paidtype})
				.populate("Coin");
			if(!Paidtype) return MdFilter.jsonFailed(res, {message: "没有找到此付款方式"});
			if(!Paidtype.Coin) return MdFilter.jsonFailed(res, {message: "付款方式中的币种错误"});
			Order.Paidtype = Paidtype._id;
			Order.rate = Paidtype.Coin.rate;
			Order.symbol = Paidtype.Coin.symbol;
			Order.is_defCoin = Paidtype.Coin.is_defCoin;
			if(obj.price_coin) obj.price_coin = parseFloat(obj.price_coin);
			if(isNaN(obj.price_coin)) Order.price_coin = Order.order_imp * Order.rate;
		}

		// Client 的 银行付款信息
		const paid_info = req.body.paid_info;
		if(!Order.Paidtype) {
			Order.paid_info = null;
		} else if(paid_info) {
			if(!Paidtype) Paidtype = await PaidtypeDB.findOne({_id: Order.Paidtype});
			if(!Paidtype) return MdFilter.jsonFailed(res, {message: "没有找到此付款方式"});
			if(Paidtype.is_cash == true) {
				Order.paid_info = null;
			} else {
				Order.paid_info = paid_info;
			}
		}


		const objSave = await Order.save();
		return MdFilter.jsonSuccess(res, {message: "OrderPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "OrderPut", error});
	}
}

// 只有总部可以删除
exports.OrderDelete = async(req, res) => {
	console.log("/OrderDelete");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Order的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		// const force = req.query.force;
		// if(force !== payload.code) return MdFilter.jsonFailed(res, {message: "请传递force的值为本人code"});

		const res_del = await OrderDelete_Prom(payload, id);

		console.log(1111, res_del.data.object);

		await OrderSkuDB.deleteMany({Order: id});
		await OrderProdDB.deleteMany({Order: id});

		return MdFilter.jsonRes(res, res_del);
	} catch(error) {
		return MdFilter.json500(res, {message: "OrderDelete", error});
	}
}


const OrderDelete_Prom = (payload, id) => {
	// console.log("/OrderDelete_Prom");
	return new Promise(async(resolve) => {
		try{
			const pathObj = {
				_id: id,
				Firm: payload.Firm,
				// is_hide_client: true,
			};
			if(payload.Shop) pathObj.Shop = payload.Shop._id || payload.Shop;

			const Order = await OrderDB.findOne(pathObj, {code: 1, order_imp: 1, OrderProds: 1, type_Order: 1})
				.populate({
					path: "OrderProds",
					select: "is_simple Prod quantity OrderSkus",
					populate: {path: "OrderSkus", select: "Sku quantity"}
				});
			if(!Order) return resolve({status: 400, message: "没有找到此订单信息"});

			/** 删除日志 记录 */
			let obj = {};
			obj.dbname = "Order";
			obj.is_Delete = true;
			obj.del_datas = [{
				field: 'code',
				fieldTR: '编号',
				valPre: Order.code
			},{
				field: 'type_Order',
				fieldTR: '订单类型',
				valPre: 1? '采购' : '销售'
			},{
				field: 'order_imp',
				fieldTR: '订单价格',
				valPre: Order.order_imp
			}];
			let _object = new RecordDB(obj);
			_object.save();

			// console.log(Order)
			let sign = -parseInt(Order.type_Order);
			for(let i=0; i<Order.OrderProds.length; i++) {
				const OrderProd = Order.OrderProds[i];
				// console.log(OrderProd)
				if(OrderProd.is_simple === true) {
					let quantity = parseInt(sign * OrderProd.quantity);
					if(isNaN(quantity)) return resolve({status: 500, message: "OrderDelete isNaN(quantity)"});
					await ProdDB.updateOne({"_id" : OrderProd.Prod},{$inc: {quantity}} );
				} else {
					for(let j=0; j<OrderProd.OrderSkus.length; j++) {
						const OrderSku = OrderProd.OrderSkus[j];
						let quantity = parseInt(sign* OrderSku.quantity);
						if(isNaN(quantity)) return resolve({status: 500, message: "OrderDelete isNaN(quantity)"});
						await SkuDB.updateOne({"_id": OrderSku.Sku}, {$inc: {quantity}});
					}
				}
			}

			OrderSkuDB.deleteMany({Order: id});
			OrderProdDB.deleteMany({Order: id});
			await OrderDB.deleteOne({_id: id});

			return resolve({status: 200, message: "OrderDelete", data: {object: Order}});
		} catch(error) {
			return resolve({status: 500, message: "OrderDelete", error});
		}
	})
}









const Order_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm._id || payload.Firm;
		if(payload.role >= ConfUser.role_set.printer) {
			pathObj.Shop = payload.Shop._id || payload.Shop;
			if(payload.role > ConfUser.role_set.boss) {
				pathObj.User_Oder = payload._id;
			}
		}
	} else {
		pathObj.is_hide_client = false;
		pathObj.Client = payload._id;
	}

	if(!queryObj) return;
	if(queryObj.status) {
		const arrs = MdFilter.stringToArray(queryObj.status);
		// if(arrs.length > 0) pathObj.status["$in"] = arrs;
		if(arrs.length > 0) pathObj.status = {"$in": arrs};
	}
	if(queryObj.User_Oder) {
		pathObj.User_Oder = queryObj.User_Oder
	}
	if(queryObj.is_virtual) {
		pathObj.is_virtual = (queryObj.is_virtual == 1 || queryObj.is_virtual === 'true') ? true : false;
	}
	if(queryObj.Clients) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Clients);
		if(arrs.length > 0) pathObj.Client = {"$in": arrs};
		if(queryObj.Clients === 'null') pathObj.Client = {"$eq": null};
	}
	if(queryObj.Suppliers) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Suppliers);
		if(arrs.length > 0) pathObj.Supplier = {"$in": arrs};
		if(queryObj.Suppliers === 'null') pathObj.Supplier = {"$eq": null};
	}
	if(queryObj.Paidtypes) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Paidtypes);
		if(arrs.length > 0) pathObj.Paidtype = {"$in": arrs};
	}
	if(queryObj.Shops && payload.role < ConfUser.role_set.printer) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Shops);
		if(arrs.length > 0) pathObj.Shop = {"$in": arrs};
	}
	pathObj.type_Order = (queryObj.type_Order == 1) ? 1 : -1;
}
const dbOrder = 'Order';
exports.Orders = async(req, res) => {
	console.log("/Orders");
	// console.log(111, req.query)
	// const ods = await OrderDB.find({}).limit(5);
	// console.log(222, ods);
	try {
		const payload = req.payload
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: OrderDB,
			path_Callback: Order_path_Func,
			dbName: dbOrder,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Orders", error});
	}
}

exports.Order = async(req, res) => {
	console.log("/Order");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: OrderDB,
			path_Callback: Order_path_Func,
			dbName: dbOrder,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Orders", error});
	}
}















const tickets = [];
indexOfArrayObject = (arrs, field, str) => {
	if(!(arrs instanceof Array)) return -2;
	let index=0;
	for(;index<arrs.length; index++) {
		if(String(arrs[index][field]) == String(str)) break;
	}
	if(index == arrs.length) return -1;
	return index;
}
exports.addTicket = async(req, res) => {
	console.log("/addTicket");
	try {
		let payload = req.payload;
		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "需要店铺身份打印"});
		let Shop = payload.Shop._id || payload.Shop;
		let typePrint = req.query.typePrint;	// 什么类型的打印

		let GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: OrderDB,
			path_Callback: Order_path_Func,
			dbName: dbOrder,
		};
		let db_res = await GetDB.db(GetDB_Filter);
		if(db_res.status !== 200) return MdFilter.jsonSuccess(res, db_res);
		let object = db_res.data.object;		// 找到要打印的订单

		let index = indexOfArrayObject(tickets, 'id', object._id);
		if(index < -1) return MdFilter.json500(res, {message: "addTicket tickets Error"});
		if(index > -1) tickets.splice(index, 1);
		tickets.push({id: object._id, object, typePrint, Shop});
		db_res.message = "addTicket";
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "addTicket", error});
	}
}
exports.getTickets = (req, res) => {
	try {
		let payload = req.payload;
		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "需要店铺身份打印"});
		let Shop = payload.Shop._id || payload.Shop;

		let objects = [];
		tickets.forEach(item => {
			if(item.Shop === Shop) objects.push(item);
		})
		return MdFilter.jsonSuccess(res, {message: "getTickets", data: {objects}})
	} catch (error) {
		return MdFilter.json500(res, {message: "clearTicket", error});
	}
}
exports.clearTicket = (req, res) => {
	try {
		let payload = req.payload;
		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "需要店铺身份打印"});
		let Shop = payload.Shop._id || payload.Shop;
		let objects = [];
		tickets.forEach(item => {
			if(item.Shop !== Shop) objects.push(item);
		})
		tickets = objects;
		return MdFilter.jsonSuccess(res, {message: "清除打印任务成功"})
	} catch (error) {
		return MdFilter.json500(res, {message: "clearTicket", error});
	}
}

exports.printTicket = (req, res) => {
	try {
		let payload = req.payload;
		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "需要店铺身份打印"});
		let Shop = payload.Shop._id || payload.Shop;

		let status = 400;
		let message = "暂无数据";
		let object = null;
		let count = 0;
		
		if((tickets instanceof Array) && tickets.length > 0) {

			let objects = [];
			tickets.forEach(item => {
				if(item.Shop === Shop) objects.push(item);
			})
			count = objects.length;
			object = objects[0];

			let index = indexOfArrayObject(tickets, 'id', object.id);
			if(index < -1) return MdFilter.json500(res, {message: "printTicket Error"});
			if(index > -1) tickets.splice(index, 1);
			status = 200;
			message = "打印成功";
		}
		return MdFilter.jsonRes(res, {status, message: "printTicket", data: {object, count}, })
	} catch (error) {
		return MdFilter.json500(res, {message: "printTicket", error});
	}
}