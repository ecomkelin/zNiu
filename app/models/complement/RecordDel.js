const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;

const colection = 'Record';
const dbSchema = new Schema({
    dbname: String,          // 真正的数据库名称 比如 Order Prod

    is_Delete: Boolean,      // 因为除了删除 就是修改

    del_datas: [{
        field: String,              // 所属字段 比如 code, Client, typeOrder, imp, nome(Prod)
        fieldty: String,            // 所属字段的翻译 比如 编号, 客户, 订单方式, 金额, 产品名称

        valPre: String,             // 字段的值  1023, '章三', 销售订单/采购订单, 103.58, 裙子
        val: String
    }],
    
    User_crt: {type: ObjectId, ref: 'User'},    // 是谁操作的

	at_crt: Date,                               // 何时操作的

	Shop: {type: ObjectId, ref: 'Shop'},        // 所属商铺 
});

dbSchema.pre('save', function(next) {
	this.at_cr = Date.now();
	next();
})

module.exports = mongoose.model(colection, dbSchema);