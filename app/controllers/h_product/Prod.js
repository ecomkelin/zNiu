const ObjectId = require('mongodb').ObjectId;

const _ = require('underscore');
const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const StintPd = require(path.resolve(process.cwd(), 'app/config/stint/StintPd'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const NationDB = require(path.resolve(process.cwd(), 'app/models/address/Nation'));
const BrandDB = require(path.resolve(process.cwd(), 'app/models/complement/Brand'));
const CategDB = require(path.resolve(process.cwd(), 'app/models/complement/Categ'));
const PdDB = require(path.resolve(process.cwd(), 'app/models/product/Pd'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const SkuDB = require(path.resolve(process.cwd(), 'app/models/product/Sku'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

let cashProds = [];

exports.ProdPost = async(req, res) => {
	console.log("/ProdPost");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});
		if(payload.role < ConfUser.role_set.boss || !payload.Shop) return MdFilter.jsonFailed(res, {message: "您没有所属商店"});

		if(req.body.Pd) {		// 从总公司同步
			Prod_PdSynchronize(res, req.body.Pd, payload);
		} else if(req.body.Pds) {	// 从公司批量同步
			Prods_PdSynchronize(res, req.body.Pds, payload);
		} else {
			let obj = req.body.obj;
			if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir:"/Prod", field: "img_urls", is_Array: true});
			if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
			Prod_PdNull(res, obj, payload);
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "ProdPost", error});
	}
}

