const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'CartProd';
const dbSchema = new Schema({
    Shop: { type: ObjectId, ref: 'Shop' },
    Client: { type: ObjectId, ref: 'Client' },

    Prod: { type: ObjectId, ref: "Prod" },
    is_delete_Prod: {type: Boolean, default: false},

    price_sale: Float,									// 添加到购物车时的价格， 如果商品价格有变化 
    sale_Prod: Float,                                   // 完全等于

    quantity: { type: Number, default: 0 },

    sort: {type: Number, default: 0},
    at_crt: Date,								// [只读 绝对]
    at_upd: Date,								// [只读 绝对]
});

dbSchema.pre('save', function (next) {
    if(this.isNew) {
		this.at_upd = this.at_crt = Date.now();
	} else {
		this.at_upd = Date.now();
	}
    next();
})

module.exports = mongoose.model(colection, dbSchema);