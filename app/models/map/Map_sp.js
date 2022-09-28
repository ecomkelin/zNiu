const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Map_sp';
const dbSchema = new Schema({
	Supplier: {type: ObjectId, ref: 'Supplier'},// [只读 绝对]


	Pd: {type: ObjectId, ref: 'Pd'},			// [只读 绝对]
	Firm: {type: ObjectId, ref: 'Firm'},		// [只读 绝对]

	Prod: {type: ObjectId, ref: 'Prod'},		// [只读 绝对]
	Shop: {type: ObjectId, ref: 'Shop'},		// [只读 绝对]

	price_cost: Float,
	note: String,


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
})

module.exports = mongoose.model(colection, dbSchema);