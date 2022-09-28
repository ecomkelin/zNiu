const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Bill';
const dbSchema = new Schema({
	type_Bill: Number, 							// [只读 绝对] enum: [1, -1]
	Client: {type: ObjectId, ref: 'Client'},
	Supplier: {type: ObjectId, ref: 'Supplier'},
	code: String,

	// typeBill: Number 							// 客户欠款1 还款-1。  或者 对供应商欠款 1 还款 -1
	// Categ: {type: ObjectId, ref: "Categ"},

	Order: {type: Order, ref: 'Order'},

	time_crt: Date,
	time_due: Date,

	nome: String,
	note: String,
	img_url: String,

	price: Float,

	// recorders: [{
	// 	Bill: {type: ObjectId, ref: "recorder"},
	// 	price: Float,
	// }],

	paids: [{
		time: Date,
		price: Float,
		note: String,
		img_url: String,
	}],
	remain: Float,

	sort: Number,
	at_crt: Date,								// [只读 绝对]
	at_upd: Date,								// [只读 绝对]
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
})

module.exports = mongoose.model(colection, dbSchema);