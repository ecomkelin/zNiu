const ObjectId = require('mongodb').ObjectId;
const moment = require('moment');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const ConfOrder = require(path.resolve(process.cwd(), 'app/config/conf/ConfOrder'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));
const OrderProdDB = require(path.resolve(process.cwd(), 'app/models/order/OrderProd'));
const OrderSkuDB = require(path.resolve(process.cwd(), 'app/models/order/OrderSku'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const SkuDB = require(path.resolve(process.cwd(), 'app/models/product/Sku'));
const CitaDB = require(path.resolve(process.cwd(), 'app/models/address/Cita'));
const PaidtypeDB = require(path.resolve(process.cwd(), 'app/models/finance/Paidtype'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));









exports.OrderPost = async(req, res) => {
	console.log("/OrderPost");
	try{
		const payload = req.payload;

		// 判断 基本参数 是否正确
		const obj_Order = req.body.obj;
		if(!obj_Order) return MdFilter.jsonFailed(res, {message: "请传递正确的obj数据"});

		// 判断是否删除旧订单 （比如 Client取消的订单重新下单， User订单修改）
		const org_OrderId = req.body.Order ? req.body.Order : false;
		delete obj_Order._id;

		// 确认订单所属 (Shop)
		if(ConfUser.role_Arrs.includes(payload.role)) {
			if(payload.role < ConfUser.role_set.boss) return MdFilter.jsonFailed(res, {message: "您的身份不是店铺工作人员"});
			obj_Order.Shop = payload.Shop._id;
		} else {
			if(!MdFilter.isObjectId(obj_Order.Shop)) return MdFilter.jsonFailed(res, {message: "请传递正确的Shop_id信息"});
		}
		const Shop = await ShopDB.findOne({_id: obj_Order.Shop, is_usable: 1}, {code:1, serve_Citas: 1, Firm: 1})
			.populate({path: 'serve_Citas.Cita'});
		if(!Shop) return MdFilter.jsonFailed(res, {message: "没有找到此商店信息"});

		// 订单状态
		obj_Order.status = ConfOrder.status_obj.placing.num;

		// Client 订单的送货方式
		if(obj_Order.type_ship == ConfOrder.type_ship_obj.sClient.num) {
			obj_Order.ship_info = null;
		} else if(obj_Order.type_ship == ConfOrder.type_ship_obj.sShop.num) {
			if(!obj_Order.ship_info) return MdFilter.jsonFailed(res, {message: "请传递ship_info"})

			if(!obj_Order.ship_info.Client_nome) return MdFilter.jsonFailed(res, {message: "请传递客户名称"});
			if(!obj_Order.ship_info.phone) return MdFilter.jsonFailed(res, {message: "请传递电话号码"});
			// 判断送货城市 是否在商店服务范围
			if(!obj_Order.ship_info.Cita_code) return MdFilter.jsonFailed(res, {message: "请传递ship_info中的城市"});
			let i=0;
			for(; i<Shop.serve_Citas.length; i++) {
				const serve_Cita = Shop.serve_Citas[i];
				if(obj_Order.ship_info.Cita_code === String(serve_Cita.Cita.code)) break;
			}
			if(i === Shop.serve_Citas.length) return MdFilter.jsonFailed(res, {message: "此城市不在服务区"});
			const Cita = await CitaDB.findOne({code: obj_Order.ship_info.Cita_code}, {code: 1, nome:1});
			if(!Cita) return MdFilter.jsonFailed(res, {message: "没有找到此城市"});

			obj_Order.ship_info.city = Cita.code;
		}

		// 支付方式及下单时汇率和币种 只有员工才可以有支付方式 // 如果是客户端 则自动设置支付方式 wx zfb stripe paypal等
		if(ConfUser.role_Arrs.includes(payload.role)) {
			if(!MdFilter.isObjectId(obj_Order.Paidtype)) return MdFilter.jsonFailed(res, {message: "请传递支付方式"});
			const Paidtype = await PaidtypeDB.findOne({_id: obj_Order.Paidtype}).populate("Coin");
			if(!Paidtype) return MdFilter.jsonFailed(res, {message: "没有找到此付款方式"});
			if(!Paidtype.Coin) return MdFilter.jsonFailed(res, {message: "付款方式中的币种错误"});
			obj_Order.Paidtype = Paidtype._id;
			obj_Order.is_defCoin = Paidtype.Coin.is_defCoin;	// 是否为默认币种
			obj_Order.symbol = Paidtype.Coin.symbol;
			obj_Order.rate = parseFloat((Paidtype.Coin.rate).toFixed(2));

			// obj_Order.tax_rate = parseFloat((obj_Order.tax_rate).toFixed(2));
			obj_Order.is_tax = (obj_Order.is_tax == 1 || obj_Order.is_tax == 'true') ? true: false;

			let ship_sale = obj_Order.ship_sale || 0;
			obj_Order.ship_sale = parseFloat(ship_sale.toFixed(2));
			obj_Order.ship_regular = obj_Order.ship_sale;
			obj_Order.ship_discount = 0;

			if(isNaN(obj_Order.price_coin)) return MdFilter.jsonFailed(res, {message: "请传递支付货币的金额"});
			obj_Order.price_coin = parseFloat(obj_Order.price_coin);

			obj_Order.isPaid = (obj_Order.isPaid == 1 || obj_Order.isPaid == 'true') ? true : false;
		}

		// 基本信息赋值
		if(org_OrderId) {
			const org_Order = await OrderDB.findOne({_id: org_OrderId});
			if(!org_Order) return MdFilter.jsonRes(res, {message: "没有找到需要修改的订单"});
			obj_Order.code = org_Order.code;
			obj_Order.at_crt = org_Order.at_crt;
		} else {
			const code_res = await generate_codeOrder_Prom(Shop._id, Shop.code);
			if(code_res.status !== 200) return MdFilter.jsonRes(res, {message: code_res.message});
			obj_Order.code = code_res.data.code;
			obj_Order.at_crt = Date.now();

			// obj_Order.shop 已赋值
			if(isNaN(obj_Order.price_paid)) obj_Order.price_paid = 0;
			obj_Order.price_paid = parseFloat(obj_Order.price_paid);
		}

		obj_Order.Firm = Shop.Firm;

		if(!(obj_Order.OrderProds instanceof Array)) return MdFilter.jsonFailed(res, {message: "购物车中的产品数据obj.OrderProds参数错误[应该是数组]"});
		const oProds = [...obj_Order.OrderProds];
		obj_Order.OrderProds = [];	// 数据格式化, 在循环中再添加 OrderProd 的 _id;

		obj_Order.goods_weight = 0;
		obj_Order.goods_quantity = 0;
		obj_Order.goods_regular = 0;
		obj_Order.goods_sale = 0;
		obj_Order.at_confirm = Date.now();

		// 根据(type_Order)确定(Supplier)或(Client)
		obj_Order.type_Order =  (obj_Order.type_Order == ConfOrder.type_Order_obj.purchase.num) ? 1 : -1;
		const type_Order = obj_Order.type_Order;
		if(obj_Order.type_Order == ConfOrder.type_Order_obj.purchase.num) {
			obj_Order.Client = null;
			if(!ConfUser.role_Arrs.includes(payload.role)) return MdFilter.jsonFailed(res, {message: "您无权采购"});
			if(!MdFilter.isObjectId(obj_Order.Supplier)) return MdFilter.jsonFailed(res, {message: "请传递供应商信息"});
			const Supplier = await ShopDB.findOne({_id: obj_Order.Supplier, Firm: null});
			if(!Supplier)  return MdFilter.jsonFailed(res, {message: "找不到此供应商"});
		} else {
			obj_Order.Supplier = null;
			if(ConfUser.role_Arrs.includes(payload.role)) {
				obj_Order.Client = (MdFilter.isObjectId(obj_Order.Client)) ? obj_Order.Client : null;
			} else {
				obj_Order.Client = payload._id;
			}
		}

		// 生成 订单(Order)数据库基本信息
		const _Order = new OrderDB(obj_Order);

		const obj_OrderProds = [];
		const obj_OrderSkus = [];
		for(let i = 0; i<oProds.length; i++){
			const obj_OrderProd = oProds[i];
			if(!MdFilter.isObjectId(obj_OrderProd.Prod)) continue;
			const Prod = await ProdDB.findOne({_id: obj_OrderProd.Prod, Shop: obj_Order.Shop});
			// if(!Prod || Prod.is_usable === false || Prod.is_sell === false) continue;
			if(!Prod) continue;
			// 为数据分析做铺垫
			obj_OrderProd.Order = _Order._id;
			obj_OrderProd.Client = _Order.Client;
			obj_OrderProd.type_Order = type_Order;
			obj_OrderProd.Supplier = _Order.Supplier;
			obj_OrderProd.Shop = _Order.Shop;
			obj_OrderProd.Firm = _Order.Firm;
			obj_OrderProd.status = _Order.status;
			obj_OrderProd.Pd = Prod.Pd;
			obj_OrderProd.is_simple = Prod.is_simple;

			obj_OrderProd.nome = Prod.nome;
			obj_OrderProd.unit = Prod.unit;

			obj_OrderProd.prod_quantity = 0;
			obj_OrderProd.prod_weight = 0;
			obj_OrderProd.prod_regular = 0;
			obj_OrderProd.prod_sale = 0;
			obj_OrderProd.prod_price = 0;

			let _OrderProd
			if(Prod.is_simple === true) {
				obj_OrderProd.quantity = parseInt(obj_OrderProd.quantity);
				obj_OrderProd.weight = Prod.weight || 0;

				if(isNaN(obj_OrderProd.quantity)) continue;

				// 简单的更改库存
				let quantity = parseInt(obj_Order.type_Order) * obj_OrderProd.quantity;
				if(isNaN(quantity)) continue;

				await ProdDB.updateOne({"_id" : Prod._id},{$inc: {quantity}} );

				// 如果是采购 则为price_cost 否则为 price_regular. 最后我们可以根据这些信息比较销售 价格
				obj_OrderProd.price_regular = (type_Order === 1) ? Prod.price_cost : Prod.price_regular;
				obj_OrderProd.price_sale = (type_Order === 1) ? Prod.price_cost : Prod.price_sale;
				if(type_Order === 1) {
					if(isNaN(obj_OrderProd.price)) obj_OrderProd.price = Prod.price_cost;
				} else {
					if(ConfUser.role_Arrs.includes(payload.role)) {
						if(isNaN(obj_OrderProd.price)) obj_OrderProd.price = Prod.price_sale;
					} else {
						// 可以价cupon
						obj_OrderProd.price = Prod.price_sale;
					}
				}

				obj_OrderProd.prod_quantity = obj_OrderProd.quantity;
				obj_OrderProd.prod_weight = obj_OrderProd.quantity * obj_OrderProd.weight;
				obj_OrderProd.prod_regular = obj_OrderProd.quantity * obj_OrderProd.price_regular;
				obj_OrderProd.prod_sale = obj_OrderProd.quantity * obj_OrderProd.price_sale;
				obj_OrderProd.prod_price = obj_OrderProd.quantity * obj_OrderProd.price;
				// 生成 订单(OrderProd)数据库信息
				_OrderProd = new OrderProdDB(obj_OrderProd);
			} else {
				// 接受前台 OrderSkus的数据不能为空
				if(!(obj_OrderProd.OrderSkus instanceof Array)) continue;
				// 重命名 OrderSkus
				const oSkus = [...obj_OrderProd.OrderSkus];
				// 要存入数据库的 OrderSkus
				obj_OrderProd.OrderSkus = [];

				// 生成 (OrderProd)数据库信息
				_OrderProd = new OrderProdDB(obj_OrderProd);

				for(let j=0; j<oSkus.length; j++) {
					const obj_OrderSku = oSkus[j];
					if(!MdFilter.isObjectId(obj_OrderSku.Sku)) continue;
					const Sku = await SkuDB.findOne({_id: obj_OrderSku.Sku, Prod: Prod._id});
					// if(!Sku || Sku.is_usable === false || Sku.is_sell === false) continue;
					if(!Sku) continue;
					obj_OrderSku.Order = _OrderProd.Order;
					obj_OrderSku.OrderProd = _OrderProd._id;
					obj_OrderSku.type_Order = type_Order;

					obj_OrderSku.status = _OrderProd.status;
					obj_OrderSku.Client = _OrderProd.Client;
					obj_OrderSku.Supplier = _OrderProd.Supplier;
					obj_OrderSku.Shop = _OrderProd.Shop;
					obj_OrderSku.Firm = _OrderProd.Firm;
					obj_OrderSku.Pd = _OrderProd.Pd;
					obj_OrderSku.Prod = _OrderProd.Prod;

					obj_OrderSku.attrs = "";
					if(Sku.attrs) Sku.attrs.forEach(attr => obj_OrderSku.attrs += `${attr.nome}:${attr.option},`);

					obj_OrderSku.quantity = parseInt(obj_OrderSku.quantity);
					if(isNaN(obj_OrderSku.quantity)) continue;
					let quantity = parseInt(obj_Order.type_Order * obj_OrderSku.quantity);
					await SkuDB.updateOne({"_id" : Sku._id},{$inc: {quantity}} );
					obj_OrderSku.weight = Sku.weight || 0;
					// 如果是采购 则为price_cost 否则为 price_regular. 最后我们可以根据这些信息比较销售 价格
					obj_OrderSku.price_regular = (type_Order === 1) ? Sku.price_cost : Sku.price_regular;
					obj_OrderSku.price_sale = (type_Order === 1) ? Sku.price_cost : Sku.price_sale;
					if(type_Order === 1) {
						if(isNaN(obj_OrderSku.price)) obj_OrderSku.price = Sku.price_cost;
					} else {
						if(ConfUser.role_Arrs.includes(payload.role)) {
							if(isNaN(obj_OrderSku.price)) obj_OrderSku.price = Sku.price_sale;
						} else {
							obj_OrderSku.price = Sku.price_sale;
						}
					}

					const _OrderSku = new OrderSkuDB(obj_OrderSku);
					_OrderSku.at_crt = _OrderSku.at_upd = new Date();
					obj_OrderSkus.push(_OrderSku);

					_OrderProd.prod_quantity += _OrderSku.quantity;
					_OrderProd.prod_weight += _OrderSku.weight * _OrderSku.quantity;
					_OrderProd.prod_regular += _OrderSku.price_regular * _OrderSku.quantity;
					_OrderProd.prod_sale += _OrderSku.price_sale * _OrderSku.quantity;
					_OrderProd.prod_price += _OrderSku.price * _OrderSku.quantity;
					_OrderProd.OrderSkus.push(_OrderSku._id);
				}
			}

			if(isNaN(_OrderProd.prod_quantity)) return MdFilter.jsonFailed(res, {message: "订单 prod_quantity 错误"});
			if(isNaN(_OrderProd.prod_weight)) _OrderProd.prod_weight = 0;
			if(isNaN(_OrderProd.prod_regular)) return MdFilter.jsonFailed(res, {message: "订单 prod_regular 错误"});
			if(isNaN(_OrderProd.prod_sale)) return MdFilter.jsonFailed(res, {message: "订单 prod_sale 错误"});
			if(isNaN(_OrderProd.prod_price)) return MdFilter.jsonFailed(res, {message: "订单 prod_price 错误"});

			// 判断 如果订单 商品下没有 Sku 则说明没有买此商品 则跳过
			if(_OrderProd.prod_quantity < 1) continue;
			_OrderProd.at_crt = _OrderProd.at_upd = new Date();
			obj_OrderProds.push(_OrderProd);
			// const OProdSave = await _OrderProd.save();
			// if(!OProdSave) {
			// 	OrderSkuDB.deleteMany({OrderProd: _OrderProd._id});
			// 	continue;
			// }

			_Order.goods_weight += _OrderProd.prod_weight;
			_Order.goods_quantity += _OrderProd.prod_quantity;
			_Order.goods_regular += _OrderProd.prod_regular;
			_Order.goods_sale += _OrderProd.prod_sale;
			_Order.goods_price += _OrderProd.prod_price;
			_Order.OrderProds.push(_OrderProd._id);
		}
		// 判断 如果订单 下没有采购商品 则错误
		if(_Order.goods_quantity < 1) return MdFilter.jsonFailed(res, {message: "订单中没有产品"});

		let tax = _Order.is_tax ? 1.22 : 1;
		// 为 order_price 赋值
		_Order.order_regular = _Order.goods_regular*tax + (_Order.ship_regular || 0);
		_Order.order_sale = _Order.goods_sale*tax + (_Order.ship_sale || 0);
		// 判断是客户下单 或者员工没有给order_imp 则 order_imp= goods_price+ship_sale
		if(ConfUser.role_Arrs.includes(payload.role)) {
			_Order.order_imp = _Order.price_coin / _Order.rate;
		} else {
			_Order.order_imp = _Order.goods_price + ((_Order.ship_sale)?_Order.ship_sale:0);
		}

		// 计算其他币种的支付方式
		if(_Order.order_imp === _Order.order_sale) _Order.is_pass = true;

		if(MdFilter.isObjectId(org_OrderId)) {
			const res_del = await OrderDelete_Prom(payload, org_OrderId);
			if(res_del.status !== 200) return MdFilter.json500(res, {message: "OrderPost org_Order del"});
			await OrderSkuDB.deleteMany({Order: org_OrderId});
			await OrderProdDB.deleteMany({Order: org_OrderId});
		}

		const OrderSame = await OrderDB.findOne({code: _Order.code, Firm: _Order.Firm, _id: {"$ne": _Order._id}});
		if(OrderSame) return MdFilter.json500(res, {message: "下单错误 错误码 100101"});

		const OrderSave = await _Order.save();
		if(!OrderSave) return MdFilter.json500(res, {message: "下单错误 错误码 100102"});
		// 返回给前端，  如果不正确 可以尝试 放到 crt_OrderProds_Fucn 中。 如果正确 要删掉 res 参数
		const OPinsertMany = await OrderProdDB.insertMany(obj_OrderProds);
		const OSinsertMany = await OrderSkuDB.insertMany(obj_OrderSkus);

		if(req.query.populateObjs) {
			const GetDB_Filter = {
				id: OrderSave._id,
				payload,
				queryObj: req.query,
				objectDB: OrderDB,
				path_Callback: null,
				dbName: dbOrder,
			};
			const db_res = await GetDB.db(GetDB_Filter);
			console.log("post getDB");
			return MdFilter.jsonSuccess(res, db_res);
		} else {
			return MdFilter.jsonSuccess(res, {data: {object: OrderSave}});
		}

	} catch(error) {
		return MdFilter.json500(res, {message: "OrderPost", error});
	}
}

const generate_codeOrder_Prom = (Shop_id, Shop_code) => {
	return new Promise(async(resolve) => {
		try{
			const pre_Order = await OrderDB.findOne({Shop: Shop_id, code: {'$ne': null}})
				.sort({'at_crt': -1});

			const nowDate = new Date();
			const today = moment(nowDate).format("YYMMDD");

			let codeNum = 1;
			if(pre_Order) {
				const [data_Order, Num_Order] = pre_Order.code.split(Shop_code);
				if(today == data_Order) {
					codeNum = parseInt(Num_Order)+1;
				}
			}
			const codePre = `${today}${Shop_code}`;
			const code_res = await recu_codeOrderSame_Prom(codePre, codeNum);
			if(code_res.status === 400) return resolve({status: 400, message: code_res.message});
			return resolve({status: 200, data: {code: code_res.code}});

		} catch(error) {
			console.log("[resolve generate_codeOrder_Prom]", error);
			return resolve({status: 400, message: "[resolve generate_codeOrder_Prom]"});
		}
	})
}
const recu_codeOrderSame_Prom = (codePre, codeNum) => {
	return new Promise(async(resolve) => {
		try{
			codeNum = String(codeNum);
			for(let len = codeNum.length; len < 4; len = codeNum.length) { // 序列号补0
				codeNum = "0" + codeNum;
			}
			const objSame = await OrderDB.findOne({code: codePre+codeNum});
			if(objSame) {
				codeNum = parseInt(codeNum) + 1;
				const this_prom = await recu_codeOrderSame_Prom(codePre, codeNum);
				if(this_prom.status === 200) return resolve({status: 200, code: this_prom.code});
				return resolve({status: 400, code: this_prom.message});
			} else {
				return resolve({status: 200, code: codePre+codeNum});
			}
		} catch(error) {
			console.log("[resolve recu_codeOrderSame_Prom]", error);
			return resolve({status: 400, message: "[resolve recu_codeOrderSame_Prom]"});
		}
	})
}


















exports.OrderPutBack = async(req, res) => {
	console.log("/OrderPutBack");
	try{
		const payload = req.payload;
		const id = req.params.id;
		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		
		const Order = await OrderDB.findOne({_id: id, Firm: payload.Firm});
		if(!Order) return MdFilter.jsonFailed(res, {message: "没有找到此订单信息"});

		
		if(obj.isPaid == 1 || obj.isPaid == 'true') {
			Order.isPaid = true;
		} else if(obj.isPaid == 0 || obj.isPaid == 'false') {
			Order.isPaid = false;
		}

		if(obj.is_pass == 1 || obj.is_pass == 'true') {
			Order.is_pass = true;
		} else if(obj.is_pass == 0 || obj.is_pass == 'false') {
			Order.is_pass = false;
		}

		const objSave = await Order.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "订单修改存储错误"});

		if(req.query.populateObjs) {
			const GetDB_Filter = {
				id: objSave._id,
				payload,
				queryObj: req.query,
				objectDB: OrderDB,
				path_Callback: null,
				dbName: dbOrder,
			};
			const db_res = await GetDB.db(GetDB_Filter);

			return MdFilter.jsonSuccess(res, db_res);
		} else {
			return MdFilter.jsonSuccess(res, {message: "OrderPutBack", data: {object: objSave}});
		}
		
	} catch(error) {
		console.log("OrderPutBack Error: ", error);
		return MdFilter.json500(res, {message: "OrderPutBack", error});
	}
}







