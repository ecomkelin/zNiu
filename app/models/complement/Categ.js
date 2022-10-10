const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;

const colection = 'Categ';
const dbSchema = new Schema({

	code: String,

	nome: String,

	img_url: String,

	langs: [{
		Lang: {type: ObjectId, ref: 'Lang'},
		desp: String,
	}],

	is_usable: { type: Boolean, default: true },
	sort: {type: Number, default: 0},

	level: Number, 									// 只读;
	Categ_far: {type: ObjectId, ref: 'Categ'},

	Categ_sons: [{type: ObjectId, ref: 'Categ'}],	// 只读
	num_sons: {type: Number, default: 0},			// 只读 子分类的个数 子分类个数为0的分类 可添加商品


	User_upd: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	User_crt: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	at_upd: Date,									// [只读 绝对]
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
})

module.exports = mongoose.model(colection, dbSchema);