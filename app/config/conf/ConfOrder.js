module.exports = {
	status_Arrs: [10, 100, 200, 400, 700, 800],
	status: {
		// 0: 		'购物车',
		10: 	'已取消',
		// 70: 	'付款失败',
		100: 	'客户正在下单',
		200: 	'等待商家接单',
		400: 	'正在配货',
		700: 	'正在发货',
		800: 	'已完成',
	},
	status_obj: {
		// cart:	{num: 0, 	val: '购物车' 		},
		cancel:		{num: 10, 	val: '已取消' 		},
		// failPay:	{num: 70, 	val: '付款失败' 		},
		placing:	{num: 100, 	val: '客户正在下单'	},
		responding:	{num: 200, 	val: '等待商家接单' 	},
		preparing:	{num: 400, 	val: '正在配货' 		},
		shipping:	{num: 700, 	val: '正在发货' 		},
		completed:	{num: 800, 	val: '已完成' 		},
	},
	status_confirms: [10, 70],	// 从 购物车 取消订单 超时订单 失败订单 确认生成订单

	// 状态更改的 action
	action: {
		front: {
			place: 		'PLACE',
			cancel: 	'CANCEL',
			trash: 		'TRASH',
		},
		back: {
			confirm: 	'CONFIRM',
			done: 		'DONE',
			complete: 	'COMPLETE',
		}
	},

	// 订单的种类 是销售 还是采购
	type_Order_Arrs: [-1, 1],
	type_Order_obj: {
		sale: 		{num: -1, 	val: '销售订单'	},
		purchase: 	{num: 1, 	val: '采购订单'	},
	},

	// 配送方式
	type_ship_Arrs: [0, 1],
	// type_ship_Arrs: [0, 1, 2, 3],
	type_ship: {
		0: '自取',
		1: '店铺配送',
		// 2: '公司配送',
		// 3: '第三方'
	},
	type_ship_obj: {
		sClient:	{num: 0, 	val: '自取' 		},
		sShop:		{num: 1, 	val: '店铺配送' 	},
		// sThird:		{num: 3, 	val: '第三方' 	}
	},
}