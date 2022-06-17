const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;

const colection = 'Pnome';
const dbSchema = new Schema({
	code: String,								// 品牌编号
	sort: Number,
	at_upd: Date,								// [只读 自动]
	Firm: {type: ObjectId, ref: 'Firm'},		// [只读 绝对]
});

dbSchema.pre('save', function(next) {
	this.at_upd = Date.now();
	next();
})

module.exports = mongoose.model(colection, dbSchema);