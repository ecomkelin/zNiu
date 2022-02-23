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
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		// 判断 基本参数 是否正确
		const obj_Order = req.body.obj;
		if(!obj_Order) return MdFilter.jsonFailed(res, {message: "请传递正确的obj数据"});

		// 判断是否为 其他订单重新下单的
		const org_OrderId = req.body.Order ? req.body.Order : false;
		delete obj_Order._id;

		// 确认订单所属 (Shop)
		if(ConfUser.role_Arrs.includes(payload.role)) {
			if(payload.role < ConfUser.role_set.boss) return MdFilter.jsonFailed(res, {message: "您的身份不是店铺工作人员"});
			obj_Order.Shop = payload.Shop;
		} else {
			if(!MdFilter.isObjectId(obj_Order.Shop)) return MdFilter.jsonFailed(res, {message: "请传递正确的Shop_id信息"});
		}
		const Shop = await ShopDB.findOne({_id: obj_Order.Shop, is_usable: 1}, {code:1, serve_Citas: 1, Firm: 1})
			.populate({path: 'serve_Citas.Cita'});
		if(!Shop) return MdFilter.jsonFailed(res, {message: "没有找到此商店信息"});

		// 订单状态
		obj_Order.status = ConfOrder.status_obj.placing.num;

		// 支付方式及下单时汇率和币种
		if(MdFilter.isObjectId(obj_Order.Paidtype)) {
			const Paidtype = await PaidtypeDB.findOne({_id: obj_Order.Paidtype}).populate("Coin");
			if(!Paidtype) return MdFilter.jsonFailed(res, {message: "没有找到此付款方式"});
			if(!Paidtype.Coin) return MdFilter.jsonFailed(res, {message: "付款方式中的币种错误"});
			obj_Order.Paidtype = Paidtype._id;
			obj_Order.rate = Paidtype.Coin.rate;
			obj_Order.symbol = Paidtype.Coin.symbol;
			obj_Order.is_defCoin = Paidtype.Coin.is_defCoin;
			if(!isNaN(obj_Order.price_coin)) obj_Order.price_coin = parseFloat(obj_Order.price_coin);
		}

		// 订单的送货方式
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


		// 基本信息赋值
		const code_res = await generate_codeOrder_Prom(Shop._id, Shop.code);
		if(code_res.status !== 200) return MdFilter.jsonRes(res, {message: code_res.message});
		obj_Order.code = code_res.data.code;
		// obj_Order.shop 已赋值
		if(isNaN(obj_Order.price_paid)) obj_Order.price_paid = 0;
		obj_Order.price_paid = parseFloat(obj_Order.price_paid);
		if(obj_Order.order_imp) obj_Order.order_imp = parseFloat(obj_Order.order_imp);

		obj_Order.Firm = Shop.Firm;

		if(!(obj_Order.OrderProds instanceof Array)) return MdFilter.jsonFailed(res, {message: "购物车中的产品数据obj.OrderProds参数错误[应该是数组]"});
		const oProds = [...obj_Order.OrderProds];
		obj_Order.OrderProds = [];	// 数据格式化, 在循环中再添加 OrderProd 的 _id;

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
			obj_OrderProd.Pd = Prod.Pd;

			obj_OrderProd.nome = Prod.nome;
			obj_OrderProd.unit = Prod.unit;

			obj_OrderProd.prod_quantity = 0;
			obj_OrderProd.prod_regular = 0;
			obj_OrderProd.prod_sale = 0;
			obj_OrderProd.prod_price = 0;

			let _OrderProd
			if(Prod.is_simple === true) {
				if(isNaN(obj_OrderProd.quantity)) continue;
				obj_OrderProd.quantity = parseInt(obj_OrderProd.quantity);

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
				obj_OrderProd.prod_regular = obj_OrderProd.quantity * obj_OrderProd.price_regular;
				obj_OrderProd.prod_sale = obj_OrderProd.quantity * obj_OrderProd.price_sale;
				obj_OrderProd.prod_price = obj_OrderProd.quantity * obj_OrderProd.price;
				// 生成 订单(OrderProd)数据库信息
				_OrderProd = new OrderProdDB(obj_OrderProd);
			} else {
				if(!(obj_OrderProd.OrderSkus instanceof Array)) continue;
				const oSkus = [...obj_OrderProd.OrderSkus];
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

					obj_OrderSku.Client = _OrderProd.Client;
					obj_OrderSku.Supplier = _OrderProd.Supplier;
					obj_OrderSku.Shop = _OrderProd.Shop;
					obj_OrderSku.Firm = _OrderProd.Firm;
					obj_OrderSku.Pd = _OrderProd.Pd;
					obj_OrderSku.Prod = _OrderProd.Prod;

					obj_OrderSku.attrs = "";
					if(Sku.attrs) Sku.attrs.forEach(attr => obj_OrderSku.attrs += `${attr.nome}:${attr.option},`);

					obj_OrderSku.quantity = parseInt(obj_OrderSku.quantity);
					if(isNaN(obj_OrderSku.quantity) || obj_OrderSku.quantity < 1) continue;
					// 如果是采购 则为price_cost 否则为 price_regular. 最后我们可以根据这些信息比较销售 价格
					obj_OrderSku.price_regular = (type_Order === 1) ? Prod.price_cost : Prod.price_regular;
					obj_OrderSku.price_sale = (type_Order === 1) ? Prod.price_cost : Prod.price_sale;
					if(type_Order === 1) {
						if(isNaN(obj_OrderSku.price)) obj_OrderSku.price = Prod.price_cost;
					} else {
						if(ConfUser.role_Arrs.includes(payload.role)) {
							if(isNaN(obj_OrderSku.price)) obj_OrderSku.price = Prod.price_sale;
						} else {
							obj_OrderSku.price = Prod.price_sale;
						}
					}

					const _OrderSku = new OrderSkuDB(obj_OrderSku);
					const OSkuSave = await _OrderSku.save();
					if(!OSkuSave) continue;

					_OrderProd.prod_quantity += OSkuSave.quantity;
					_OrderProd.prod_regular += Sku.price_regular * OSkuSave.quantity;
					_OrderProd.prod_sale += OSkuSave.price_sale * OSkuSave.quantity;
					_OrderProd.prod_price += OSkuSave.price * OSkuSave.quantity;
					_OrderProd.OrderSkus.push(OSkuSave._id);
				}
			}

			// 判断 如果订单 商品下没有 Sku 则说明没有买此商品 则跳过
			if(_OrderProd.prod_quantity < 1) continue;
			const OProdSave = await _OrderProd.save();
			if(!OProdSave) {
				OrderSkuDB.deleteMany({OrderProd: _OrderProd._id});
				continue;
			}

			_Order.goods_quantity += OProdSave.prod_quantity;
			_Order.goods_regular += OProdSave.prod_regular;
			_Order.goods_sale += OProdSave.prod_sale;
			_Order.goods_price += OProdSave.prod_price;
			_Order.OrderProds.push(OProdSave._id);
		}

		// 判断 如果订单 下没有采购商品 则错误
		if(_Order.goods_quantity < 1) return MdFilter.jsonFailed(res, {message: "订单中没有产品"});

		// 为 order_price 赋值
		_Order.order_regular = _Order.goods_regular + ((_Order.ship_regular)?_Order.ship_regular:0);
		_Order.order_sale = _Order.goods_sale + ((_Order.ship_sale)?_Order.ship_sale:0);

		// 判断是客户下单 或者员工没有给order_imp 则 order_imp=order_sale
		if(!ConfUser.role_Arrs.includes(payload.role) || !_Order.order_imp) {
			_Order.order_imp = _Order.goods_price + ((_Order.ship_sale)?_Order.ship_sale:0);
		}

		// 计算其他币种的支付方式
		if(isNaN(_Order.price_coin) && _Order.rate) _Order.price_coin = _Order.order_imp * _Order.rate;

		const OrderSave = await _Order.save();
		if(!OrderSave) {
			 OrderSkuDB.deleteMany({Order: _Order._id});
			 OrderProdDB.deleteMany({Order: _Order._id});
		} else {
			// 删除重现下单的 订单
			if(MdFilter.isObjectId(org_OrderId)) {
				const org_Order = await OrderDB.findOne({_id: org_OrderId, status: {$in: ConfOrder.status_confirms}});
				if(org_Order && [10,70].includs.org_Order.status) {
					OrderSkuDB.deleteMany({Order: org_OrderId});
					OrderProdDB.deleteMany({Order: org_OrderId});
					OrderDB.deleteOne({_id: org_OrderId});
				}
			} 
		}
		// 返回给前端，  如果不正确 可以尝试 放到 crt_OrderProds_Fucn 中。 如果正确 要删掉 res 参数
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


























