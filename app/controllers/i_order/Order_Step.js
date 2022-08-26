const ObjectId = require('mongodb').ObjectId;
const moment = require('moment');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const ConfOrder = require(path.resolve(process.cwd(), 'app/config/conf/ConfOrder'));
const ConfStep = require(path.resolve(process.cwd(), 'app/config/conf/ConfStep'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const StepDB = require(path.resolve(process.cwd(), 'app/models/order/Step'));
const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));
const OrderProdDB = require(path.resolve(process.cwd(), 'app/models/order/OrderProd'));
const OrderSkuDB = require(path.resolve(process.cwd(), 'app/models/order/OrderSku'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const SkuDB = require(path.resolve(process.cwd(), 'app/models/product/Sku'));
const CitaDB = require(path.resolve(process.cwd(), 'app/models/address/Cita'));
const PaidtypeDB = require(path.resolve(process.cwd(), 'app/models/finance/Paidtype'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));




exports.OrderPutStep = async(req, res) => {
	console.log("/OrderPutStep");
	try{
		let payload = req.payload;
		let id = req.params.id;

		paramOrder = {_id: id};
		if(payload.Firm && payload.role) {
			if(payload.role > ConfUser.role_set.boss) {
				paramOrder.User_Oder = payload._id;
			}
			if(payload.Shop) {
				paramOrder.Shop = payload.Shop._id || payload.Shop;
			}

			paramOrder.Firm = payload.Firm._id || payload.Firm;
		} else {
			paramOrder.Client = payload._id;
		}
		let Order = await OrderDB.findOne(paramOrder, {Step: 1}).populate("Step");
		if(!Order) return MdFilter.jsonFailed(res, {message: "没有此订单"});
		let orgStep = Order.Step;
		if(!orgStep) return MdFilter.jsonFailed(res, {message: "此订单无状态 请联系管理员"});
		let rels = orgStep.rels;
		if(!(rels instanceof Array)) return MdFilter.jsonFailed(res, {message: "此状态没有下一步"});

		let i = 0;
		for(; i<rels.length; i++) {
			let rel = rels[i];
			if(String(rel.Step) === Step_id) break;
		}
		if(i === rels.length) return MdFilter.jsonFailed(res, {message: "此状态的下一步 没有此状态"});

		Order.Step = Step_id;
		await Order.save();

		return MdFilter.jsonSuccess(res, {status: 200, data: {object: Order}});
	} catch(e) {
		console.log("OrderPutBack Error: ", e);
		return MdFilter.json500(res, {message: "OrderPutStep", e});
	}
}