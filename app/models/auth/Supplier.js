// 总公司管理者以上级别可以修改

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Shop';
const dbSchema = new Schema({
	is_plat: Boolean,								// 是否为平台关联

	/* 平台信息 */
	plat_code: String,								// 次供应商的平台编号

	code: String,									// 店铺编号
	nome: String,									// 店铺名称
	addr: String,									// 店铺地址
	zip: String,									// 店铺区号
	tel: String,
	img_url: String,								// 店铺logo
	img_urls: [String],								// 店铺照片
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