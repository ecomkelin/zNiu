const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Reserve';
const dbSchema = new Schema({
	nome: String,								// 预约人姓名
	Client: {type: ObjectId, ref: 'Client'},

	num_person: Number,							// 预约人数
	num_baby: {type: Number, default: 0},		// 预约小朋友数量
	num_post: {type: Number, default: 0},		// [只读 绝对] 预约人数
	// 最终的数量 可能需要按双数计算

	//（预约单成立前 找出所有 gte at_start 和 lte at_end 的预约单 计算总人数, 如果多余店铺人数则不可预约）
	at_arrive: Date, 							// 到达时间

	at_start: Date,								// 离开预留时间 如果未设置 则未到达时间前的2个小时
	at_end: Date,								// 离开时间 如果未设置 则未到达时间后的2个小时

	// 如果要预约桌号, 还需要查看此桌号当时是否有预定
	Table: {type: ObjectId, ref: 'Table'},		// 预约的桌号 默认为空

	User_upd: {type: ObjectId, ref: 'User'},	// [只读 自动]
	User_crt: {type: ObjectId, ref: 'User'},	// [只读 绝对]
	at_upd: Date,								// [只读 自动]
	at_crt: Date,								// [只读 绝对]
	Firm: {type: ObjectId, ref: 'Firm'},		// [只读 绝对]
	Shop: {type: ObjectId, ref: 'Shop'},		// [只读 绝对]
});

dbSchema.pre('save', function(next) {
	if(this.isNew) {
		if(!this.sort) this.sort = 0;
		this.at_upd = this.at_crt = Date.now();
	} else {
		this.at_upd = Date.now();
	}
	this.num_post = this.num_person + this.num_baby;
	next();
})

module.exports = mongoose.model(colection, dbSchema);