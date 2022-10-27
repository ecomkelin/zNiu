const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;

const colection = 'Record';
const dbSchema = new Schema({
    dbName: String,          // 真正的数据库名称 比如 Order Prod

    is_Delete: {type: Boolean, default: false},      // 因为除了删除 就是修改

    datas: [{
        field: String,              // 所属字段 比如 code, Client, typeOrder, imp, nome(Prod)

        valPre: String,             // 字段的值  1023, '章三', 销售订单/采购订单, 103.58, 裙子
        val: String
    }],

    
    
    User_crt: {type: ObjectId, ref: 'User'},    // 是谁操作的

	at_crt: Date,                               // 何时操作的

	Shop: {type: ObjectId, ref: 'Shop'},        // 所属商铺 
});

dbSchema.pre('save', function(next) {
	this.at_crt = Date.now();
	next();
})

module.exports = mongoose.model(colection, dbSchema);