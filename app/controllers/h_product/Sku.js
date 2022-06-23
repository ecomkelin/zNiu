const _ = require('underscore');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const SkuDB = require(path.resolve(process.cwd(), 'app/models/product/Sku'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

const setAttrs_Func = (attrs) => {	// 设置 Sku.attrs 中的nome无重复  attr.nome 和 attr.option 为大写
	if(!attrs) return false;
	const nomes = [];
	const temps = [];
	for(let i=0; i<attrs.length; i++) {
		const attr = attrs[i];
		if(!attr.option || attr.option == "null" || attr.option == "" || attr.option == "0") continue;
		attr.nome = attr.nome.toUpperCase();
		attr.option = attr.option.toUpperCase();
		if(!nomes.includes(attr.nome)) temps.push(attr);
		nomes.push(attr.nome);
	}
	return temps;
}
const compareAttrs_Func = (temps, attrs) => {	// 查看 两个 attrs 是否相同
	if(temps.length != attrs.length) return false;
	const tmps = [];
	for(let i=0; i<temps.length; i++) {
		const temp = temps[i];
		for(let j=0; j<attrs.length; j++) {
			const attr = attrs[j];
			if((attr.nome == temp.nome) && (attr.option == temp.option)) {
				tmps.push({nome: temp.nome, option: temp.option});
				break;
			}
		}
	}
	return (tmps.length == temps.length) ? true : false ;
}

const includes_attrs_Func = (Attrs, attrs) => {	// 判断 Attrs 中是否包含所有的 attrs
	if(!Attrs || Attrs.length == 0 || !attrs || attrs.length == 0) return false;
	for(let i=0; i<attrs.length; i++) {
		const attr = attrs[i];
		if(!attr.nome || !attr.option) return false;
		const Attr = Attrs.find(item => { return item.nome == attr.nome});
		if(!Attr) return false;
		const options = Attr.options;
		if(!(options instanceof Array )) return false;
		if(!options.includes(attr.option)) return false;
	}
	return true;
}


exports.SkuPost = async(req, res) => {
	console.log("/SkuPost");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		let obj = req.body.obj;

		if(!obj) return MdFilter.jsonFailed(res, {message: '请输入 obj 参数'});
		if(!MdFilter.isObjectId(obj.Prod)) return MdFilter.jsonFailed(res, {message: '所属商品 _id'});
		const Prod = await ProdDB.findOne({_id: obj.Prod, Firm: payload.Firm})
			.populate([{path: "Skus"}, {path: "Attrs", select: "nome options"}]);
		if(!Prod) return MdFilter.jsonFailed(res, {message: '没有找到同步产品信息'});

		if(!obj.attrs || obj.attrs.length == 0) return MdFilter.jsonFailed(res, {message: '请输入Product的属性值 '});
		obj.attrs = setAttrs_Func(obj.attrs);
		if(!includes_attrs_Func(Prod.Attrs, obj.attrs)) return MdFilter.jsonFailed(res, {message: '商品中没有此属性'});

		const Skus = Prod.Skus;
		let iPt = 0;
		for(; iPt<Skus.length; iPt++) {
			if(compareAttrs_Func(obj.attrs, Skus[iPt].attrs)) break;
		}
		if(iPt !== Skus.length) return MdFilter.jsonFailed(res, {message: '已经有此属性'});

		obj.Pd = Prod.Pd;
		obj.Firm = Prod.Firm;
		obj.Shop = Prod.Shop;
		obj.weight = isNaN(parseFloat(obj.weight)) ? Prod.weight : parseFloat(obj.weight);
		obj.price_regular = isNaN(parseFloat(obj.price_regular)) ? Prod.price_regular : parseFloat(obj.price_regular);
		obj.price_sale = isNaN(parseFloat(obj.price_sale)) ? Prod.price_sale : parseFloat(obj.price_sale);
		obj.limit_quantity = isNaN(parseInt(obj.limit_quantity)) ? 0 : parseInt(obj.limit_quantity);

		if(obj.is_controlStock == 1 || obj.is_controlStock === 'true') {
			obj.is_controlStock = true;
		} else if(obj.is_controlStock == 0 || obj.is_controlStock == "false") {
			obj.is_controlStock = false;
		} else {
			obj.is_controlStock = true;
		}
		obj.quantity = (obj.quantity) ? parseInt(obj.quantity) : 0;
		obj.quantity_alert = (obj.quantity_alert) ? parseInt(obj.quantity_alert) : 0;

		if(obj.allow_backorder == 1 || obj.allow_backorder === 'true') {
			obj.allow_backorder = true;
		} else {
			obj.allow_backorder = false;
		}

		obj.User_crt = payload._id;
		const _object = new SkuDB(obj);

		if(!Prod.Skus) Prod.Skus = [];
		Prod.Skus.push(_object._id);
		const ProdSave = await Prod.save();
		if(!ProdSave) return MdFilter.jsonFailed(res, {message: '对应商品保存失败 '}); 

		const objSave = await _object.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: '商品Product保存失败 '});

		ProdUpd_fromSku_Prom(Prod._id);

		return MdFilter.jsonSuccess(res, {message: "SkuPost", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "SkuPost", error});
	}
}




