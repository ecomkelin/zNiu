module.exports = {
	role_Arrs: [1, 3, 5, 101, 105],
	// role_Arrs: [1, 3, 4, 10, 20, 30, 40, 50, 101, 105],
	role: {
		"1": 	{val: 'ower', en: 'owner', cn: "拥有者"},
		"3": 	{val: 'mger', en: 'manager', cn: "管理者"},
		"5": 	{val: 'sfer', en: 'staff', cn: "超级员工"},
		"100": 	{val: 'pter', en: 'printer', cn: "打印账号"},
		"101": 	{val: 'bser', en: 'boss', cn: "店铺老板"},
		"105": 	{val: 'wker', en: 'worker', cn: "店铺员工"},
	},
	role_set: {
		owner:		1,
		manager:	3,
		staff:		5,
		printer: 	100,
		boss:		101,
		worker:		105,
	},

	part_Arrs: ['ower', 'mger', 'sfer', 'bser', 'wker'],
	part: {
		"ower": 	{role: 1, 	en: 'owner', 	cn: "董事会"},
		"mger": 	{role: 3, 	en: 'manager', 	cn: "管理者"},
		"fner": 	{role: 5, 	en: 'financer',	cn: "财务部"},
		"lger": 	{role: 5, 	en: 'logistic',	cn: "物流部"},
		"pder": 	{role: 5, 	en: 'product',	cn: "产品部"},
		"pmer": 	{role: 5, 	en: 'promotion',cn: "推广部"},
		"oder": 	{role: 5, 	en: 'order',	cn: "订单部"},

		"bser": 	{role: 101,	en: 'boss', 	cn: "店铺老板"},
		"wker": 	{role: 105,	en: 'worker', 	cn: "服务员"},
		"wker": 	{role: 105,	en: 'worker', 	cn: "店铺员工"},
		"wker": 	{role: 105,	en: 'worker', 	cn: "店铺员工"},
	},
	part_set: {
		owner:		1,
		manager:	3,
		staff:		5,
		boss:		101,
		worker:		105,
	},


	Lang: {
		cn: {num: 1, val: '中文'},
		en: {num: 2, val: 'English'},
		it: {num: 3, val: 'Italiano'},
	},
}