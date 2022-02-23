const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Cashflow';
const dbSchema = new Schema({
	code: String,
	nome: String,
	desp: String,
	note: String,
	img_url: String,

	CategFir: {type: ObjectId, ref: 'Categ'},
	CategSec: {type: ObjectId, ref: 'Categ'},
	CategThd: {type: ObjectId, ref: 'Categ'},

	fCash: {type: ObjectId, ref: 'Cash'},
	price: Float,
	tCash: {type: ObjectId, ref: 'Cash'},

	Order: {type: ObjectId, ref: 'Order'},		// [只读 绝对]
	at_crt: Date,								// [只读 绝对]
	up_crt: Date,								// [只读 绝对]
	User_crt: {type: ObjectId, ref: 'User'},	// [只读 绝对]
	Shop: {type: ObjectId, ref: 'Shop'},		// [只读 绝对]
	Firm: {type: ObjectId, ref: 'Firm'},		// [只读 绝对]
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