const Prod_PdNull = async(res, obj, payload) => {
	console.log("/Prod_PdNull")
	try {
		obj.Pd = null;
		if(obj.code) {
			// 如果输入了 编号 则编号必须是唯一;  注意 Prod code 没有转大写
			const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['code', 'nome']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
			const objSame = await ProdDB.findOne({'code': obj.code, Firm: payload.Firm});
			if(objSame) return MdFilter.jsonFailed(res, {message: "产品编号相同"});
		} else {
			const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['nome']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		}
		if(isNaN(obj.weight)) obj.weight = parseFloat(obj.weight);

		if(isNaN(obj.price_cost)) obj.price_cost = 0;
		obj.price_cost = parseFloat(obj.price_cost);

		if(isNaN(obj.price_regular)) return MdFilter.jsonFailed(res, {message: "price_regular要为数字"});
		obj.price_regular = parseFloat(obj.price_regular);

		if(isNaN(obj.price_sale)) return MdFilter.jsonFailed(res, {message: "price_sale要为数字"});
		obj.price_sale = parseFloat(obj.price_sale);

		if(!MdFilter.isObjectId(obj.Brand)) obj.Brand = null;
		if(!MdFilter.isObjectId(obj.Nation)) obj.Nation = null;
		if(!MdFilter.isObjectId(obj.Categ)) obj.Categ = null;

		if(!isNaN(obj.limit_quantity)) obj.limit_quantity = parseInt(obj.limit_quantity);
		if(!isNaN(obj.quantity)) obj.quantity = parseInt(obj.quantity);
		if(!isNaN(obj.quantity_alert)) obj.quantity_alert = parseInt(obj.quantity_alert);
		obj.allow_backorder = (obj.allow_backorder == 1 || obj.allow_backorder === true || obj.allow_backorder === 'true') ? true : false; 
		const save_res = await Prod_save_Prom(obj, payload, null);
		return MdFilter.jsonSuccess(res, save_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Prod_PdNull", error});
	}
}
const Prod_PdSynchronize = async(res, Pd_id, payload) => {
	try {
		if(!MdFilter.isObjectId(Pd_id)) return MdFilter.jsonFailed(res, {message: "请输入需要同步的产品_id"});
		Pd = await PdDB.findOne({_id: Pd_id, Firm: payload.Firm});
		if(!Pd) return MdFilter.jsonFailed(res, {message: "没有找到此同步产品信息"});

		const objSame = await ProdDB.findOne({Pd: Pd_id, Shop: payload.Shop, Firm: payload.Firm});
		if(objSame) return MdFilter.jsonFailed(res, {message: '此商品之前已经被同步', data: {object: objSame}});
		const obj = Pd_to_Prod(Pd);
		const save_res = await Prod_save_Prom(obj, payload, Pd);
		return MdFilter.jsonSuccess(res, save_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Prod_PdSynchronize", error});
	}
}
const Prods_PdSynchronize = async(res, Pds, payload) => {
	try {
		if(!MdFilter.ArrIsObjectId(Pds)) return MdFilter.jsonFailed(res, {message: "输入需要同步的产品 Pds 的 _id"});
		for(let i = 0; i<Pds.length; i++) {
			const Pd_id = Pds[i];
			if(!MdFilter.isObjectId(Pd_id)) {
				console.log('Prods_PdSynchronize: ['+Pd_id+'] 不是 _id');
				continue;
			}

			Pd = await PdDB.findOne({_id: Pd_id, Firm: payload.Firm});
			if(!Pd) {
				console.log('Prods_PdSynchronize: ['+Pd_id+'] 没有找到产品信息');
				continue;
			}

			const objSame = await ProdDB.findOne({Pd: Pd_id, Shop: payload.Shop, Firm: payload.Firm});
			if(objSame) {
				console.log('Prods_PdSynchronize: ['+Pd_id+'] 此商品之前已经被同步');
				continue;
			}
			const obj = Pd_to_Prod(Pd);
			const save_res = await Prod_save_Prom(obj, payload, Pd);
			if(save_res.status) console.log(save_res.message);
		}
		return MdFilter.jsonSuccess(res, {message: "Prods_PdSynchronize"});
	} catch(error) {
		return MdFilter.json500(res, {message: "Prods_PdSynchronize", error});
	}
}
const Pd_to_Prod = (Pd) => {
	const obj = {};
	obj.Pd = Pd._id;
	if(Pd.Categ) obj.Categ = Pd.Categ;
	obj.sort = Pd.sort;

	obj.code = Pd.code;
	obj.nome = Pd.nome;
	if(obj.nomeTR) obj.nomeTR = Pd.nomeTR;
	if(obj.weight) obj.weight = Pd.weight;
	obj.price_regular = Pd.price_regular;
	obj.price_sale = Pd.price_sale;
	obj.price_cost = Pd.price_cost;
	obj.img_urls = Pd.img_urls;
	obj.Brand = Pd.Brand;
	obj.Nation = Pd.Nation;

	obj.desp = Pd.desp;
	obj.unit = Pd.unit;
	obj.langs = Pd.langs;

	obj.price_unit = obj.price_min = obj.price_max = Pd.price_regular;
	return obj;
}
const Prod_save_Prom = async(obj, payload, Pd) => {
	return new Promise(async(resolve) => {
		try {
			obj.Skus = [];
			obj.is_usable = (obj.is_usable == 1 || obj.is_usable === true || obj.is_usable === 'true') ? true: false;
			obj.Firm = payload.Firm;
			obj.Shop = payload.Shop;
			obj.User_crt = obj.User_upd = payload._id;
			const _object = new ProdDB(obj);

			const objSave = await _object.save();
			if(!objSave) return resolve(res, {message: "商品保存失败"});

			// 如果是同步 则需要把产品下的商品 _id 推送到产品中去
			if(Pd) {
				Pd.Prods.push(objSave._id);
				await Pd.save();
			}

			return resolve({status: 200, message: "Prod_save_Prom", data: {object: objSave}});
		} catch(error) {
			console.log("[resolve Prod_save_Prom]", error);
			return resolve({status: 400, message: "[resolve Prod_save_Prom]"});
		}
	});
}









exports.ProdDelete = async(req, res) => {
	console.log("/ProdDelete")
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const pathObj = {_id: id};
		Prod_path_Func(pathObj, payload);

		const Prod = await ProdDB.findOne(pathObj);
		if(!Prod) return MdFilter.jsonFailed(res, {message: "没有找到此商品信息,请刷新重试"});

		const Skus = await SkuDB.find({Prod: Prod._id});
		if(Skus && Skus.length > 0) return MdFilter.jsonFailed(res, {message: "请先删除商品中的,非默认Sku"});

		if(Prod.Pd) {
			const Pd = await PdDB.findOne({_id: Prod.Pd});
			const index = MdFilter.indexOfArray(Pd.Prods, Prod._id);
			Pd.Prods.splice(index, 1);
		}

		const objDel = await ProdDB.deleteOne({_id: Prod._id});
		return MdFilter.jsonSuccess(res, {message: "ProdDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "ProdDelete", error});
	}
}


exports.ProdPut = async(req, res) => {
	console.log("/ProdPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		Prod_path_Func(pathObj, payload);

		const Prod = await ProdDB.findOne(pathObj);
		if(!Prod) return MdFilter.jsonFailed(res, {message: "没有找到此商品信息"});

		let obj = null;
		if(req.body.general) {
			obj = req.body.general;
		} else {
			obj = await MdFiles.mkPicture_prom(req, {img_Dir:"/Prod", field: "img_urls", is_Array: true});
			if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
			if(obj.img_urls && obj.img_urls.length > 0) {
				if(Prod.img_urls && Prod.img_urls.length > 0) {
					for(let i=0; i<Prod.img_urls.length; i++) {
						await MdFiles.rmPicture(Prod.img_urls[i]);
					};
				} 
				Prod.img_urls = obj.img_urls;
			}
		}
		if(obj.desp) Prod.desp = obj.desp.replace(/^\s*/g,"");
		if(obj.unit) Prod.unit = obj.unit.replace(/^\s*/g,"");
		if(obj.sort) {
			obj.sort = parseInt(obj.sort);
			if(!isNaN(obj.sort)) Prod.sort = obj.sort;
		}
		if(obj.quantity) {
			obj.quantity = parseInt(obj.quantity);
			if(!isNaN(obj.quantity)) Prod.quantity = obj.quantity;
		}

		if(obj.is_usable == 1 || obj.is_usable === true || obj.is_usable === 'true') Prod.is_usable = true;
		if(obj.is_usable == 0 || obj.is_usable === false || obj.is_usable === 'false') Prod.is_usable = false;

		if(!Prod.Pd) {	// 如果是单店 可以修改名称等 暂时没有做
			if(obj.code) Prod.code = obj.code.replace(/^\s*/g,"");	// 注意 Pd code 没有转大写
			if(obj.nome) Prod.nome = obj.nome.replace(/^\s*/g,"");	// 注意 Pd code 没有转大写
			Prod.nomeTR = obj.nomeTR;
			if(Prod.nomeTR) Prod.nomeTR = Prod.nomeTR.replace(/^\s*/g,"");	// 注意 Pd code 没有转大写
			if(obj.Nation) Prod.Nation = obj.Nation;	// 注意 Pd code 没有转大写
			if(obj.Brand) Prod.Brand = obj.Brand;	// 注意 Pd code 没有转大写
			if(obj.Categ) Prod.Categ = obj.Categ;	// 注意 Pd code 没有转大写
			if(obj.weight) {
				obj.weight = parseFloat(obj.weight);
				if(!isNaN(obj.weight)) Prod.weight = obj.weight;
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
		}
		Prod.User_upd = payload._id;

		const objSave = await Prod.save();
		return MdFilter.jsonSuccess(res, {message: "ProdPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "ProdPut", error});
	}
}
























const Prod_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm;

		if(payload.role >= ConfUser.role_set.boss) {
			pathObj.Shop = payload.Shop;
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
		pathObj["Categ"] = {$in: ids};
	}
}

const dbProd = 'Prod';
exports.Prods = async(req, res) => {
	console.log("/prods");
	try {		
		const payload = req.payload;
		// console.log(payload)
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
const fNiu_zNiu = async() => {
	const nowDate = new Date();
	const ps = await ProdDB.find();
	for(let i=0; i<ps.length; i++) {
		const p = ps[i];

		p.Firm = '625ec1649c05fb0cce340721';
		p.Shop = '625edae70abb86142fb07bdb';
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
		console.log(i, doc.priceIn, p.price_cost);

		if(!p.quantity) p.quantity = doc.stock || 0;
		if(!p.at_crt) p.at_crt = doc.ctAt || nowDate;
		if(!p.at_upd) p.at_upd = doc.upAt || nowDate;

		p.img_urls = [];
		if(doc.photo) {
			p.img_urls[0] = doc.photo;
			const pv = await p.save();
		}
	}
	flag = 2;
	/* *
	db.prods.update({}, {"$unset": {
		'sales': '', 'posts': '', 
		'creater': '', 'firm': '', 
		'rcmd': '', 'stock': '',
		'price': '', 'material': '',
		'ordfirs': '', 'cost': '',
		'sizes': '', 'colors': '',
		'photo': ''
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