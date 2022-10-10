const path = require('path');

const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const FirmDB = require(path.resolve(process.cwd(), 'app/models/auth/Firm'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));


exports.FirmPut = async(req, res) => {
	console.log("/FirmPut");
	try{
		const payload = req.payload;

		const pathObj = {_id: payload.Firm};

		const Firm = await FirmDB.findOne(pathObj);
		if(!Firm) return MdFilter.jsonFailed(res, {message: "没有找到此公司信息"});

		if(req.body.general) {
			Firm_general(res, req.body.general, Firm, payload);
		} else if(req.body.mainShop) {
			Firm_mainShop(res, req.body.mainShop, Firm, payload);
		} else {
			return MdFilter.jsonFailed(res, {message: "请传递 general 参数"});
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "FirmPut", error});
	}
}
const Firm_mainShop = async(res, obj, Firm, payload) => {
	try {
		const ShopId = obj.ShopId;
		if(!MdFilter.isObjectId(ShopId)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const Shop = await ShopDB.findOne({_id: ShopId, Firm: Firm._id});
		if(!Shop) return MdFilter.jsonFailed(res, {message: "没有找到店铺信息"});

		const ShopUpdMany = await ShopDB.updateMany({Firm: Firm._id, is_main: true}, {is_main: false});
		Shop.is_main = true;
		const mainShopSave = await Shop.save();
		return MdFilter.jsonSuccess(res, {message: "Firm_mainShop", data: {object: Firm}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Firm_mainShop", error});
	}
}
const Firm_general = async(res, obj, Firm, payload) => {
	try {
		if(obj.nome) Firm.nome = obj.nome;
		if(obj.resp) Firm.resp = obj.resp;
		if(obj.tel) Firm.tel = obj.tel;
		if(obj.addr) Firm.addr = obj.addr;

		const objSave = await Firm.save();
		return MdFilter.jsonSuccess(res, {message: "Firm_general", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Firm_general", error});
	}
}




const dbFirm = 'Firm';

exports.Firm = async(req, res) => {
	console.log("/Firm");
	try {
		const db_res = await GetDB.db(obtFilterObj(req, req.params.id));
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Firm", error});
	}
}

const obtFilterObj = (req, id) => {
	const DB_filter =  {
		payload: req.payload,
		queryObj: req.query,

		objectDB: FirmDB,
		path_Callback: Firm_path_Func,
		dbName: dbFirm,
	};
	if(id) DB_filter.id = id;

	return DB_filter;
}


const Firm_path_Func = (pathObj, payload, queryObj) => {
	if(payload.role > ConfUser.role_set.manager) {
		pathObj.is_usable = 1;
	}

	if(!queryObj) return;
}