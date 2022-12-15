const _ = require('underscore');
const path = require('path');

const RecordCT = require(path.resolve(process.cwd(), 'app/controllers/g_complement/Record'));

const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const StintPd = require(path.resolve(process.cwd(), 'app/config/stint/StintPd'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const CategDB = require(path.resolve(process.cwd(), 'app/models/complement/Categ'));
const PdDB = require(path.resolve(process.cwd(), 'app/models/product/Pd'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const SkuDB = require(path.resolve(process.cwd(), 'app/models/product/Sku'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));

const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

const PdnomeCT = require("../g_complement/Pnome");

const modify_Prods = [];
// 查看缓存变化
const setModify_Prods = (Prod, isDel) => {
	const modify_Prod = {
		at_upd: Date.now(),
		Prod
	}
	if(isDel) modify_Prod.isDel = isDel;

	const index = MdFilter.indexOfArrayObject(modify_Prods, "Prod", Prod);
	if(index < -1) {
		return MdFilter.jsonFailed(res, {message: "modify_Prods 数据错误 请联系管理员"});
	} else if(index > -1) {
		modify_Prods.splice(index, 1);	// 删除
	}
	modify_Prods.push(modify_Prod);

	// 如果是大于3天的缓存 自动删除
	let i=0;
	for(; i<modify_Prods.length; i++) {
		if(Date.now() - modify_Prods[i].at_upd < 3*24*60*60*1000) break;
	}
	modify_Prods.splice(0, i);
}
// 改变Sku的时候 保存Prod用的
exports.ProdUpd_fromSku_Prom = (id) => {
	// price_unit: Float,								// 只读 [由 Skus 决定] 产品价格
	// price_min: Float,								// 只读 [由 Skus 决定]
	// price_max: Float,								// 只读 [由 Skus 决定]
	// is_discount: Boolean, 							// 只读 [由 Skus 决定] 根据 product 中的 is_discount
	// is_sell: Boolean,								// 只读 [由 Skus 决定] 根据 Skus 决定
	return new Promise(async(resolve) => {
		try {
			const Prod = await ProdDB.findOne({_id: id})
				.populate("Skus");
			if(!Prod) return resolve({status: 400, message: "没有找到此商品信息"});

			const Skus = Prod.Skus;
			if(!Skus || Skus.length === 0) return resolve({status: 400, message: "商品Sku错误"});
			let price_min,price_max,is_discount, is_sell, is_usable, is_alert;
			for(let i=0; i<Skus.length; i++) {
				const sku = Skus[i];
				if(i==0) {
					price_min = sku.price_sale;
					price_max = sku.price_sale;
					is_discount = sku.is_discount;
					is_sell = sku.is_sell;
					is_usable = sku.is_usable;
					is_alert = sku.is_alert;
				} else {
					if(price_min>sku.price_sale) price_min = sku.price_sale;
					if(price_max<sku.price_sale) price_max = sku.price_sale;
					is_discount += sku.is_discount;
					is_sell += sku.is_sell;
					is_usable += sku.is_usable;
					is_alert += sku.is_alert;
				}
			}

			Prod.price_min = price_min;
			Prod.price_max = price_max;
			Prod.is_discount = is_discount ? true: false;
			Prod.is_sell = is_sell ? true: false;
			Prod.is_usable = is_usable ? true: false;
			Prod.is_alert = is_alert ? true: false;

			const ProdSave = await Prod.save();
			setModify_Prods(ProdSave._id);	// 缓存变化
			resolve({status: 200, data: {object: ProdSave}});

		} catch(error) {
			console.log(".ProdUpd-fromSku-Prom", error);
			resolve({status: 400, message: "ProdUpd-fromSku-Prom error"});
		}
	})
}

// 查看后台数据是否变化的 接口
exports.modifyProds = (req, res) => {
	let timestamp = parseInt(req.query.timestamp);
	if(isNaN(timestamp)) return MdFilter.jsonFailed(res, {message: "请传递正确的时间戳 query.timestamp"});
	const mProds = [];
	const dProds = [];
	let is_modify = false;

	for(let i=modify_Prods.length-1; i>=0; i--) {
		let mdProd = modify_Prods[i];
		// 获取前台未更新的变更数据
		if(timestamp - mdProd.at_upd < 0) {
			is_modify = true;
			if(mdProd.isDel) {
				dProds.push(mdProd.Prod);
			} else {
				mProds.push(mdProd.Prod);
			}
		} else {
			break;
		}
	}
	return MdFilter.jsonSuccess(res, {data: {is_modify, mProds, dProds}});
}









exports.ProdPost = async(req, res) => {
	console.log("/ProdPost");
	try{
		const payload = req.payload;
		if(payload.role < ConfUser.role_set.boss || !payload.Shop) return MdFilter.jsonFailed(res, {message: "您没有所属商店"});

		let obj = req.body.obj;
		if(!obj) {
			res_PdImg = await MdFiles.PdImg_sm(req, "/Prod");
			if(res_PdImg.status !== 200) return MdFilter.jsonFailed(res, res_PdImg);
			obj = res_PdImg.data.obj;
		}
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		Prod_PdNull(res, req.query, obj, payload);

		} catch(error) {
		return MdFilter.json500(res, {message: "ProdPost", error});
	}
}

const change_codeMatchs_Prod = (code, Shop_id) => new Promise(async(resolve, reject) => {
	try {
		const param = {code, Shop: Shop_id};
		const Prods = await ProdDB.find(param);
		if(Prods.length > 0) {
			const codeMatchs = [];
			Prods.forEach(item => codeMatchs.push(item._id));
			await ProdDB.updateMany(param, {codeMatchs});
		}
		return resolve('success');
	} catch(e) {
		return reject(e);
	}
})
// 自己添加
const Prod_PdNull = async(res, queryObj, obj, payload) => {
	console.log("/Prod_PdNull")
	try {
		obj.Pd = null;
		
		let Shop_id = payload.Shop._id || payload.Shop;
		let Shop = await ShopDB.findOne({_id: Shop_id}, {allow_codeDuplicate: 1, is_Pnome: 1});
		if(!Shop) return MdFilter.jsonFailed(res, {message: "店铺信息错误 请联系管理员"});

		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
		const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.codeLen = obj.code.length

		obj.is_quick = (obj.is_quick == 1 || obj.is_quick === 'true') ? true: false;

		// code是否可重复
		if(Shop.allow_codeDuplicate !== true) {
			const objSame = await ProdDB.findOne({'code': obj.code, Shop: Shop_id});
			if(objSame) return MdFilter.jsonFailed(res, {message: "已经有此产品编号相同"});
		}

		if(Shop.is_Pnome) PdnomeCT.PnomePlus_prom(payload, obj.nome);

		if(!isNaN(obj.weight)) obj.weight = parseFloat(obj.weight);

		if(isNaN(obj.price_cost)) obj.price_cost = 0;
		obj.price_cost = parseFloat(obj.price_cost);

		if(isNaN(obj.price_regular)) return MdFilter.jsonFailed(res, {message: "price_regular 要为数字"});
		obj.price_regular = parseFloat(obj.price_regular);
		obj.price_sale = isNaN(obj.price_sale) ? obj.price_regular : parseFloat(obj.price_sale);


		if(!MdFilter.isObjectId(obj.Supplier)) obj.Supplier = null;
		if(!MdFilter.isObjectId(obj.Brand)) obj.Brand = null;
		if(!MdFilter.isObjectId(obj.Nation)) obj.Nation = null;
		if(!MdFilter.ArrIsObjectId(obj.Categs)) obj.Categs = [];
		for(i in obj.Categs) {
			let Categ_id = obj.Categs[i];
			let Categ = await CategDB.findOne({_id: Categ_id, Shop: Shop_id});
			if(!Categ) return MdFilter.jsonFailed(res, {message: "没有找到此 Categ"});
			if(Categ.num_sons) return MdFilter.jsonFailed(res, {message: "此 Categ 有子分类 不能被添加产品"});
		}
 
		if(!isNaN(obj.quantity)) obj.quantity = parseInt(obj.quantity);
		if(!isNaN(obj.quantity_alert)) obj.quantity_alert = parseInt(obj.quantity_alert);
		if(!isNaN(obj.num_batch)) obj.num_batch = parseInt(obj.num_batch);

		obj.allow_backorder = (obj.allow_backorder == 1 || obj.allow_backorder === 'true') ? true : false; 

		obj.Skus = [];
		obj.is_usable = (obj.is_usable == 1 || obj.is_usable === true || obj.is_usable === 'true') ? true: false;
		obj.Firm = payload.Firm;
		obj.Shop = Shop_id;
		obj.User_crt = obj.User_upd = payload._id;
		const _object = new ProdDB(obj);
		const objSave = await _object.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "商品保存失败"});
		setModify_Prods(objSave._id);	// 缓存变化

		// 如果允许重复code 则需要给这些重复code的产品 匹配到一起
		if(Shop.allow_codeDuplicate) {
			await change_codeMatchs_Prod(obj.code, Shop_id);
		}

		if(queryObj.populateObjs) {	// 如果传入populate 则重新查找
			const GetDB_Filter = {
				id: objSave._id,
				payload,
				queryObj,
				objectDB: ProdDB,
				path_Callback: Prod_path_Func,
				dbName: dbProd,
			};
			const db_res = await GetDB.db(GetDB_Filter);
			db_res.message = "Prod 添加成功"
			return MdFilter.jsonSuccess(res, db_res);
		} else {
			return MdFilter.jsonSuccess(res, {message: "ProdPost", data: {object: objSave}});
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "Prod_PdNull", error});
	}
}










exports.ProdDelete = async(req, res) => {
	console.log("/ProdDelete")
	try{
		const payload = req.payload;

		const id = req.params.id;
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		
		let Shop_id = payload.Shop._id || payload.Shop;
		let Shop = await ShopDB.findOne({_id: Shop_id}, {allow_codeDuplicate: 1, is_Pnome: 1});
		if(!Shop) return MdFilter.jsonFailed(res, {message: "店铺信息错误 请联系管理员"});

		const pathObj = {_id: id};
		Prod_path_Func(pathObj, payload);
		const Prod = await ProdDB.findOne(pathObj);
		if(!Prod) return MdFilter.jsonFailed(res, {message: "没有找到此商品信息,请刷新重试"});
		
		if(Shop.is_Pnome) PdnomeCT.PnomeMenus_prom(payload, Prod.nome);

		const code = Prod.code;

		const Skus = await SkuDB.find({Prod: Prod._id});
		if(Skus && Skus.length > 0) return MdFilter.jsonFailed(res, {message: "请先删除商品中的,非默认Sku"});

		if(Prod.Pd) {
			const Pd = await PdDB.findOne({_id: Prod.Pd});
			const index = MdFilter.indexOfArray(Pd.Prods, Prod._id);
			Pd.Prods.splice(index, 1);
		}

		const objDel = await ProdDB.deleteOne({_id: Prod._id});

		setModify_Prods(Prod._id, true);	// 缓存变化

		if(Shop.allow_codeDuplicate) {
			await change_codeMatchs_Prod(code, Shop_id);
		}

		if(Prod.img_url && Prod.img_url.split("Prod").length > 1) await MdFiles.rmPicture(Prod.img_url);
		if(Prod.img_xs && Prod.img_xs.split("Prod").length > 1) await MdFiles.rmPicture(Prod.img_xs);

		RecordCT.RecordPost_func(payload, {dbName: dbProd, is_Delete: true}, Prod);

		return MdFilter.jsonSuccess(res, {message: "ProdDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "ProdDelete", error});
	}
}


exports.ProdPut = async(req, res) => {
	console.log("/ProdPut");
	try{
		const payload = req.payload;
		const id = req.params.id;
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		let Shop_id = payload.Shop._id || payload.Shop;
		let Shop = await ShopDB.findOne({_id: Shop_id}, {allow_codeDuplicate: 1, is_Pnome: 1});
		if(!Shop) return MdFilter.jsonFailed(res, {message: "店铺信息错误 请联系管理员"});

		const pathObj = {_id: id};
		Prod_path_Func(pathObj, payload);
		const Prod = await ProdDB.findOne(pathObj);
		if(!Prod) return MdFilter.jsonFailed(res, {message: "没有找到此商品信息"});

		let ProdObj = {...Prod._doc};

		let obj = null;
		if(req.body.general) {
			obj = req.body.general;
		} else {
			res_PdImg = await MdFiles.PdImg_sm(req, "/Prod");
			if(res_PdImg.status !== 200) return MdFilter.jsonFailed(res, res_PdImg);
			obj = res_PdImg.data.obj;

			if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

			if(obj.img_url) {
				if(Prod.img_url && Prod.img_url.split("Prod").length > 1) await MdFiles.rmPicture(Prod.img_url);
				Prod.img_url = obj.img_url;
			}
			if(obj.img_xs) {
				if(Prod.img_xs && Prod.img_xs.split("Prod").length > 1) await MdFiles.rmPicture(Prod.img_xs);
				Prod.img_xs = obj.img_xs;
			}
			// if(obj.img_urls && obj.img_urls.length > 0) {
			// 	if(Prod.img_urls && Prod.img_urls.length > 0) {
			// 		for(let i=0; i<Prod.img_urls.length; i++) {
			// 			await MdFiles.rmPicture(Prod.img_urls[i]);
			// 		};
			// 	} 
			// 	Prod.img_urls = obj.img_urls;
			// }
		}
		if(obj.desp) Prod.desp = obj.desp.replace(/^\s*/g,"");
		if(obj.unit) Prod.unit = obj.unit.replace(/^\s*/g,"");

		if(!isNaN(obj.sort)) Prod.sort = parseInt(obj.sort);
		if(!isNaN(obj.quantity)) {
			obj.quantity = parseInt(obj.quantity);
			if(Prod.quantity !== obj.quantity) {
				if(!Prod.qtLogs) Prod.qtLogs = [];
				if(Prod.qtLogs.length > 50) Prod.qtLogs.pop();
				let pre = Prod.quantity;
				let after = obj.quantity;
				let log = after - pre;
				Prod.qtLogs.unshift({
					at_crt: Date.now(),
					desp: "手动更新", // -销售/+采购/+删除销售/-删除采购/ 手动变更
					pre,
					log,
					after,
				});
				Prod.quantity = obj.quantity;
			}
		} 
		if(!isNaN(obj.quantity_alert)) Prod.quantity_alert = parseInt(obj.quantity_alert);

		if(obj.is_usable) Prod.is_usable = (obj.is_usable == 1 || obj.is_usable === 'true') ? true: false;
		if(obj.is_quick) Prod.is_quick = (obj.is_quick == 1 || obj.is_quick === 'true') ? true: false;

		let need_matchs = false;
		let orgCode = Prod.code;
		let newCode;

		if(!Prod.Pd) {	// 如果是单店 可以修改名称等 暂时没有做
			if(obj.code) obj.code.replace(/^\s*/g,"").toUpperCase();
			newCode = obj.code;

			// code是否可重复
			if(obj.code && obj.code !== Prod.code) {
				if(Shop.allow_codeDuplicate){
					need_matchs = true;
				} else {
					// 如果输入了 编号 则编号必须是唯一;  注意 Prod code 没有转大写
					const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['code']);
					if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
					const objSame = await ProdDB.findOne({
						'code': obj.code,
						Shop: Shop_id,
						_id: {'$ne': Prod._id}
					});
					if(objSame) return MdFilter.jsonFailed(res, {message: "产品编号相同"});
					Prod.code = obj.code;
					Prod.codeLen = Prod.code.length;
				}
			}

			if(obj.nome) obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();	// 注意 Pd nome 没有转大写
			if(obj.nome && obj.nome !== Prod.nome) {
				if(Shop.is_Pnome) {
					PdnomeCT.PnomePlus_prom(payload, obj.nome);
					PdnomeCT.PnomeMenus_prom(payload, Prod.nome);
				}
				// 如果输入了 编号 则编号必须是唯一;  注意 Prod nome 没有转大写
				const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['nome']);
				if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
				Prod.nome = obj.nome;
			}

			Prod.nomeTR = obj.nomeTR;
			if(Prod.nomeTR) Prod.nomeTR = Prod.nomeTR.replace(/^\s*/g,"");	// 注意 Pd nomeTR 没有转大写
			if(!isNaN(parseFloat(obj.weight))) Prod.weight = parseFloat(obj.weight);

			if(MdFilter.isObjectId(obj.Supplier)) Prod.Supplier = obj.Supplier;
			if(MdFilter.isObjectId(obj.Nation)) Prod.Nation = obj.Nation;
			if(MdFilter.isObjectId(obj.Brand)) Prod.Brand = obj.Brand;
			if(MdFilter.ArrIsObjectId(obj.Categs)) {
				let isSameCategs = true;
				if(!Prod.Categs) {
					Prod.Categs = obj.Categs;
					isSameCategs = false;
				} else {
					isSameCategs = isArraySame(obj.Categs, Prod.Categs); // 如果完全相同则为真 否则为假的
				}
				if(!isSameCategs) {
					Prod.Categs = [];
					for(i in obj.Categs) {
						let Categ_id = obj.Categs[i];
						let Categ = await CategDB.findOne({_id: Categ_id, Shop: Shop_id});
						if(!Categ) return MdFilter.jsonFailed(res, {message: "没有找到此 Categ"});
						if(Categ.num_sons) return MdFilter.jsonFailed(res, {message: "此 Categ 有子分类 不能被添加产品"});
						Prod.Categs.push(Categ._id);
					}
				}
			}

			if(obj.price_regular || obj.price_regular == 0) {
				obj.price_regular = parseFloat(obj.price_regular);
				if(!isNaN(obj.price_regular)) Prod.price_regular = obj.price_regular;
			}
			if(obj.price_sale || obj.price_sale == 0) {
				obj.price_sale = parseFloat(obj.price_sale);
				if(!isNaN(obj.price_sale)) Prod.price_sale = obj.price_sale;
			}
			if(obj.price_cost) {
				obj.price_cost = parseFloat(obj.price_cost);
				if(!isNaN(obj.price_cost)) Prod.price_cost = obj.price_cost;
			}
			if(obj.price_cost == 0) Prod.price_cost = 0;

			if(!isNaN(parseInt(obj.iva))) Prod.iva = parseInt(obj.iva);

			if(obj.img_url && (obj.img_url != Prod.img_url) && Prod.img_url && Prod.img_url.split("Prod").length > 1){
				await MdFiles.rmPicture(Prod.img_url);
				Prod.img_url = obj.img_url;
			}
			if(obj.img_xs && (obj.img_xs != Prod.img_xs) && Prod.img_xs && Prod.img_xs.split("Prod").length > 1){
				await MdFiles.rmPicture(Prod.img_xs);
				Prod.img_xs = obj.img_xs;
			}

		}
		Prod.User_upd = payload._id;

		const objSave = await Prod.save();


		setModify_Prods(Prod._id); // 缓存变化

		if(need_matchs) {
			change_codeMatchs_Prod(orgCode, Shop_id);
			change_codeMatchs_Prod(newCode, Shop_id);
		}

		RecordCT.RecordPost_func(payload, {dbName: dbProd}, ProdObj, obj);

		if(req.query.populateObjs) {	// 如果传入populate 则重新查找
			const GetDB_Filter = {
				id: objSave._id,
				payload,
				queryObj: req.query,
				objectDB: ProdDB,
				path_Callback: Prod_path_Func,
				dbName: dbProd,
			};
			const db_res = await GetDB.db(GetDB_Filter);
			db_res.message = "Prod 修改成功"
			return MdFilter.jsonSuccess(res, db_res);
		} else {
			return MdFilter.jsonSuccess(res, {message: "ProdPut", data: {object: objSave}});
		}
		
	} catch(error) {
		return MdFilter.json500(res, {message: "ProdPut", error});
	}
}






















const Prod_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm._id || payload.Firm;

		if(payload.role >= ConfUser.role_set.boss) {
			pathObj.Shop = payload.Shop._id || payload.Shop;
		} else {
			if(queryObj && queryObj.Shops) {
				const ids = MdFilter.stringToObjectIds(queryObj.Shops);
				pathObj.Shop = {$in: ids};
			}
		}
	} else {
		// pathObj.is_usable = 1;
	}

	if(!queryObj) return;
	if(queryObj.Shops) {
		const ids = MdFilter.stringToObjectIds(queryObj.Shops);
		pathObj["Shop"] = {$in: ids};
	}
	if(queryObj.is_quick) {
		if(queryObj.is_quick == 1 || queryObj.is_quick === 'true') {
			pathObj["is_quick"] = true;
		} else if(queryObj.is_quick == 0 || queryObj.is_quick === 'false'){
			pathObj["is_quick"] = false;
		}
	}
	if(queryObj.Brands) {
		const ids = MdFilter.stringToObjectIds(queryObj.Brands);
		pathObj["Brand"] = {$in: ids};
	}
	if(queryObj.Nations) {
		const ids = MdFilter.stringToObjectIds(queryObj.Nations);
		pathObj["Nation"] = {$in: ids};
	}
	if(queryObj.Categs) {
		const ids = MdFilter.stringToObjectIds(queryObj.Categs);
		pathObj["Categs"] = {$in: ids};
	}
}