exports.OrderPut = async(req, res) => {
	console.log("/OrderPut_ship");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Order的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Order = await OrderDB.findOne({_id: id, Client: payload._id, status: ConfOrder.status_obj.placing.num})
			.populate({path: "Shop", select: "serve_Citas"});
		if(!Order) return MdFilter.jsonFailed(res, {message: "没有找到此订单信息"});

		const obj = req.body.general;
		if(obj) {
			if(ConfOrder.type_ship_Arrs.includes(obj.type_ship)) Order.type_ship = obj.type_ship;	
			if(MdFilter.isObjectId(obj.Paidtype)) Order.Paidtype = obj.Paidtype;
			if(obj.note_Client) Order.note_Client = obj.note_Client;	
		}

		let Paidtype = null;
		// 修改付款方式
		if(MdFilter.isObjectId(obj.Paidtype) && String(obj.Paidtype) != String(Order.Paidtype)) {
			Paidtype = await PaidtypeDB.findOne({_id: Order.Paidtype})
				.populate("Coin");
			if(!Paidtype) return MdFilter.jsonFailed(res, {message: "没有找到此付款方式"});
			if(!Paidtype.Coin) return MdFilter.jsonFailed(res, {message: "付款方式中的币种错误"});
			Order.Paidtype = Paidtype._id;
			Order.rate = Paidtype.Coin.rate;
			Order.symbol = Paidtype.Coin.symbol;
			Order.is_defCoin = Paidtype.Coin.is_defCoin;
			if(obj.price_coin) obj.price_coin = parseFloat(obj.price_coin);
			if(isNaN(obj.price_coin)) Order.price_coin = Order.order_imp * Order.rate;
		}

		// Client 的 银行付款信息
		const paid_info = req.body.paid_info;
		if(!Order.Paidtype) {
			Order.paid_info = null;
		} else if(paid_info) {
			if(!Paidtype) Paidtype = await PaidtypeDB.findOne({_id: Order.Paidtype});
			if(!Paidtype) return MdFilter.jsonFailed(res, {message: "没有找到此付款方式"});
			if(Paidtype.is_cash == true) {
				Order.paid_info = null;
			} else {
				Order.paid_info = paid_info;
			}
		}


		const objSave = await Order.save();
		return MdFilter.jsonSuccess(res, {message: "OrderPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "OrderPut", error});
	}
}

// 只有总部可以删除
exports.OrderDelete = async(req, res) => {
	console.log("/OrderDelete");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Order的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		// const force = req.query.force;
		// if(force !== payload.code) return MdFilter.jsonFailed(res, {message: "请传递force的值为本人code"});

		const res_del = await OrderDelete_Prom(payload, id);

		await OrderSkuDB.deleteMany({Order: id});
		await OrderProdDB.deleteMany({Order: id});

		return MdFilter.jsonRes(res, res_del);
	} catch(error) {
		return MdFilter.json500(res, {message: "OrderDelete", error});
	}
}


