const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'OrderSku';
const dbSchema = new Schema({
	Order: {type: ObjectId, ref: "Order"},				// [只读 绝对]
	OrderProd: {type: ObjectId, ref: "OrderProd"},		// [只读 绝对]
	Client: {type: ObjectId, ref: 'Client'},			// [只读 权限 Client只读]
	type_Order: Number, 								// [post写(Client[-1]) put只读] enum: [1, -1] 采购 销售
	Supplier: {type: ObjectId, ref: 'Shop'},			// 供应商
	status: Number,										// enum: ConfOrder;
	// 基本信息
	Sku: {type: ObjectId, ref: "Sku"},					// [post写, put只读]
	attrs: String,										// [只读 相对 Sku]
	weight: Float, 										// [只读] 	订单的货品重量
	price_regular: Float,								// [只读 相对 Sku] 加入购物车时的原价 客户confirm时的原价
	price_sale: Float,									// [只读 权限 Client相对 Sku] 加入购物车时的交易价格 客户confirm时的交易价格
	price: Float, 										// 前台给的
	quantity: Number, 									// 采购本条目总数

	is_picked: {type:Boolean, default: false},			// [只读 权限 Client只读]是否配货完成 辅助配货员用的

	// 标识信息
	Pd: {type: ObjectId, ref: "Pd"},					// [只读 绝对]
	Prod: {type: ObjectId, ref: "Prod"},				// [只读 绝对]
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
	if(!this.quantity) this.quantity = 0;
	if(!this.price_sale) this.price_sale = 0;
	if(!this.price_regular) this.price_regular = 0;
	this.tot = this.price_sale * this.quantity;
	this.tot_regular = this.price_regular * this.quantity;
	this.tot_discout = this.tot_regular - this.tot;

	next();
})

module.exports = mongoose.model(colection, dbSchema);