const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;

const colection = 'Step';
const dbSchema = new Schema({
	code: Number,
	nome: String,
	is_initUser: {type: Boolean, default: false},
	rels:[{
		Step: {type: ObjectId, ref: "Step"},
		btn_val: String,
		btn_color: String
	}],

	/* Client */
	exist_Client: {type: Boolean, default: false},
	sort: {type: Number, default: 0},
	nome_Client: String,
	is_initClient: {type: Boolean, default: false},
	crels: [{
		Step: {type: ObjectId, ref: "Step"},
		btn_val: String,
		btn_color: String
	}],

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
	next();
})

module.exports = mongoose.model(colection, dbSchema);





/*
User:
	最简单 奶茶店 东哥						弄堂里					小唐 吃饭仔				
	0 购物车								0 购物车					0 购物车
	// 点击下单							// 点击下单				// 点击下单
										3 准备中					3 准备中
										// 跑堂 最后一道菜			// 跑堂 最后一道菜
										4 待结账					
										// 结账
	5 交易完成 							5 交易完成				5 交易完成





Client 

	线上下单								店内客户下单				吃饭仔店内点
	0 购物车								0 购物车					0 购物车
	// 点击下单	C						// 点击下单				// 点击下单
	1 待付款 													1 待付款
	// 网上付款	或者 货到付款	c									// 付款后 服务员点击 U
	2 待接单								2 待接单					
	// 商家接单		U					// 收银员 确认接单
	3 准备中								3 准备中					3 准备中
	// 点击发货		U					// 跑堂	全部上完			// 最后一道菜上完
	4 已经发货（客户准备收货）				4 待结帐
	// 点击完成							// 完成结账
	5 交易完成							5 交易完成				5 完成


	// 历史订单
	6 历史订单


*/


// 配置
/*
conf = {
	steps: ['正在', "wancheng"... ],
}
Order: {
	Status: {}
}
// 活
StepPost = {
	name: "正在1"
}
const Status = [{
	_id: 1,

	name_back: {
		user: "正在",
		client: ""
	},

	
	sort: 1

	init_roles: [1000], // 有且只有唯一的一个ture

	rels:[{
		Step: 3,
		optRoles: [sfer, bser],
		btn: 确认完成
	}, {
		Step: 2,
		optRoles: [client, sfer],
		btn: 确认付款
	}],
},

// click => 确认完成
{
	code: 4,
	name: String

	is_init: [100, 101], // 有且只有唯一的一个ture

	code: "正在进行",
	rels:[{
		Step: 1,
		optRoles: [sfer, bser],
		btn: 返回到新建,
		flag: 2
	}, {
		Step: 3,
		optRoles: [sfer, bser],
		btn: 返回到未支付,
		flag : 2
	}, {
		Step: 5,
		optRoles: [client, sfer],
		btn: 确认付款,
		flag: 1
	}],
	
},
{
	code: 3
	name: String
	is_init: 
	code: "已经完成",
	last: null,
	last_ableRle: [老板],
	last_btn: '取消',
	next: null,
	next_optRoles: '',
	next_btn: ''
}, 

// click => 确认接单
{
	id: 3,
	is_init: false,
	code: "已经接单",
	last: 2,
	next: 
}]








Order = {
	code: String,

	...


	Step: 1,
}

OrderList Page
1 2 3
*/