const OrderDelete_Prom = (payload, id) => {
	// console.log("/OrderDelete_Prom");
	return new Promise(async(resolve) => {
		try{
			const pathObj = {
				_id: id,
				Firm: payload.Firm,
				// is_hide_client: true,
			};
			if(payload.Shop) pathObj.Shop = payload.Shop._id;

			const Order = await OrderDB.findOne(pathObj, {OrderProds: 1, type_Order: 1})
				.populate({
					path: "OrderProds",
					select: "is_simple Prod quantity OrderSkus",
					populate: {path: "OrderSkus", select: "Sku quantity"}
				});
			if(!Order) return resolve({status: 400, message: "没有找到此订单信息"});
			// console.log(Order)
			let sign = -parseInt(Order.type_Order);
			for(let i=0; i<Order.OrderProds.length; i++) {
				const OrderProd = Order.OrderProds[i];
				// console.log(OrderProd)
				if(OrderProd.is_simple === true) {
					let quantity = parseInt(sign * OrderProd.quantity);
					if(isNaN(quantity)) return resolve({status: 500, message: "OrderDelete isNaN(quantity)"});
					await ProdDB.updateOne({"_id" : OrderProd.Prod},{$inc: {quantity}} );
				} else {
					for(let j=0; j<OrderProd.OrderSkus.length; j++) {
						const OrderSku = OrderProd.OrderSkus[j];
						let quantity = parseInt(sign* OrderSku.quantity);
						if(isNaN(quantity)) return resolve({status: 500, message: "OrderDelete isNaN(quantity)"});
						await SkuDB.updateOne({"_id": OrderSku.Sku}, {$inc: {quantity}});
					}
				}
			}
			OrderSkuDB.deleteMany({Order: id});
			OrderProdDB.deleteMany({Order: id});
			await OrderDB.deleteOne({_id: id});

			return resolve({status: 200, message: "OrderDelete"});
		} catch(error) {
			return resolve({status: 500, message: "OrderDelete", error});
		}
	})
}









