// 商品 spu
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Prod';
const dbSchema = new Schema({
	/* 同步时给出的信息 不可修改 */
	Shop: {type: ObjectId, ref: 'Shop'},			// [post写, put只读] 不可修改 商品所属店铺 
	Pd: {type: ObjectId, ref: 'Pd'},				// [post写, put只读] 不可修改 商品所属产品

	/* 为批发商做的 */
	Supplier: {type: ObjectId, ref: 'Supplier'},	// 产品所属供应商

	codeLen: Number,								// [只读] code 的长度
	codeMatchs: [{type: ObjectId, ref: 'Prod'}], 	// 相关同code的产品，为了前端缓存

	/* 如果 Pd 不为空则 只读*/
	code: String, 									// [if(Pd !== null)只读] 产品条形码
	codice: String,

	nome: String,									// [if(Pd !== null)只读] 产品名称
	nomeTR: String,									// [if(Pd !== null)只读] 其他名称
	unit: String,									// [if(Pd !== null)只读] 产品名称
	img_xs: String, 								// [if(Pd !== null)只读] 产品图片
	img_url: String, 								// [if(Pd !== null)只读] 产品图片
	img_urls: [String], 							// [if(Pd !== null)只读] 产品图片
	Brand: {type: ObjectId, ref: 'Brand'},			// [if(Pd !== null)只读] 产品品牌
	Nation: {type: ObjectId, ref: 'Nation'},		// [if(Pd !== null)只读] 产品国家 比如 中国货 意大利货 日本货 韩国货
	Categs: [{type: ObjectId, ref: 'Categ'}],			// [if(Pd !== null)只读] 
	noteCateg: String,

	is_quick: {type:Boolean, default: false},

	weight: Float,
	iva: Number, 									// [只读] 	税 意大利 默认 22
	num_batch: Number, 								// [只读] 一箱包含的数量
	price_cost: Float,								// 采购价
	price_regular: Float,							// 
	price_sale: Float,								//

	/* 同步 可修改 */
	desp: String,
	langs: [{
		Lang: {type: ObjectId, ref: 'Lang'},	// 如果为空 则为默认值
		nome: String,
		desp: String, 							// 描述
		unit: String,							// 单位
	}],
	// Tags: [{type: ObjectId, ref: 'Tag'}],
	sort: Number,

	is_usable: { type: Boolean, default: false },

	Attrs: [{type: ObjectId, ref: "Attr"}],			// [只读 相对 Attr] 公司层面是否可用

	/* 只读 根据 Skus 的price_sale 或 price_regular*/
	Skus: [{type: ObjectId, ref: 'Sku'}],			// [只读 相对 Skus] 公司层面是否可用
	is_simple: Boolean,								// [只读 绝对] 如果 Skus.length > 0 is_simple=false;

	/* 如果 is_simple 为 true */
	purchase_note: String,

	is_controlStock: {type: Boolean, default: true},
	quantity: {type:Number, default: 0},
	quantity_alert: {type: Number, default: 0},
	allow_backorder: {type: Boolean, default: true},	// 允许缺货下单

	/** 进出货 记录 因为库存出错 */
	qtLogs: [{
		at_crt: Date,
		desp: String, // -销售/+采购/+删除销售/-删除采购/ 手动变更
		pre: Number,
		log: Number,
		after: Number,
	}],

	/* 如果 is_simple 为 false 则[只读 相对 Sku] 如果 为true[只读 绝对] */
	price_unit: Float,								// [只读] 产品价格统一
	price_min: Float,								// [只读] 产品最低价
	price_max: Float,								// [只读] 产品最高价
	is_discount: Boolean, 							// [只读] [if 任意Sku true 控制 Prod]
	is_sell: Boolean,								// [只读] [if 任意Sku true 控制 Prod]
	is_alert: Boolean, 								// [只读] [if 任意Sku true 控制 Prod]

	/* 只读 客户给予 */
	num_likes: {type: Number, default: 0},					// [只读 绝对]
	Client_likes: [{type: ObjectId, ref: "Client"}],		// [只读 每个客户只能贡献一次]
	num_unlikes: {type: Number, default: 0},				// [只读 绝对]
	Client_unlikes: [{type: ObjectId, ref: "Client"}],		// [只读 每个客户只能贡献一次]

	/* 自动生成 */
	Firm: {type: ObjectId, ref: 'Firm'},			// [只读 绝对]
	User_crt: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	User_upd: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	at_crt: Date,									// [只读 绝对]
	at_upd: Date,									// [只读 绝对]
});

dbSchema.pre('save', function(next) {
	if(this.isNew) {
		if(!this.sort) this.sort = 0;
		if(!this.quantity) this.quantity = 0;
		if(!this.quantity_alert) this.quantity_alert = 0;
		this.at_upd = this.at_crt = Date.now();
	}
	this.at_upd = Date.now();

	if(!this.Skus || (this.Skus.length === 0)) {
		this.is_simple = true;
	} else {
		this.is_simple = false;
	}

	if(this.is_simple === true) {	// 如果是单品 则一些控制字段 是自身赋予的
		this.price_unit = this.price_min = this.price_max = this.price_sale;

		this.is_sell = this.is_usable
			? this.is_controlStock
				? this.allow_backorder
					? true
					: this.quantity > 0 ? true : false 
				: true
			: true;
		this.is_discount = (this.price_sale < this.price_regular) ? true : false ;

		this.is_alert = (this.quantity <= this.quantity_alert) ? true : false;
	} else {
		this.price_unit = (this.price_max == this.price_min) ? (this.price_max) : 0;
	}

	next();
})

module.exports = mongoose.model(colection, dbSchema);