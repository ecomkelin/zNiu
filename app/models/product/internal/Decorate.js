// Prod Sku
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Suppliment';
const dbSchema = new Schema({

	code: String,
	nome: String,

	Suppliments: [{type: ObjectId, ref: "Suppliment"}],

	// is_radio: Boolean,		// 单选 如果是单选
	// able_quantity: Boolean,	// 是否能作为数字填写 颜色 尺寸 甜度 等不能  配件 珍珠 薯条 等可以填写数字

	langs: [{
		Lang: {type: ObjectId, ref: 'Lang'},	// 如果为空 则为默认值
		desp: String, 							// 描述
	}],

	sort: {type: Number, default: 0},

	Firm: {type: ObjectId, ref: 'Firm'},		// [只读 绝对]
	User_crt: {type: ObjectId, ref: 'User'},	// [只读 绝对]
	User_upd: {type: ObjectId, ref: 'User'},	// [只读 绝对]
	at_crt: Date,								// [只读 绝对]
	at_upd: Date,								// [只读 绝对]
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