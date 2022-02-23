const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Cash';
const dbSchema = new Schema({
	code: String,								// 唯一编号 [ LKLCASH FirmCASH LKLSANPAOLO GYQSANPALO C1Payable ]
	nome: String,
	desp: String,
	note: String,
	img_url: String,

	type_cash: String,							// enum: ['cash', 'receivable', 'payable'],
	symble: Number, 							// [只读 绝对] enum: [1, -1]

	price: Float,

	at_crt: Date,								// [只读 绝对]
	up_crt: Date,								// [只读 绝对]
	User_crt: {type: ObjectId, ref: 'User'},	// [只读 绝对]
	Shop: {type: ObjectId, ref: 'Shop'},		// [只读 绝对]
	Firm: {type: ObjectId, ref: 'Firm'},		// [只读 绝对]

});

dbSchema.pre('save', function(next) {
	if(this.isNew) {
		this.at_upd = this.at_crt = Date.now();
		if(!this.at_start) this.at_start = this.at_crt;
	} else {
		this.at_upd = Date.now();
	}
	this.symble = (this.type_cash === 'payable') ? -1 : 1;

	if(isNaN(this.price)) this.price = 0;
	if(this.price < 0) this.price = 0;
	next();
})

module.exports = mongoose.model(colection, dbSchema);