const Order_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm;
		if(payload.role >= ConfUser.role_set.pter) {
			pathObj.Shop = payload.Shop._id;
		}
	} else {
		pathObj.is_hide_client = false;
		pathObj.Client = payload._id;
	}

	if(!queryObj) return;
	if(queryObj.status) {
		const arrs = MdFilter.stringToArray(queryObj.status);
		// if(arrs.length > 0) pathObj.status["$in"] = arrs;
		if(arrs.length > 0) pathObj.status = {"$in": arrs};
	}
	if(queryObj.Clients) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Clients);
		if(arrs.length > 0) pathObj.Client = {"$in": arrs};
		if(queryObj.Clients === 'null') pathObj.Client = {"$eq": null};
	}
	if(queryObj.Suppliers) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Suppliers);
		if(arrs.length > 0) pathObj.Supplier = {"$in": arrs};
		if(queryObj.Suppliers === 'null') pathObj.Supplier = {"$eq": null};
	}
	if(queryObj.Paidtypes) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Paidtypes);
		if(arrs.length > 0) pathObj.Paidtype = {"$in": arrs};
	}
	if(queryObj.Shops && payload.role < ConfUser.role_set.pter) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Shops);
		if(arrs.length > 0) pathObj.Shop = {"$in": arrs};
	}
	pathObj.type_Order = (queryObj.type_Order == 1) ? 1 : -1;
}
const dbOrder = 'Order';
exports.Orders = async(req, res) => {
	console.log("/Orders");
	// console.log(req.query)
	// const ods = await OrderDB.find({});
	// console.log(ods);
	try {
		const payload = req.payload
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: OrderDB,
			path_Callback: Order_path_Func,
			dbName: dbOrder,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Orders", error});
	}
}

