// 总公司管理者以上级别可以修改

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Shop';
const dbSchema = new Schema({
	code: String,									// 店铺编号	必须是字母
	nome: String,									// 店铺名称

	// 发票信息
	addr: String,									// 店铺地址
	zip: String,									// 店铺邮编
	city: String, 									// 店铺 commune
	province: String,								// 省份 两个字符
	country: String,								// 国家 两个字符

	vat: String,									// P.iva
	fc: String,										// fiscal code 税号
	name: String,									// 给发票用的正规名称

	tel: String,									// 发票 电话
	mail: String,

	// 发票 最新信息
	invoice_code: String, 								// 6个纯数字
	invoice_fileName: String,

	note: String,									// 我们自己看的
	/** ader 管理 */
	allow_virtualOrder: {type: Boolean, default: false},		// 是否允许生成虚拟订单
	allow_codeDuplicate: {type: Boolean, default: false}, // 是否允许重复code, 重复code需要添加 codeMatchs
	allow_Supplier: {type: Boolean, default: false},	// 在产品上 是否允许专属供应商 产品code显示为 code(产品)-code(供应商)
	allow_online: {type: Boolean, default: false},		// 是否允许线上经营 如果允许 那么商家可以看到 Categ 等线上运营信息

	is_Pnome: {type: Boolean, default: false},	// 是否使用 Pnome
	is_main: {type: Boolean, default: false},	// 是否为公司主店
	is_boutique: {type: Boolean, default: false},	// 是否为精品店
	is_usable: { type: Boolean, default: true },	// 是否可用

	/** ader 管理 */

	cassa_auth: {				// 老板给收银员的权限
		hide_orders: Boolean,
		hide_clients: Boolean
	},

	img_url: String,								// 店铺logo

	phonePre: String,
	phoneNum: String,
	phone: String,										// [只读 绝对]	// 登录信息 电话

	Cita: {type: ObjectId, ref: 'Cita'},			// 所属城市	如果更换 需要检查服务城市列表是否有此城市

	price_ship: Float,								// 本地运费
	serve_Citas: [{									// 服务区
		Cita: {type: ObjectId, ref: 'Cita'},			// 服务城市
		price_ship: Float,								// 额外运费, 如果无则为0 
	}],

	sort: Number,									// 排序
	tot_reserves: Number, 							// 可预定人数(餐馆用的)

	User_upd: {type: ObjectId, ref: 'User'},		// [只读 自动]
	User_crt: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	at_upd: Date,									// [只读 自动]
	at_crt: Date,									// [只读 绝对]
	Firm: {type: ObjectId, ref: 'Firm'},			// [只读 绝对]
});
dbSchema.pre('save', function(next) {
	if(this.isNew) {
		this.at_upd = this.at_crt = Date.now();
	} else {
		this.at_upd = Date.now();
	}
	this.phone = (this.phonePre && this.phoneNum) ? (String(this.phonePre) + String(this.phoneNum)) : '';

	next();
});

module.exports = mongoose.model(colection, dbSchema);