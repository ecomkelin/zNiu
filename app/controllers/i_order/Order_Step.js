const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const StepDB = require(path.resolve(process.cwd(), 'app/models/order/Step'));
const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));


exports.OrderPutStep = async(req, res) => {
	console.log("/OrderPutStep");
	try{
		let payload = req.payload;
		let id = req.params.id;

		paramOrder = {_id: id};
		let flagUser = true;
		if(payload.Firm && payload.role) {
			if(payload.role > ConfUser.role_set.boss) paramOrder.User_Oder = payload._id;
			if(payload.Shop) paramOrder.Shop = payload.Shop._id || payload.Shop;
			paramOrder.Firm = payload.Firm._id || payload.Firm;
		} else {
			flagUser = false;
			paramOrder.Client = payload._id;
		}

		let Order = await OrderDB.findOne(paramOrder, {Step: 1}).populate("Step");
		if(!Order) return MdFilter.jsonFailed(res, {message: "没有此订单"});
		let orgStep = Order.Step;
		if(!orgStep) return MdFilter.jsonFailed(res, {message: "此订单无状态 请联系管理员"});
		let rels = flagUser ? orgStep.rels : orgStep.crels;
		if(!(rels instanceof Array)) return MdFilter.jsonFailed(res, {message: "此状态没有下一步"});

		let obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递 obj"});
		let Step_id = obj.Step_id;
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