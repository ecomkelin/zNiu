const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Paidtype';
const dbSchema = new Schema({
	code: String,								// 编号名称(唯一)
	nome: String,
	img_url: String,

	is_cash: {type: Boolean, default: false}, 	// 是否为现金
	Coin: {type: ObjectId, ref: 'Coin'},

	is_default: {type: Boolean, default: false},

	sort: {type: Number, default: 0},
	Firm: {type: ObjectId, ref: 'Firm'},		// [只读 绝对]
});

dbSchema.pre('save', function(next) {
	next();
})

module.exports = mongoose.model(colection, dbSchema);