exports.Order = async(req, res) => {
	console.log("/Order");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: OrderDB,
			path_Callback: Order_path_Func,
			dbName: dbOrder,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Orders", error});
	}
}
















const tickets = [];
indexOfArrayObject = (arrs, field, str) => {
	if(!(arrs instanceof Array)) return -2;
	let index=0;
	for(;index<arrs.length; index++) {
		if(String(arrs[index][field]) == String(str)) break;
	}
	if(index == arrs.length) return -1;
	return index;
}
exports.addTicket = async(req, res) => {
	console.log("/addTicket");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: OrderDB,
			path_Callback: Order_path_Func,
			dbName: dbOrder,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		if(db_res.status !== 200) return MdFilter.jsonSuccess(res, db_res);
		const object = db_res.data.object;
		const index = indexOfArrayObject(tickets, 'id', object._id);

		if(index < -1) return MdFilter.json500(res, {message: "addTicket tickets Error"});
		if(index > -1) tickets.splice(index, 1);
		tickets.push({typePrint: req.query.typePrint, id: object._id, object});
		
		db_res.message = "addTicket";
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "addTicket", error});
	}
}
exports.getTickets = (req, res) => {
	try {
		return MdFilter.jsonSuccess(res, {message: "getTickets", data: {objects: tickets}})
	} catch (error) {
		return MdFilter.json500(res, {message: "clearTicket", error});
	}
}
exports.clearTicket = (req, res) => {
	try {
		tickets.splice(0,tickets.length);
		return MdFilter.jsonSuccess(res, {message: "清除打印任务成功"})
	} catch (error) {
		return MdFilter.json500(res, {message: "clearTicket", error});
	}
}