const dbProd = 'Prod';
exports.Prods = async(req, res) => {
	console.log("/prods");
	try {
		const payload = req.payload;

		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: ProdDB,
			path_Callback: Prod_path_Func,
			dbName: dbProd,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		// console.log(dbs_res.data.objects)
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Prods", error});
	}
}

const fNiu_zNiu = async(payload) => {
	const nowDate = new Date();
	const ps = await ProdDB.find({Firm: payload.Firm._id});
	for(let i=0; i<ps.length; i++) {
		const p = ps[i];

		p.Firm = payload.Firm;
		p.Shop = payload.Shop._id || payload.Shop;
		p.is_simple = true;
		p.Attrs = [];
		p.Skus = [];
		p.is_controlStock = true;
		p.quantity_alert = 0;
		p.weight = 0;
		p.allow_backorder = true;
		
		const doc = p._doc;
		if(doc.price) p.price_regular = p.price_sale = doc.price;

		if(!p.sort) p.sort = doc.weight || 0;
		if(!p.price_cost) p.price_cost = doc.priceIn || doc.cost || 0;
		// console.log(i, doc.priceIn, p.price_cost);

		if(!p.quantity) p.quantity = doc.stock || 0;
		if(!p.at_crt) p.at_crt = doc.ctAt || nowDate;
		if(!p.at_upd) p.at_upd = doc.upAt || nowDate;

		p.img_urls = [];
		if(doc.photo) {
			const urls = doc.photo.split('product');
			if(urls.length == 2) {
				const img = urls[0] + 'Prod' + urls[1];
				p.img_urls = [img]
				console.log(p.img_urls)
			}
		}

		const pv = await p.save();
	}
	/* *
	db.prods.update({}, {"$unset": {
		'sales': '', 'posts': '', 
		'creater': '', 'firm': '', 
		'rcmd': '', 'stock': '',
		'price': '', 'material': '',
		'ordfirs': '', 'cost': '',
		'sizes': '', 'colors': '',
		'photo': '', 'sells': ''
	}}, false, true);

	db.prods.update({}, {"$unset": {
		'sells': ''
	}}, false, true);
	*/
}

exports.Prod = async(req, res) => {
	console.log("/prod");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: ProdDB,
			path_Callback: Prod_path_Func,
			dbName: dbProd,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Prod", error});
	}
}