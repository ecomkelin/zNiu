const paypal = require("@paypal/checkout-server-sdk");

const path = require('path');
const ConfOrder = require(path.resolve(process.cwd(), 'app/config/conf/ConfOrder'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));
const payPalClient = require(path.resolve(process.cwd(), 'app/controllers/p_payment/paypal/payPalClient'));

exports.paypalPayment =  async (req, res) => {
	console.log("/paypalPayment");
	try {
		const payload = req.payload;
		const OrderId = req.body.OrderId;
		const items_res = await getSkus_Prom(OrderId, payload);
		if(items_res.status !== 200) return MdFilter.jsonRes(items_res);
		const {order_items, Order} = items_res.data;

		const orderPayValue = order_items.reduce((sum, item) => {
			return sum + item.price_sale * item.quantity
		}, 0);
		const items = order_items.map(item => {
			return {
				name: item.desp,
				unit_amount: {
					currency_code: process.env.CURRENCY,
					value: item.price_sale,
				},
				quantity: item.quantity,
			}
		});
		const purchase_units = [{
			amount: {
				currency_code: process.env.CURRENCY,
				value: orderPayValue,
				breakdown: {
					item_total: {
						currency_code: process.env.CURRENCY,
						value: orderPayValue,
					},
				},
			},
			items,
		}];

		const request = new paypal.orders.OrdersCreateRequest();
		request.prefer("return=representation")
		request.requestBody({
			intent: "CAPTURE",
			purchase_units,
		});
		const order = await payPalClient.client().execute(request);
		if(!order) return resolve({status: 400, message: "paypalClient.execute Error"});

		Order.paypal_orderId = order.result.id;
		const OrderSave = await Order.save();
		if(!OrderSave) return resolve({status: 400, message: "paypalClient OrderSave Error"});

		return MdFilter.jsonSuccess(res, {data: {id: order.result.id}});
	} catch (e) {
		return MdFilter.json500(res, { message: "paypalPayment", error: e.message })
	}
}

exports.paypalCheckout = async(req, res) => {
	console.log("/paypalCheckout");
	try {
		const paypal_orderId = req.body.paypal_orderId;
		const OrderId = req.body.OrderId;

		const Order = await OrderDB.findOne({_id: OrderId});
		if(!Order) return MdFilter.jsonFailed(res, {message: "没有找到此Order信息"});
		if(Order.paypal_orderId !== paypal_orderId) return MdFilter.jsonFailed(res, {message: "付款信息不是此订单的"});

		const checkRequest = new paypal.orders.OrdersCaptureRequest(paypal_orderId);
		checkRequest.requestBody({});
		
		const checkOrder = await payPalClient.client().execute(checkRequest);
		Order.status = ConfOrder.status_obj.responding.num;
		const OrderSave = await Order.save();
		if(!OrderSave) return MdFilter.jsonFailed(res, {message: "paypalCheckout OrderSave Error"});
		return MdFilter.jsonSuccess(res, {status: 200});
	} catch (error) {
		return MdFilter.json500(res, {message: "付款失败", error});
	}
}
























exports.webhook = async(req, res) => {
	console.log("/webhook");
	try {
		const payload = req.body;

		/* ===================== stripe 检验环节 kelin ===================== */
		// const Stripe = require('stripe')(process.env.STRIPE_PRIVATE);
		// const sig = req.headers['stripe-signature'];
		// const endpointSecret = process.env.STRIPE_WEBHOOK;
		// let event = Stripe.webhooks.constructEvent(payload, sig, endpointSecret);
		// console.log('event type', event.type)
		/* ===================== stripe 检验环节 kelin ===================== */

		if (payload.type === 'checkout.session.completed') {
			const session = payload.data.object;
			// console.log("session", session)
			// amount_subtotal: 500,
			// amount_total: 700,
			// total_details: { amount_discount: 0, amount_shipping: 200, amount_tax: 0 },

			const OrderId = session.metadata.OrderId;
			const Order = await OrderDB.findOne({_id: OrderId});
			Order.status = ConfOrder.status_obj.responding.num;
			Order.is_paid = true;
			const OrderSave = await Order.save();
		}
		return MdFilter.jsonSuccess(res, {status: 200});
	} catch(error) {
		return MdFilter.json500(res, {message: "webhook Error"});
	}
}

