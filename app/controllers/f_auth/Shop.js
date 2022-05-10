const _ = require('underscore');

const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const StintShop = require(path.resolve(process.cwd(), 'app/config/stint/StintShop'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles'));
const UserDB = require(path.resolve(process.cwd(), 'app/models/auth/User'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const FirmDB = require(path.resolve(process.cwd(), 'app/models/auth/Firm'));
const CitaDB = require(path.resolve(process.cwd(), 'app/models/address/Cita'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.ShopPost = async(req, res) => {
	console.log("/ShopPost");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});
		let obj = req.body.obj;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Shop", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		if(obj.Firm === 'Supplier') {
			obj.Firm = null;
		} else {
			if(payload.role > ConfUser.role_set.manager) return MdFilter.jsonFailed(res, {message: "需要公司管理者权限"});
			obj.Firm = payload.Firm;
		}

		// 判断参数是否符合要求
		const errorInfo = MdFilter.objMatchStint(StintShop, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		if(!MdFilter.isObjectId(obj.Cita)) return MdFilter.jsonFailed(res, {message: '请输入商店所在城市'});
		const Cita = await CitaDB.findOne({_id: obj.Cita});
		if(!Cita) return MdFilter.jsonFailed(res, {message: '没有找到您选择的城市信息'});

		obj.User_crt = payload._id;
		obj.price_ship = 0;
		obj.serve_Citas = [];
		const serve_Cita = {};
		serve_Cita.Cita = Cita._id;
		serve_Cita.price_ship = 0;
		obj.serve_Citas.push(serve_Cita);

		// 分店的编号或者名称是否相同
		const objSame = await ShopDB.findOne({$or:[{'code': obj.code}, {'nome': obj.nome}], Firm: payload.Firm});
		if(objSame) return MdFilter.jsonFailed(res, {message: '店铺编号或名称相同'});
		const _object = new ShopDB(obj);
		const objSave = await _object.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "ShopPost 数据库保存失败"});
		// console.log("/ShopPost", objSave)
		return MdFilter.jsonSuccess(res, {message: "创建成功", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "ShopPost", error});
	}
}


exports.ShopDelete = async(req, res) => {
	console.log("/ShopDelete");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Shop的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据 _id"});

		const pathObj = {_id: id};
		Shop_path_Func(pathObj, payload, req.query);

		const Shop = await ShopDB.findOne(pathObj);
		if(!Shop) return MdFilter.jsonFailed(res, {message: "没有找到此店铺信息"});

		if((payload.role > ConfUser.role_set.manager) && (Shop.Firm === payload.Firm)) {
			return MdFilter.jsonFailed(res, {message: "需要公司管理者权限"});
		}

		const User = await UserDB.findOne({Shop: Shop._id});
		if(User) return MdFilter.jsonFailed(res, {message: "请先删除店铺中的所有用户"});

		const Prod = await ProdDB.findOne({Shop: Shop._id});
		if(Prod) return MdFilter.jsonFailed(res, {message: "请先删除店铺中的商品"});

		if(Shop.img_url && Shop.img_url.split("Shop").length > 1) await MdFiles.rmPicture(Shop.img_url);
		const objDel = await ShopDB.deleteOne({_id: Shop._id});
		return MdFilter.jsonSuccess(res, {message: "删除成功"});
	} catch(error) {
		return MdFilter.json500(res, {message: "ShopDelete", error});
	}
}