exports.printTicket = (req, res) => {
	try {
		let status = 400;
		let message = "暂无数据";
		let object = null;
		const count = tickets.length;
		if((tickets instanceof Array) && tickets.length > 0) {
			object = tickets[0];
			tickets.splice(0, 1);
			status = 200;
			message = "打印成功";
		}
		return MdFilter.jsonRes(res, {status, message: "printTicket", data: {object, count}, })
	} catch (error) {
		return MdFilter.json500(res, {message: "printTicket", error});
	}
}







// const tickets = [];
// indexOfArrayObject = (arrs, field, str) => {
// 	if(!(arrs instanceof Array)) return -2;
// 	let index=0;
// 	for(;index<arrs.length; index++) {
// 		if(String(arrs[index][field]) == String(str)) break;
// 	}
// 	if(index == arrs.length) return -1;
// 	return index;
// }
// exports.addTicket = async(req, res) => {
// 	console.log("/addTicket");
// 	try {
// 		let payload = req.payload;
// 		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "需要店铺身份打印"});
// 		let typePrint = req.query.typePrint;	// 什么类型的打印

// 		let GetDB_Filter = {
// 			id: req.params.id,
// 			payload: payload,
// 			queryObj: req.query,
// 			objectDB: OrderDB,
// 			path_Callback: Order_path_Func,
// 			dbName: dbOrder,
// 		};
// 		let db_res = await GetDB.db(GetDB_Filter);
// 		if(db_res.status !== 200) return MdFilter.jsonSuccess(res, db_res);
// 		let object = db_res.data.object;		// 找到要打印的订单

