3.13	CartProd的一些小bug
3.12	Categ的一些小bug
3.11	清空购物车 deleteMany
3.10	增加了购物车
3.00	添加首页控制
2.95	Bug
2.94	invoice
2.93	Record
2.92	OrderDelete test
2.91	bug: payload.Shop._id || payload.Shop
2.9		bug: Order get
2.8		日志文件 Record OrderDel
2.61	Bug: OrderPost 找不到Shop
2.6		Shop 加入发票信息
2.5		Shop 属性 	去掉[able_MBsell able_PCsell]
					加入[allow_virtualOrder]
			allow_virtualOrder allow_Supplier 由ader管理
2.43	User 属性： 加入[able_MBsell able_PCsell]
			able_MBsell able_PCsell 由ader管理
2.42	登录 需要 is_usable = true
2.41	Prod 批量打折 优化 updataMany使用 pipeline
2.4		Prod 批量打折 / Prod 返回原价
2.31	CategPut But 和 rewriteMethd.js 优化
2.3		Categ 优化 ProdPut Categ query
2.2		Categ 优化 Prod能否添加
2.2		Categ 优化
2.1		OrderPost 分离 MfSave删除
2.01	OrderPost Supplier
2.0		Supplier
1.933	批量上传
1.932	Shop allow_Supplier
1.93	Prod code可重复
1.922	Prod is_quick 筛选
1.921	Prod is_quick ShopPut Firm
1.92	ProdPut iva
1.91	批量上传 Prod优化
1.9 	一些大的修改 Client有所属Shop 但是筛选的时候不动
1.7		修复bug
1.6		update
1.5		OrderProd at_crt 修复
1.3		Steps接口 + Steps修复
1.2		关联订单Step
1.1		创建了订单Step
1.0		店铺控制
0.95	订单要影响商品 at_upd
0.94	虚拟订单不参与分析和记录
0.94	bug role_set pter -> printer
0.93	虚拟订单
0.92	Shop Supplier Firm
0.91	payload Shop cassa_auth
0.90	Shop auth 前台能否看订单
0.89	只有老板能删除订单, Shop tel 字段
0.88	离线订单
0.87	Client可以没有编号 但如果有 则不可重复
0.86	删除Client
0.85	订单 后台可以没有产品
0.84	默认付款方式
0.83	分店打印
0.82	分店打印没有做好
0.81	Pnome Firm Firm._id问题
0.80	分店打印
0.79	Prod修改缓存
0.78	产品分类
0.77	订单post Prod.updateOne
0.76	sort和limit测试
0.75	库存bug 查找
0.72	ProdPut populate
0.71	OrderSku Client
0.70	Sku price_cost
0.69	object populate
0.68	订单数字错误 则不能添加
0.67	产品图片及压缩图
0.66	Pnomes
0.65	Prod 增加所属供应商 及 payload.typeShop
0.64	增加了 产品名称数据库 Pnome
0.63	放宽产品编号限制
0.62	商店类型
0.61	商品整箱数
0.60	智能打印
0.57	Order if(order_imp == order_sale) is_pass = true
0.57	Order is_pass
0.56	Order is_tax 修复
0.55	Order 修改
0.54	Orders Clients = null Supplier
0.53	OrderPost isPaid
0.52	供应商可以不加Cita
0.51	Order is_tax | analys img_urls projects
0.50	Order isPaid 增加一个简易版本
0.49	Paidtype nome
0.48	Shop phone 的问题
0.47	Prod code 限制 
0.46	Prod 总价格分析
0.45	小bug 如果重量不为数字 则不填
0.44	Ader 添加Shop 等
0.43	打印任务 和 打印角色
0.42	删除订单时 把OrderProd 和 OrderSku全部删掉
0.41	小bug
0.4		防止OrderPost重复, 
		OrderProdSku 批量插入 放在 Order save后面
0.3		order_imp =0 
0.2		Order update
0.1		analys
0.0		init