// create-checkout-session
exports.stripePayment = async(req, res) => {
	console.log("/stripePayment")
	try{
		const payload = req.payload;
		const OrderId = req.body.OrderId;
		const success_url = req.body.success_url;
		const cancel_url = req.body.cancel_url;
		if(!success_url || !cancel_url) return MdFilter.jsonFailed(res, {message: "请传递付款成功和失败的跳转url"});
		const preStr = "https://"
		for(let i=0; i<preStr.length; i++) {
			if(success_url[i] !== preStr[i] || cancel_url[i] !== preStr[i]) return MdFilter.jsonFailed(res, {message: "跳转url必须以 https:// 开头"});
		}

		const items_res = await getSkus_Prom(OrderId, payload);
		if(items_res.status !== 200) return MdFilter.jsonRes(items_res);
		const {Shop, order_items} = items_res.data;
		const line_items = order_items.map( item => {
			const unit_amount = parseInt(item.price_sale * 100);
			return {
				price_data: {
					currency: process.env.CURRENCY,
					product_data: {
						name: item.desp,
					},
					unit_amount,
				},
				quantity: item.quantity,
			}
		})
		// if(!Shop.stripe_key_private) return MdFilter.jsonFailed(res, {message: "本商店没有写入 strip 的 key Private"});
		// const stripe = require('stripe')(Shop.stripe_key_private);
		const Stripe = require('stripe')(process.env.STRIPE_PRIVATE);

		const email = payload.email;
		const customer = await Stripe.customers.create({
			email,
		});

		const stripeSession = await Stripe.checkout.sessions.create({
			line_items,
			shipping_rates: ["shr_1JpCbzJIPg2MUXJXFTAgCaFt"],
			// shipping_address_collection: {
			// 	allowed_countries: ["IT"]
			// },
			payment_method_types: ['card', 'sofort'],
			mode: 'payment',
			success_url,
			cancel_url,
			// success_url: `${process.env.YOUR_DOMAIN}/order/${OrderId}`,
			// cancel_url: `${process.env.YOUR_DOMAIN}/order/${OrderId}?error=1`,
			metadata: {
				OrderId,
				stripe_key_private: '',
				endpointSecret: '',
			},
			customer: customer.id,
		});
		return MdFilter.jsonSuccess(res, {data: {url: stripeSession.url}});
	} catch(error) {
		return MdFilter.json500(res, {message: "stripePayment", error});
	}
}
















const getSkus_Prom = (OrderId, payload) => {
	return new Promise(async(resolve) => {
		try{
			const data = {Shop: null, Order: null, order_items: []};

			if(!MdFilter.isObjectId(OrderId)) return resolve({status: 400, message: "请传递正确的 Order _id 信息"});
			const Order = await OrderDB.findOne({_id: OrderId, Client: payload._id})
				.populate({path: "Shop"})
				.populate({path: "OrderProds", select: "OrderSkus nome", populate: {
					path: "OrderSkus", select: "price_sale quantity attrs"
				}})
			if(!Order) return resolve({status: 400, message: "没有找到 Order"});

			const timeSpan = Date.now() - Order.at_confirm;
			if(timeSpan > 2*60*60*1000) {
				// Order.status = ConfOrder.status_obj.cancel.num;
				// const OrderSave = await Order.save();
				return resolve({status: 400, message: "付款超时 请重新下单"});
			}

			data.Order = Order;
			if(!Order.Shop) return resolve({status: 400, message: "没有找到 Order中的Shop"});
			data.Shop = Order.Shop;
			if(!Order.OrderProds) return resolve({status: 400, message: "没有找到 Order中的 OrderProds"});

			for(let i=0; i<Order.OrderProds.length; i++) {
				const OrderProd = Order.OrderProds[i];
				if(!OrderProd.OrderSkus) return resolve({status: 400, message: "没有找到 Order中的 OrderProds"});
				for(let j=0; j<OrderProd.OrderSkus.length; j++) {
					const OrderSku = OrderProd.OrderSkus[j];
					const price_sale = parseFloat(OrderSku.price_sale);
					if(isNaN(price_sale) || price_sale <= 0) return resolve({status: 400, message: "订单中的某个产品价格错误"});
					const quantity = OrderSku.quantity
					if(isNaN(quantity) || quantity <= 0) return resolve({status: 400, message: "订单中的某个产品数量错误"});
					data.order_items.push({
						desp: `${OrderProd.nome} ${OrderSku.attrs}`,
						price_sale,
						quantity,
					})
				}
			}
			return resolve({status: 200, data});
		} catch(error) {
			console.log("[resolve getSkus_Prom]", error);
			return resolve({status: 400, message: "[resolve getSkus_Prom]"});
		}
	})
}