// 		let index = indexOfArrayObject(tickets, 'id', object._id);
// 		if(index < -1) return MdFilter.json500(res, {message: "addTicket tickets Error"});
// 		if(index > -1) tickets.splice(index, 1);
// 		tickets.push({id: object._id, object, typePrint, Shop: payload.Shop});
		
// 		db_res.message = "addTicket";
// 		return MdFilter.jsonSuccess(res, db_res);
// 	} catch(error) {
// 		return MdFilter.json500(res, {message: "addTicket", error});
// 	}
// }
// exports.getTickets = (req, res) => {
// 	try {
// 		let payload = req.payload;
// 		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "需要店铺身份打印"});
// 		let objects = [];
// 		tickets.forEach(item => {
// 			if(item.Shop === payload.Shop) objects.push(item);
// 		})
// 		return MdFilter.jsonSuccess(res, {message: "getTickets", data: {objects}})
// 	} catch (error) {
// 		return MdFilter.json500(res, {message: "clearTicket", error});
// 	}
// }
// exports.clearTicket = (req, res) => {
// 	try {
// 		let payload = req.payload;
// 		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "需要店铺身份打印"});

// 		let objects = [];
// 		tickets.forEach(item => {
// 			if(item.Shop !== payload.Shop) objects.push(item);
// 		})
// 		tickets = objects;
// 		return MdFilter.jsonSuccess(res, {message: "清除打印任务成功"})
// 	} catch (error) {
// 		return MdFilter.json500(res, {message: "clearTicket", error});
// 	}
// }

// exports.printTicket = (req, res) => {
// 	try {
// 		let payload = req.payload;
// 		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "需要店铺身份打印"});

// 		let status = 400;
// 		let message = "暂无数据";
// 		let object = null;
// 		let count = 0;
		
// 		if((tickets instanceof Array) && tickets.length > 0) {

// 			let objects = [];
// 			tickets.forEach(item => {
// 				if(item.Shop === payload.Shop) objects.push(item);
// 			})
// 			count = objects.length;
// 			object = objects[0];

// 			let index = indexOfArrayObject(tickets, 'id', object._id);
// 			if(index < -1) return MdFilter.json500(res, {message: "printTicket Error"});
// 			if(index > -1) tickets.splice(index, 1);
// 			status = 200;
// 			message = "打印成功";
// 		}
// 		return MdFilter.jsonRes(res, {status, message: "printTicket", data: {object, count}, })
// 	} catch (error) {
// 		return MdFilter.json500(res, {message: "printTicket", error});
// 	}
// }