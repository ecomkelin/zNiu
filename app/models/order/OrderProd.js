const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'OrderProd';
const dbSchema = new Schema({
	Order: {type: ObjectId, ref: "Order"},				// [只读 绝对]
	Client: {type: ObjectId, ref: 'Client'},			// [只读 权限 Client只读]
	type_Order: Number, 								// [post写(Client[-1]) put只读] enum: [1, -1] 采购 销售
	Supplier: {type: ObjectId, ref: 'Shop'},			// 供应商
	// 基本信息
	Prod: {type: ObjectId, ref: "Prod"},				// [只读 绝对]
	is_simple: Boolean,									// [只读 绝对]

	nome: String,										// [只读 绝对]
	unit: String,										// [只读 绝对]

	OrderSkus: [{type: ObjectId, ref: "OrderSku"}],		//
	/* 如果 is_simple 为 true */
	weight: Float, 										// [只读] 	订单的货品重量
	price_regular: Float,								// [只读 相对]
	price_sale: Float,									// [只读 权限 Client只读]
	price: Float, 										// 前台给的
	quantity: {type:Number, default: 0},				// 采购本条目总数
	is_picked: {type:Boolean, default: false},			// 是否配货完成 辅助配货员用的

	/* 如果 is_simple 为 false 由 ProSku决定的信息  否则 由 price_* 决定 */
	prod_weight: Float, 								// [只读] 	订单的货品重量
	prod_quantity: {type:Number, default: 0},			// [只读 相对] 本条目总量
	prod_regular: {type:Float, default: 0},				// [只读 相对] 总原价
	prod_sale: {type:Float, default: 0},				// [只读 相对] 本条目总价
	prod_price: {type:Float, default: 0},				// [只读 相对] 本条目总价

	// 额外信息
	Pd: {type: ObjectId, ref: "Pd"},					// [只读 绝对] 所属产品
	Client: {type: ObjectId, ref: 'Client'},			// [只读 绝对]
	Shop: {type: ObjectId, ref: 'Shop'},				// [只读 绝对]
	Firm: {type: ObjectId, ref: 'Firm'},				// [只读 绝对]
	at_crt: Date,										// [只读 绝对]
	at_upd: Date,										// [只读 绝对]
});

dbSchema.pre('save', function(next) {
	if(this.isNew) {
		this.at_upd = this.at_crt = Date.now();
	} else {
		this.at_upd = Date.now();
	}

	next();
})

module.exports = mongoose.model(colection, dbSchema);