exports.OrderPut = async(req, res) => {
	console.log("/OrderPut_ship");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

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
		
		const force = req.query.force;
		if(force !== payload.code) return MdFilter.jsonFailed(res, {message: "请传递force的值为本人code"});

		const pathObj = {_id: id, is_hide_client: true, Firm: payload.Firm};
		if(payload.Shop) pathObj.Shop = payload.Shop;

		const Order = await OrderDB.findOne(pathObj);
		if(!Order) return MdFilter.jsonFailed(res, {message: "没有找到此订单信息"});

		OrderSkuDB.deleteMany({Order: id});
		OrderProdDB.deleteMany({Order: id});
		await OrderDB.deleteOne({_id: id});

		return MdFilter.jsonSuccess(res, {message: "OrderDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "OrderDelete", error});
	}
}










const Order_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm;
		if(payload.role >= ConfUser.role_set.boss) {
			pathObj.Shop = payload.Shop;
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
	}
	if(queryObj.Paidtypes) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Paidtypes);
		if(arrs.length > 0) pathObj.Paidtype = {"$in": arrs};
	}
	if(queryObj.Shops && payload.role < ConfUser.role_set.boss) {
		const arrs = MdFilter.stringToObjectIds(queryObj.Shops);
		if(arrs.length > 0) pathObj.Shop = {"$in": arrs};
	}
	pathObj.type_Order = (queryObj.type_Order == 1) ? 1 : -1;
}
const dbOrder = 'Order';
exports.Orders = async(req, res) => {
	console.log("/Orders");
	// console.log(req.query)
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