exports.SkuDelete = async(req, res) => {
	console.log("/SkuDelete");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Sku的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据 _id"});

		const pathObj = {_id: id};
		// Sku_path_Func(pathObj, payload);

		const Sku = await SkuDB.findOne(pathObj);
		if(!Sku) return MdFilter.jsonFailed(res, {message: "没有找到此Sku信息"});

		const Prod = await ProdDB.findOne({_id: Sku.Prod});
		if(Prod) {
			const index = MdFilter.indexOfArray(Prod.Skus, id);
			Prod.Skus.splice(index, 1);
			const ProdSave = await Prod.save();
			if(!ProdSave) return MdFilter.jsonFailed(res, {message: "商品保存失败"});
			ProdUpd_fromSku_Prom(Prod._id);
		}

		const objDel = await SkuDB.deleteOne({_id: id});
		return MdFilter.jsonSuccess(res, {message: "删除成功"});
	} catch(error) {
		return MdFilter.json500(res, {message: "SkuDelete", error});
	}
}



exports.SkuPut = async(req, res) => {
	console.log("/SkuPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Sku的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		// Sku_path_Func(pathObj, payload);

		const Sku = await SkuDB.findOne(pathObj);
		if(!Sku) return MdFilter.jsonFailed(res, {message: "没有找到此Sku信息"});
		const Prod = await ProdDB.findOne({_id: Sku.Prod, Firm: payload.Firm})
			.populate([{path: "Skus", select: "attrs"}, {path: "Attrs", select: "nome options"}]);
		if(!Prod) return MdFilter.jsonFailed(res, {message: "没有找到相应的商品信息 "});

		const obj = req.body.general;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!obj.attrs || obj.attrs.length == 0) {
			if(String(Prod.Skus[0]._id) != id) return MdFilter.jsonFailed(res, {message: '您没有传递属性 '});
		} else {
			obj.attrs = setAttrs_Func(obj.attrs);
			if(!includes_attrs_Func(Prod.Attrs, obj.attrs)) return MdFilter.jsonFailed(res, {message: '商品中没有此属性'});

			const Skus = Prod.Skus;
			let iPt = 0;
			for(; iPt<Skus.length; iPt++) {	// 对比商品下每个 Sku 是否有此系列属性
				if((String(Skus[iPt]._id) === String(id)) || !Skus[iPt].attrs) {// 当前 sku 属性不计算
					continue;
				}
				if(compareAttrs_Func(obj.attrs, Skus[iPt].attrs)) break;
			}
			if(iPt != Skus.length) return MdFilter.jsonFailed(res, {message: '商品已经有此系列属性 '});
			Sku.attrs = obj.attrs;
		}
		if(obj.weight && !isNaN(parseFloat(obj.weight))) Sku.weight =parseFloat(obj.weight);
		if(obj.price_regular && !isNaN(parseFloat(obj.price_regular))) Sku.price_regular =parseFloat(obj.price_regular);
		if(obj.price_sale && !isNaN(parseFloat(obj.price_sale))) Sku.price_sale =parseFloat(obj.price_sale);
		if(obj.limit_quantity && !isNaN(parseInt(obj.limit_quantity))) Sku.limit_quantity =parseInt(obj.limit_quantity);
		if(obj.quantity && !isNaN(parseInt(obj.quantity))) Sku.quantity =parseInt(obj.quantity);
		if(obj.quantity_alert && !isNaN(parseInt(obj.quantity_alert))) Sku.quantity_alert =parseInt(obj.quantity_alert);
		if(obj.purchase_note) Sku.purchase_note = obj.purchase_note;
		Sku.is_controlStock = (obj.is_controlStock == 1 || obj.is_controlStock === 'true') ? true : false;

		Sku.allow_backorder = (obj.allow_backorder == 1 || obj.allow_backorder === 'true') ? true : false;

		Sku.is_usable = (obj.is_usable == 1 || obj.is_usable === 'true') ? true : false;
		
		Sku.User_upd = payload._id;

		const objSave = await Sku.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: 'Product更改保存失败 '}); 

		ProdUpd_fromSku_Prom(Prod._id);

		return MdFilter.jsonSuccess(res, {message: "SkuPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "SkuPut", error});
	}
}


const ProdUpd_fromSku_Prom = (id) => {
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
			resolve({status: 200, data: {object: ProdSave}});

		} catch(error) {
			console.log(".ProdUpd-fromSku-Prom", error);
			resolve({status: 400, message: "ProdUpd-fromSku-Prom error"});
		}
	})
}









const Sku_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		if(payload) pathObj.Firm = payload.Firm;

		if(payload && payload.role >= ConfUser.role_set.boss) {
			pathObj.Shop = payload.Shop._id;
		} else {
			if(queryObj.Shops) {
				const ids = MdFilter.stringToObjectIds(queryObj.Shops);
				pathObj.Shop = {$in: ids};
			}
		}
	} else {
		// pathObj.is_usable = 1;
	}

	if(!queryObj) return;
	pathObj.Prod = queryObj.Prod;
}

const dbSku = 'Sku';
exports.Skus = async(req, res) => {
	console.log("/Skus");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: SkuDB,
			path_Callback: Sku_path_Func,
			dbName: dbSku,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Skus", error});
	}
}

exports.Sku = async(req, res) => {
	console.log("/Sku");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: SkuDB,
			path_Callback: Sku_path_Func,
			dbName: dbSku,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Sku", error});
	}
}
