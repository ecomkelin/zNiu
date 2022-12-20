const moment = require('moment');

const path = require('path');
const ConfOrder = require(path.resolve(process.cwd(), 'app/config/conf/ConfOrder'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const StepDB = require(path.resolve(process.cwd(), 'app/models/order/Step'));
const CartProdDB = require(path.resolve(process.cwd(), 'app/models/order/CartProd'));
const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));
const OrderProdDB = require(path.resolve(process.cwd(), 'app/models/order/OrderProd'));
// const OrderSkuDB = require(path.resolve(process.cwd(), 'app/models/order/OrderSku'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
// const SkuDB = require(path.resolve(process.cwd(), 'app/models/product/Sku'));
const CitaDB = require(path.resolve(process.cwd(), 'app/models/address/Cita'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

const {OrderDelete_Prom} = require("./Order");



/**
 * 如果是修改 订单
 * body.Order = ObjectId
 * 
 * body.obj = {
 * 
 * 
 * }
 * 
 */
/** 小程序 Client */
exports.OrderPost_CartProd = async(req, res) => {
	console.log("/OrderPost_CartProd");
	try {
		const payload = req.payload;
		// 判断 基本参数 是否正确
		console.log("req.body:", req.body)
		const {CartProds} = req.body;
		if(!CartProds) return MdFilter.jsonFailed(res, {message: "请传递正确的 CartProds 数据"});
		const obj_Order = {};

		// 确认订单所属 (Shop)
        obj_Order.Client = payload._id;
        obj_Order.Shop = payload.Shop;
        obj_Order.type_Order = -1;

		const Shop = await ShopDB.findOne({_id: obj_Order.Shop, is_usable: true}, {code:1, serve_Citas: 1, Firm: 1})
			.populate({path: 'serve_Citas.Cita'});
		if(!Shop) return MdFilter.jsonFailed(res, {message: "没有找到此商店信息"});

		// 订单状态
		obj_Order.status = ConfOrder.status_obj.placing.num;

        // const paramStep = {};
        // paramStep.is_initClient = true;
		// paramStep.Firm = Shop.Firm;
		// let Step = await StepDB.findOne(paramStep);
		// obj_Order.Step = Step ? Step._id : null;

		// Client 订单的送货方式
        let ship_fee = 0;
		if(obj_Order.type_ship == ConfOrder.type_ship_obj.sClient.num) {
			obj_Order.ship_info = null;
		} else if(obj_Order.type_ship == ConfOrder.type_ship_obj.sShop.num) {
            ship_fee = 15;
			if(!obj_Order.ship_info) return MdFilter.jsonFailed(res, {message: "请传递ship_info"})

			if(!obj_Order.ship_info.Client_nome) return MdFilter.jsonFailed(res, {message: "请传递收件人名称"});
			if(!obj_Order.ship_info.phone) return MdFilter.jsonFailed(res, {message: "请传递收件人电话号码"});

			if(!obj_Order.ship_info.city) return MdFilter.jsonFailed(res, {message: "请传递收件人城市"});
            obj_Order.ship_info.city = obj_Order.ship_info.city.replace(/^\s*/g,"").toUpperCase();
            if(obj_Order.ship_info.city === "MI" || obj_Order.ship_info.city === "MILANO") ship_fee = 10;

			if(!obj_Order.ship_info.postcode) return MdFilter.jsonFailed(res, {message: "请传递收件人邮编"});
			if(!obj_Order.ship_info.address) return MdFilter.jsonFailed(res, {message: "请传递收件人地址"});
		}

        const code_res = await generate_codeOrder_Prom(Shop._id, Shop.code);
        if(code_res.status !== 200) return MdFilter.jsonRes(res, {message: code_res.message});
        obj_Order.code = code_res.data.code;
        obj_Order.at_crt = Date.now();

		obj_Order.OrderProds = [];	// 数据格式化, 在循环中再添加 OrderProd 的 _id;

		obj_Order.goods_weight = 0;
		obj_Order.goods_quantity = 0;
		obj_Order.goods_regular = 0;
		obj_Order.goods_sale = 0;
		obj_Order.at_confirm = Date.now();

		// 生成 订单(Order)数据库基本信息
		const _Order = new OrderDB(obj_Order);

		const obj_OrderProds = [];
		const obj_OrderSkus = [];
		for(let i = 0; i<CartProds.length; i++){
            const CartProd = await CartProdDB.findOne({_id: CartProds[i]});
            if(!CartProd) return MdFilter.jsonFailed(res, {message: `第${i}个 购物车商品不存在`});
            const Prod = await ProdDB.findOne({_id: CartProd.Prod, Shop: obj_Order.Shop});
            if(!Prod) return MdFilter.jsonFailed(res, {message: `第${i}个 购物车中的商品已经不存在`});

            const obj_OrderProd = {};
			obj_OrderProd.Order = _Order._id;
			obj_OrderProd.Client = _Order.Client;
			obj_OrderProd.type_Order = -1;
			obj_OrderProd.Shop = _Order.Shop;
			// obj_OrderProd.Firm = _Order.Firm;
			obj_OrderProd.status = _Order.status;
			obj_OrderProd.at_crt =  obj_OrderProd.at_upd = obj_Order.at_crt;

			
            if(isNaN(Prod.price_sale)) return MdFilter.jsonFailed(res, {message: `您的${Prod.code}产品 price_sale 信息错误, 请到后台检查修改`});
            if(isNaN(Prod.price_regular)) return MdFilter.jsonFailed(res, {message: `您的${Prod.code}产品 price_regular 信息错误, 请到后台检查修改`});

            obj_OrderProd.Pd = Prod.Pd;
            obj_OrderProd.code = Prod.code;
            obj_OrderProd.nome = Prod.nome;
            obj_OrderProd.unit = Prod.unit;

            /** 对Sku 的总结 */
			// obj_OrderProd.prod_quantity = 0;
			// obj_OrderProd.prod_weight = 0;
			// obj_OrderProd.prod_regular = 0;
			// obj_OrderProd.prod_sale = 0;
			// obj_OrderProd.prod_price = 0;

            obj_OrderProd.is_simple = true;
			let _OrderProd
			if(obj_OrderProd.is_simple === true) {
				if(isNaN(CartProd.quantity)) return MdFilter.jsonFailed(res, {message: `您第${i}个购物车产品数量 quantity 信息错误, 应该为数字`});
				obj_OrderProd.quantity = parseInt(CartProd.quantity);
				// 简单的更改库存
				let quantity = -1 * obj_OrderProd.quantity;

                obj_OrderProd.weight = Prod.weight || 0;

                // 如果是采购 则为price_cost 否则为 price_regular. 最后我们可以根据这些信息比较销售 价格
                obj_OrderProd.price_regular = Prod.price_regular;
                obj_OrderProd.price_sale = Prod.price_sale;
                // 可以加 cupon
                obj_OrderProd.price = Prod.price_sale;

				obj_OrderProd.prod_quantity = obj_OrderProd.quantity;
				obj_OrderProd.prod_weight = obj_OrderProd.quantity * obj_OrderProd.weight;
				obj_OrderProd.prod_regular = obj_OrderProd.quantity * obj_OrderProd.price_regular;
				obj_OrderProd.prod_sale = obj_OrderProd.quantity * obj_OrderProd.price_sale;
				obj_OrderProd.prod_price = obj_OrderProd.quantity * obj_OrderProd.price;
				// 生成 订单(OrderProd)数据库信息
				_OrderProd = new OrderProdDB(obj_OrderProd);
			}

			if(isNaN(_OrderProd.prod_quantity) || _OrderProd.prod_quantity < 1) return MdFilter.jsonFailed(res, {message: "订单 prod_quantity 错误"});
			if(isNaN(_OrderProd.prod_weight)) _OrderProd.prod_weight = 0;
			if(isNaN(_OrderProd.prod_regular)) return MdFilter.jsonFailed(res, {message: "订单 prod_regular 错误"});
			if(isNaN(_OrderProd.prod_sale)) return MdFilter.jsonFailed(res, {message: "订单 prod_sale 错误"});
			if(isNaN(_OrderProd.prod_price || _OrderProd.prod_price < 0)) return MdFilter.jsonFailed(res, {message: "订单 prod_price 错误"});

			_OrderProd.at_crt = _OrderProd.at_upd = obj_Order.at_crt;
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

			/** 删除 CartProd */



			
		}
		// 判断 如果订单 下没有采购商品 则错误
		// if(_Order.goods_quantity < 1) return MdFilter.jsonFailed(res, {message: "订单中没有产品"});

        if(_Order.goods_price >= 500) ship_fee = 0;
        _Order.order_imp = _Order.goods_price + ship_fee;

		const OrderSave = await _Order.save();
		if(!OrderSave) return MdFilter.json500(res, {message: "下单错误 错误码 100102"});
		// 返回给前端，  如果不正确 可以尝试 放到 crt_OrderProds_Fucn 中。 如果正确 要删掉 res 参数
		const OPinsertMany = await OrderProdDB.insertMany(obj_OrderProds);
		// const OSinsertMany = await OrderSkuDB.insertMany(obj_OrderSkus);

		if(req.query.populateObjs) {
			const GetDB_Filter = {
				id: OrderSave._id,
				payload,
				queryObj: req.query,
				objectDB: OrderDB,
				path_Callback: null,
				dbName: "Order",
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
			const pre_Order = await OrderDB.findOne({Shop: Shop_id, is_offline: {"$ne": true}, code: {'$ne': null}})
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
			console.log("[resolve generate_codeOrder_prom]", error);
			return resolve({status: 400, message: "[resolve generate_codeOrder_prom]"});
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
			console.log("[resolve recu_codeOrderSame_prom]", error);
			return resolve({status: 400, message: "[resolve recu_codeOrderSame_prom]"});
		}
	})
}






