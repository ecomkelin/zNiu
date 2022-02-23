const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const colection = 'Income';
const dbSchema = new Schema({
	code: String,		// 公司编号_分店编号_2021/01/01-2021/12/31
	at_start: Date,
	at_end: Date,

	nome: String,
	img_url: String,

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
})
module.exports = mongoose.model(colection, dbSchema);