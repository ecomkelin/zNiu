const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Suppliment';
const dbSchema = new Schema({

	Decorates: {type: ObjectId, ref: "Decorate"},
	val: String,
	desp: String,
	price: Float,
	img_url: String,

	langs: [{
		Lang: {type: ObjectId, ref: 'Lang'},	// 如果为空 则为默认值
		desp: String, 							// 描述
	}],

	sort: {type: Number, default: 0},

	Firm: {type: ObjectId, ref: 'Firm'},		// [只读 绝对]
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
	next();
})

module.exports = mongoose.model(colection, dbSchema);




const Suppliments = [{
// 	_id: ObjectId,
// 	Accessories: {type: ObjectId, ref: "Accessory"},
// 	val: Sting,
// 	price: Float,
// 	img_url: String,
// }];

// const Accessories = [
// {
// 	type: "加料",
// 	is_Multiple: false / true,
// 	code: "*****", name: "奶茶配料1",
// 	// Suppliments: {type: ObjectId, ref: "Suppliment"},
// 	Suppliments: [{val: "珍珠", price: 0.5 }, {val: "仙草", price: 1 }],
	
// },{
// 	type: "加料", is_Multiple: true,
// 	code: "*****", name: "奶茶配料2",
// 	// Suppliments: {type: ObjectId, ref: "Suppliment"},
// 	Suppliments: [{val: "珍珠", price: 0.5 }, {val: "奶盖", price: 1 }],
// },


// {
// 	type: "规格", is_Multiple: false,
// 	code: "*****", name: "温度",
// 	Suppliments: [{val: "热", price: 0 }, {val: "温", price: 0 }],
// }






// {
// 	code: "*****", name: "薯条",
// 	Suppliments: [{val: "普通薯条", price: 0.5 }, {val: "芝士薯条", price: 1 }, {val: "烧烤薯条", price: 1}],
// 	is_single: true, able_quantity: false,
// },

// {
// 	code: "*****", name: "腰带",
// 	Suppliments: [{val: "金色腰带", price: 1.5 }, {val: "银色腰带", price: 1 }],
// 	is_single: true, able_quantity: false,
// },

// {
// 	code: "*****", name: "衣服尺寸", is_stock: true,
// 	Suppliments: [{val: "XS", price: 0 }, {val: "S", price: 0 }， {val: "M", price: 0 }],
// 	is_single: true, able_quantity: false,
// }, {
// 	code: "*****", name: "衣服颜色", is_stock: true,
// 	Suppliments: [{val: "RED", price: 0 }, {val: "BLU", price: 0 }， {val: "WHITE", price: 0 }],
// 	is_single: true, able_quantity: false,
// }]



// const Pds = [
// {
// 	code: "*****",
// 	name: "衣服01",

// 	"加料": [{
// 		// Accessorie: {"腰带"}
// 		name: "腰带",
// 		// Suppliments: [{type: ObjectId, ref: 'Suppliment'}],
// 		Suppliments: [{val: "普通腰带", price: 0.5 }, {val: "牛皮腰带", price: 1 }],
// 		quantity_max: 3,
// 		quantity_min: 0
// 	}];

// 	"规格": [{
// 		name: "衣服颜色",
// 		// Suppliments: [{type: ObjectId, ref: 'Suppliment'}],
// 		Suppliments: [{val: "RED", price: 0 }, {val: "BLU", price: 0 }],
// 	}, {
// 		name: "衣服尺寸",
// 		// Suppliments: [{type: ObjectId, ref: 'Suppliment'}],
// 		Suppliments: [{val: "S", price: 0 }, {val: "M", price: 0 }, {val: "L", price: 0 }],
// 	}],

// 	price_sale: 10,
// },
// {
// 	code: "*****",
// 	name: "珍珠奶茶",
// 	Accessories: [{"珍珠配料"}];
// 	price_sale: 5,
// },];

// // s, red 金色腰带 蝴蝶结
// Orders = [{
// 	// OrderProds: [{type: ObjectId, ref: "OrderProd"}],
// 	OrderProds: [{
// 		// Prod: {type: ObjectId, ref: "Prod"},
// 		Prod: {"衣服01"},
// 		OrderSkus: [{
// 			// Sku: {type: ObjectId, ref: "Prod"},
// 			Sku: {Suppliments: ["RED" ,"S"], price: 10},
// 			sku: {key:"RED" ,key: "S", price: 10},
// 			suppliments: [
// 				{	
// 					suppliment: {val: "普通腰带", price: 0.5 },
// 					quantity: 2,
// 					price: 1
// 				}, {
// 					Suppliment: {val: "牛皮腰带", price: 1 },
// 					quantity: 2,
// 					price: 2
// 				}
// 			]
// 			price: 13,
// 			quantity: 2
// 			total: 26
// 		}, {
// 			...
// 			total: 14
// 		}]

// 		goods_price: 40
// 	},{
// 		// Prod: {type: ObjectId, ref: "Prod"},
// 		Prod: {"衣服02"},

// 		suppliments: [
// 			{	
// 				suppliment: {val: "普通腰带", price: 0.5 },
// 				quantity: 2,
// 				price: 1
// 			}
// 		]
// 		price: 12,
// 		quantity: 2
		
// 		goods_price: 24
// 	}, {
// 		// Prod: {type: ObjectId, ref: "Prod"},
// 		Prod: {"衣服02"},

// 		suppliments: [
// 			{	
// 				suppliment: {val: "牛皮腰带", price: 0.5 },
// 				quantity: 2,
// 				price: 1
// 			}
// 		]
// 		price: 12,
// 		quantity: 1
		
// 		goods_price: 12
// 	},{
// 		Prod: {"珍珠奶柴"},
// 		suppliments: [
// 			{
// 				Suppliment: {id: 1},
// 				quantity: 1,
// 				price: 1
// 			}
// 		]
// 		price_sale: 6,
// 		unit_price: 7,
// 		quantity: 3,
// 		goods_price: 21
// 	}]
// }]