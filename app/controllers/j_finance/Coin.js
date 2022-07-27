const _ = require('underscore');

const path = require('path');
const StintCoin = require(path.resolve(process.cwd(), 'app/config/stint/StintCoin')); 
const MdFiles = require(path.resolve(process.cwd(), 'app/middle/MdFiles')); 
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter')); 
const PaidtypeDB = require(path.resolve(process.cwd(), 'app/models/finance/Paidtype')); 
const CoinDB = require(path.resolve(process.cwd(), 'app/models/finance/Coin')); 
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.CoinPost = async(req, res) => {
	console.log('/CoinPost');
	try {
		const payload = req.payload;
		let Firm = payload.Firm;
		if(Firm._id) Firm = Firm._id;

		let obj = req.body.obj;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Coin", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(obj.code) obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		if(obj.nome) obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
		const errorInfo = MdFilter.objMatchStint(StintCoin, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

		if(isNaN(obj.rate)) return MdFilter.jsonFailed(res, {message: "请输入汇率"});
		obj.is_defCoin = (obj.is_defCoin == 1 || obj.is_defCoin == 'true') ? true : false;
		obj.rate = parseFloat(obj.rate);

		const objSame = await CoinDB.findOne({$or:[{'code': obj.code}, {'nome': obj.nome}], Firm});
		if(objSame) return MdFilter.jsonFailed(res, {message: '币种代号或名称相同'});
		const _object = new CoinDB(obj);
		const objSave = await _object.save();
		return MdFilter.jsonSuccess(res, {message: "CoinPost", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CoinPost"});
	}
}

exports.CoinPut = async(req, res) => {
	console.log('/CoinPut');
	try {
		const payload = req.payload;
		let Firm = payload.Firm;
		if(Firm._id) Firm = Firm._id;

		const id = req.params.id;		// 所要更改的Coin的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Coin = await CoinDB.findOne({_id: id});
		if(!Coin) return MdFilter.jsonFailed(res, {message: "没有找到此商品信息币种"});

		let obj = req.body.general;
		if(!obj) obj = await MdFiles.mkPicture_prom(req, {img_Dir: "/Coin", field: "img_url"});
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		if(!obj.code) obj.code = Coin.code;
		if(!obj.nome) obj.nome = Coin.nome;
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		const errorInfo = MdFilter.objMatchStint(StintCoin, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

		if(obj.code !== Coin.code || obj.nome !== Coin.nome) {
			const objSame = await CoinDB.findOne({_id: {$ne: Coin._id}, Firm, $or: [{code: obj.code},{nome: obj.nome}]});
			if(objSame) return MdFilter.jsonFailed(res, {message: '此币种编号已被占用, 请查看'});
		}

		if(obj.rate) {
			if(isNaN(obj.rate)) return MdFilter.jsonFailed(res, {message: '汇率必须为数字'});
			obj.rate = parseFloat(obj.rate);
		}

		if(obj.is_defCoin) {
			obj.is_defCoin = (obj.is_defCoin == 1 || obj.is_defCoin === 'true') ? true : false;
			// 如果修改为默认币种 则其他的默认币种设为false
			if(obj.is_defCoin === true && obj.is_defCoin != Coin.is_defCoin) {
				const defExist = await CoinDB.findOne({is_defCoin: true, Firm});
				if(defExist) return MdFilter.jsonFailed(res, {message: defExist.code+' 币种, 为default. 请将其取消'});
			}
			Coin.is_defCoin = obj.is_defCoin;
		}

		const _object = _.extend(Coin, obj);

		const objSave = await _object.save();
		return MdFilter.jsonSuccess(res, {message: "CoinPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CoinPut", error});
	}
}
exports.CoinDelete = async(req, res) => {
	console.log("/CoinDelete");
	try {
		const payload = req.payload;
		let Firm = payload.Firm;
		if(Firm._id) Firm = Firm._id;

		const id = req.params.id;		// 所要更改的Coin的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {status: "请传递正确的数据_id"});
		const Coin = await CoinDB.findOne({_id: id, Firm});
		if(!Coin) return MdFilter.jsonFailed(res, {status: "没有找到此币种"});

		const Paidtype = await PaidtypeDB.findOne({Coin: id});
		if(Paidtype) return MdFilter.jsonFailed(res, {message: "请先删除币种中的商店"});

		if(Coin.img_url && Coin.img_url.split("Coin").length > 1) await MdFiles.rmPicture(Coin.img_url);
		const objDel = await CoinDB.deleteOne({_id: id});
		return MdFilter.jsonSuccess(res, {message: "CoinDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "CoinDelete", error});
	}
}







const dbCoin = 'Coin';
exports.Coins = async(req, res) => {
	console.log("/Coins");
	try {
		const dbs_res = await GetDB.dbs(obtFilterObj(req));
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Coins", error});
	}
}

exports.Coin = async(req, res) => {
	console.log("/Coin");
	try {
		const db_res = await GetDB.db(obtFilterObj(req, req.params.id));
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Coin", error});
	}
}

const obtFilterObj = (req, id) => {
	const DB_filter =  {
		payload: req.payload,
		queryObj: req.query,

		objectDB: CoinDB,
		path_Callback: Coin_path_Func,
		dbName: dbCoin,
	};
	if(id) DB_filter.id = id;

	return DB_filter;
}


const Coin_path_Func = (pathObj, payload, queryObj) => {
	pathObj.Firm = payload.Firm._id || payload.Firm;
	if(!queryObj) return;
}