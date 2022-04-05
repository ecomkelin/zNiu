// Prod Sku
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Attr';
const dbSchema = new Schema({
	Prod: {type: ObjectId, ref: 'Prod'},

	nome: String,
	options: [String],

	key: String,
	values : [{
		item: String,
		price: {type: Float, default: 0}
	}],
	is_stock: Boolean,
	is_price: Boolean,

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