exports.ShopPut = async(req, res) => {
	console.log("/ShopPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Shop的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		Shop_path_Func(pathObj, payload, req.query);

		const Shop = await ShopDB.findOne(pathObj);
		if(!Shop) return MdFilter.jsonFailed(res, {message: "没有找到此店铺信息"});

		if((payload.role > ConfUser.role_set.manager) && (Shop.Firm === payload.Firm)) {
			return MdFilter.jsonFailed(res, {message: "需要公司管理者权限"});
		}

		if(req.body.general) {
			Shop_general(res, req.body.general, Shop, payload);
		} else if(req.body.serveCitaPost) {
			Shop_serveCitaPost(res, req.body.serveCitaPost, Shop);
		} else if(req.body.serveCitaPut) {
			Shop_serveCitaPut(res, req.body.serveCitaPut, Shop);
		} else if(req.body.serveCitaDelete) {
			Shop_serveCitaDelete(res, req.body.serveCitaDelete, Shop, payload);
		} else {
			// 判断是否用上传文件的形式 传递了数据
			const obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Shop", field: "img_url"});
			if(!obj) return MdFilter.jsonFailed(res, {message: "参数错误"});
			Shop_general(res, obj, Shop, payload);
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "ShopPut", error});
	}
}

const Shop_general = async(res, obj, Shop, payload) => {
	try{
		const same_arrs = [];
		if(obj.code && (obj.code = obj.code.replace(/^\s*/g,"").toUpperCase()) && (obj.code !== Shop.code)) {
			const errorInfo = MdFilter.objMatchStint(StintShop, obj, ['code']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
			Shop.code = obj.code;
			same_arrs.push({'code': Shop.code});
		}
		if(obj.nome && (obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase()) && (obj.nome !== Shop.nome)) {
			const errorInfo = MdFilter.objMatchStint(StintShop, obj, ['nome']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
			Shop.nome = obj.nome;
			same_arrs.push({'nome': Shop.nome});
		}

		if(same_arrs.length > 0) {
			const same_param = {_id: {$ne: Shop._id},Firm: payload.Firm,$or: same_arrs};
			if(obj.code !== Shop.code || obj.nome !== Shop.nome) {
				const objSame = await ShopDB.findOne(same_param);
				if(objSame) return MdFilter.jsonFailed(res, {message: '此店铺编号已被占用, 请查看'});
			}
		}

		if((obj.is_main == 1 || obj.is_main === true || obj.is_main === 'true') && (Shop.is_main !== true)) {
			const ShopUpdMany = await ShopDB.updateMany({Firm: payload.Firm, is_main: true}, {is_main: false});
			Shop.is_main = true;
			// const mainShop = await ShopDB.findOne({is_main: true});
			// if(mainShop) return MdFilter.jsonFailed(res, {message: "只能有一个主店铺, 需要把主店铺关闭, 再开启此主店铺"})
		}

		if(obj.Cita && (obj.Cita != Shop.Cita)) {
			if(!MdFilter.isObjectId(obj.Cita)) return MdFilter.jsonFailed(res, {message: '城市数据需要为 _id 格式'});

			const index = MdFilter.indexOfArrayObject(Shop.serve_Citas, "Cita", obj.Cita);	// 查看服务区中 是否有此城市
			if(index < 0) return MdFilter.jsonFailed(res, {message: '请先添加服务区'});

			const Cita = await CitaDB.findOne({_id: obj.Cita});
			if(!Cita) return MdFilter.jsonFailed(res, {message: '没有找到此城市信息'});
			Shop.Cita = obj.Cita;
		}
		if(obj.contact) Shop.contact = obj.contact;
		if(obj.img_url && (obj.img_url != Shop.img_url) && Shop.img_url && Shop.img_url.split("Shop").length > 1){
			await MdFiles.rmPicture(Shop.img_url);
			Shop.img_url = obj.img_url;
		}

		Shop.User_upd = payload._id;
		const objSave = await Shop.save();

		return MdFilter.jsonSuccess(res, {message: "修改成功", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Shop_general", error});
	}
}

const Shop_serveCitaPost = async(res, obj, Shop) => {
	try{
		if(isNaN(parseFloat(obj.price_ship)) || !obj.Cita || !MdFilter.isObjectId(obj.Cita)) {
			return MdFilter.jsonFailed(res, {message: "请正确传输 新的服务区参数"});
		}

		const index = MdFilter.indexOfArrayObject(Shop.serve_Citas, "Cita", obj.Cita);	// 查看服务区中 是否有此城市
		if(index >= 0) return MdFilter.jsonFailed(res, {message: '此服务区已经被添加'});

		Shop.serve_Citas.push(obj);
		const objSave = await Shop.save();
		// k-e-l-i-n;
		const object = await ShopDB.findOne({_id: objSave._id})
			.populate({path: 'serve_Citas.Cita'});
		return MdFilter.jsonSuccess(res, {message: '成功添加新的服务区', data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Shop_serveCitaPost", error});
	}
}
const Shop_serveCitaPut = async(res, obj, Shop) => {
	try{
		const price_ship = parseFloat(obj.price_ship);
		if(isNaN(price_ship)) return MdFilter.jsonFailed(res, {message: '服务费必须为数字'});
		// 找到此服务城市
		let i=0;
		for(; i<Shop.serve_Citas.length; i++) {
			if(String(Shop.serve_Citas[i]._id) === obj._id) {
				Shop.serve_Citas[i].price_ship = price_ship;
				break;
			}
		}
		if(i === Shop.serve_Citas.length) return MdFilter.jsonFailed(res, {message: '没有找到需要修改的服务区'});

		const objSave = await Shop.save();
		return MdFilter.jsonSuccess(res, {message: '成功修改服务区', data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Shop_serveCitaPut", error});
	}
}
const Shop_serveCitaDelete = async(res, obj, Shop) => {
	try{
		if(!MdFilter.isObjectId(obj.Cita)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		if(obj.Cita == String(Shop.Cita)) return MdFilter.jsonFailed(res, {message: "不可删除所在城市服务区"})
		Shop.serve_Citas.splice(Shop.serve_Citas.findIndex(serve_Cita => String(serve_Cita.Cita) == obj.Cita), 1);

		const objSave = await Shop.save();
		return MdFilter.jsonSuccess(res, {message: '成功删除服务区', data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Shop_serveCitaDelete", error});
	}
}


















const dbShop = 'Shop';
exports.Shops = async(req, res) => {
	console.log("/Shops");
	try {
		const dbs_res = await GetDB.dbs(obtFilterObj(req));
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Shops", error});
	}
}

exports.Shop = async(req, res) => {
	console.log("/Shop");
	try {
		const db_res = await GetDB.db(obtFilterObj(req, req.params.id));
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Shop", error});
	}
}

const obtFilterObj = (req, id) => {
	const DB_filter =  {
		payload: req.payload,
		queryObj: req.query,

		objectDB: ShopDB,
		path_Callback: Shop_path_Func,
		dbName: dbShop,
	};
	if(id) DB_filter.id = id;

	return DB_filter;
}


const Shop_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		if(queryObj && queryObj.Firm === "Supplier") {
			pathObj["Firm"] = {$eq: null};
		} else {
			pathObj.Firm = payload.Firm;
		}
		if(payload.role > ConfUser.role_set.manager) {
			pathObj.is_usable = 1;
		}
	} else {
		pathObj.is_usable = 1;
	}

	if(!queryObj) return;
	if(queryObj.is_main) {
		const is_main = (queryObj.is_main == 1 || queryObj.is_main === 'true') ? 1 :  0;
		pathObj["is_main"] = {'$eq': is_main};
	}
	if(queryObj.is_boutique) {
		const is_boutique = (queryObj.is_boutique == 1 || queryObj.is_boutique === 'true') ? 1 : 0;
		pathObj["is_boutique"] = {'$eq': is_boutique};
	}
	if(queryObj.serve_Citas) {
		const ids = MdFilter.stringToObjectIds(queryObj.serve_Citas);
		pathObj["serve_Citas"] = { $elemMatch: {Cita: {$in: ids}}};
	}
	if(queryObj.Citas) {
		const ids = MdFilter.stringToObjectIds(queryObj.Citas);
		pathObj["Cita"] = {$in: ids};
	}
}