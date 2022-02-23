const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Table';
const dbSchema = new Schema({
	code: String,									// 餐桌编号
	nome: String,									// 餐桌名称
	img_url: String,

	capacity: Number,								// 桌子的容量

	price_post: Float,								// 座位费_每个人 客户数量在order中

	Reserves: [{type: ObjectId, ref: "Reserves"}],	// [只读 相对]

	is_usable: { type: Boolean, default: true },
	sort: Number,

	User_upd: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	User_crt: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	at_upd: Date,									// [只读 绝对]
	at_crt: Date,									// [只读 绝对]
	Firm: {type: ObjectId, ref: 'Firm'},			// [只读 绝对]
	Shop: {type: ObjectId, ref: 'Shop'},			// [只读 绝对]
});

dbSchema.pre('save', function(next) {
	if(this.isNew) {
		if(!this.sort) this.sort = 0;
		this.at_upd = this.at_crt = Date.now();
	} else {
		this.at_upd = Date.now();
	}
	next();
})

module.exports = mongoose.model(colection, dbSchema);