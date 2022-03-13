const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Sku';
const dbSchema = new Schema({
	Pd: {type: ObjectId, ref: 'Pd'},		// [只读 绝对]
	Prod: {type: ObjectId, ref: 'Prod'},	// [只读 绝对]

	attrs: [{
		nome: String,
		option: String
	}],

	weight: Float,
	iva: Float, 									// [只读] 	税 意大利 默认 22
	num_batch: Number, 								// [只读] 一箱包含的数量
	price_cost: Float,						// 采购价
	price_regular: Float,
	price_sale: Float,

	// at_fromSale: Date,
	// at_toSale: Date,

	purchase_note: String,
	limit_quantity: {type: Number, default: 0},

	batchs: [{
		quantity: Number,
		at_pur: Date,
		at_exp: Date,
	}],

	is_controlStock: {type: Boolean, default: true},

	quantity: Number,
	quantity_alert: Number,
	allow_backorder: {type: Boolean, default: true},

	is_usable: {type: Boolean, default: true }, 

	is_alert: Boolean, 							// [只读 绝对]
	is_discount: Boolean, 						// [只读 绝对]
	is_sell: Boolean, 							// [只读 绝对]

	User_crt: {type: ObjectId, ref: 'User'},	// [只读 绝对]
	User_upd: {type: ObjectId, ref: 'User'},	// [只读 绝对]
	at_crt: Date,								// [只读 绝对]
	at_upd: Date,								// [只读 绝对]

	Firm: {type: ObjectId, ref: 'Firm'},		// [只读 绝对]
	Shop: {type: ObjectId, ref: 'Shop'},		// [只读 绝对]
});

dbSchema.pre('save', function(next) {
	if(this.isNew) {
		if(!this.sort) this.sort = 0;
		if(!this.quantity) this.quantity = 0;
		if(!this.quantity_alert) this.quantity_alert = 0;
		this.at_upd = this.at_crt = Date.now();
	}
	this.at_upd = Date.now();
	this.is_sell = this.is_usable
		? this.is_controlStock
			? this.allow_backorder
				? true
				: this.quantity > 0 ? true : false 
			: true
		: true;
	if(this.price_sale > this.price_regular) this.price_sale = this.price_regular;
	if(isNaN(this.price_sale)) this.price_sale = 0;
	this.is_discount = (this.price_sale < this.price_regular) ? true : false ;

	this.is_alert = (this.quantity <= this.quantity_alert) ? true : false;

	next();
})

module.exports = mongoose.model(colection, dbSchema);