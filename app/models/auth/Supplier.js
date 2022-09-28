// 总公司管理者以上级别可以修改

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Supplier';
const dbSchema = new Schema({
	is_plat: Boolean,								// 是否为平台关联

	/* 平台信息 */
	plat_code: String,								// 此供应商的平台编号 比如 0342SHP**** 0342位平台号 SHP为店铺号
	// let plat_code = "0342SHP234";
	// let dns_code = plat_code.match(/^[0-9]+/gi)[0];
	// console.log("dns_code: ", dns_code); 	// 0342
	// plat_code = plat_code.slice(dns_code.length);
	// let shop_code = plat_code.match(/^[a-z|A-Z]+/gi);
	// console.log(111, shop_code[0]);			// SHP
	// 234 为Client code

	/* 基本信息 */
	code: String,									// 供应商编号 [自动]
	nome: String,									// 供应商名称
	addr: String,									// 供应商地址
	zip: String,									// 供应商区号
	tel: String,
	img_url: String,								// 供应商logo
	img_urls: [String],								// 供应商照片
	contact: String, 

	is_usable: { type: Boolean, default: true },	// 是否可用
	sort: Number,									// 排序

	User_upd: {type: ObjectId, ref: 'User'},		// [只读 自动]
	User_crt: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	at_upd: Date,									// [只读 自动]
	at_crt: Date,									// [只读 绝对]
	Firm: {type: ObjectId, ref: 'Firm'},			// [只读 绝对]
	Shop: {type: ObjectId, ref: 'Shop'},			// [只读 绝对]
});
dbSchema.pre('save', function(next) {
	if(this.isNew) {
		this.at_upd = this.at_crt = Date.now();
	} else {
		this.at_upd = Date.now();
	}

	next();
});

module.exports = mongoose.model(colection, dbSchema);