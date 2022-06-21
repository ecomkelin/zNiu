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

exports.PdDelete = async(req, res) => {
	console.log("/PdDelete")
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Pd的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据 _id"});

		const pathObj = {_id: id};
		Pd_path_Func(pathObj, payload);

		const Pd = await PdDB.findOne(pathObj);
		if(!Pd) return MdFilter.jsonFailed(res, {message: "没有找到此产品信息"});

		const Prod = await ProdDB.findOne({Pd: Pd._id});
		if(Prod) return MdFilter.jsonFailed(res, {message: "请先删除产品中的商品"});

		for(let i=0; i<Pd.img_urls.length; i++) {
			await MdFiles.rmPicture(Pd.img_urls[i]);
		}

		const objDel = await PdDB.deleteOne({_id: Pd._id});
		return MdFilter.jsonSuccess(res, {message: "PdDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "PdDelete", error});
	}
}

exports.PdPost = async(req, res) => {
	console.log("/PdPost");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});
		let obj = req.body.obj;
		if(!obj) {
			console.log('111, PdPost')
			res_PdImg = await MdFiles.PdImg_sm(req, "/Pd");
			console.log('222, res_PdImg', res_PdImg)
			if(res_PdImg.status !== 200) return MdFilter.jsonFailed(res, res_PdImg);
			obj = res_PdImg.data.obj;
		}
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});


		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
		const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['code', 'nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		const objSame = await PdDB.findOne({'code': obj.code, Firm: payload.Firm});
		if(objSame) return MdFilter.jsonFailed(res, {message: "产品编号相同"});


		if(isNaN(obj.weight)) obj.weight = parseFloat(obj.weight)

		if(isNaN(obj.price_regular)) return MdFilter.jsonFailed(res, {message: '商品标价要为数字'});
		obj.price_regular = parseFloat(obj.price_regular);

		if(isNaN(obj.price_sale)) return MdFilter.jsonFailed(res, {message: '商品卖价要为数字'});
		obj.price_sale = parseFloat(obj.price_sale);

		if(!MdFilter.isObjectId(obj.Brand)) obj.Brand = null;
		if(!MdFilter.isObjectId(obj.Nation)) obj.Nation = null;
		if(!MdFilter.isObjectId(obj.Categ)) obj.Categ = null;

		obj.Firm = payload.Firm;
		obj.User_crt = payload._id;
		const _object = new PdDB(obj);
		const objSave = await _object.save();

		return MdFilter.jsonSuccess(res, {message: "PdPost", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "PdPost", error});
	}
}

exports.PdPut = async(req, res) => {
	console.log("/PdPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Pd的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		Pd_path_Func(pathObj, payload);

		const Pd = await PdDB.findOne(pathObj);
		if(!Pd) return MdFilter.jsonFailed(res, {message: "没有找到此产品信息"});

		if(req.body.general) {
			Pd_general(res, req.body.general, Pd, payload);
		} else if(req.body.put_img_url) {
			Pd_put_img_url(res, req.body.put_img_url, Pd, payload);
		} else if(req.body.delete_img_urls) {
			Pd_delete_img_urls(res, req.body.delete_img_urls, Pd, payload);
		} else {
			// 判断是否用上传文件的形式 传递了数据
			res_PdImg = await MdFiles.PdImg_sm(req, "/Pd");
			if(res_PdImg.status !== 200) return MdFilter.jsonFailed(res, res_PdImg);
			obj = res_PdImg.data.obj;

			if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
			Pd_ImgPost(res, obj, Pd, payload);
		}
	} catch(error) {
		return MdFilter.json500(res, {message: "PdPut", error});
	}
}

const Pd_general = async(res, obj, Pd, payload) => {
	console.log("-Pd_general")
	try {
		if(obj.is_usable == 1 || obj.is_usable === true || obj.is_usable === 'true') Pd.is_usable = true;
		if(obj.is_usable == 0 || obj.is_usable === false || obj.is_usable === 'false') Pd.is_usable = false;

		if(obj.sort) {
			obj.sort = parseInt(obj.sort);
			if(!isNaN(obj.sort)) Pd.sort = obj.sort;
		}
		if(obj.desp) {
			Pd.desp = obj.desp;
		}

		const updManyProdObj = {};

		if(obj.price_regular) {
			obj.price_regular = parseFloat(obj.price_regular);
			if(!isNaN(obj.price_regular) && (Pd.price_regular !== obj.price_regular)) {
				Pd.price_regular = obj.price_regular;
				updManyProdObj.price_regular = obj.price_regular;
			}
		}
		if(obj.price_sale) {
			obj.price_sale = parseFloat(obj.price_sale);
			if(!isNaN(obj.price_sale) && (Pd.price_sale != obj.price_sale)) {
				if(obj.price_sale >= Pd.price_regular) obj.price_sale = Pd.price_regular;
				Pd.price_sale = obj.price_sale;
				updManyProdObj.price_sale = obj.price_sale;
			}
		}
		if(!Pd.price_sale) Pd.price_sale = Pd.price_regular;
		if(obj.force && (obj.force.price == 1 || obj.force.price === true || obj.force.price === 'true')) {
			const Sku_UpdMany = await SkuDB.updateMany(
				{Pd: Pd._id, Firm: payload.Firm},
				{price_regular: Pd.price_regular, price_sale: Pd.price_sale},
			);
		}

		if(obj.code) {
			obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();;	// 注意 Pd code 没有转大写
			if(obj.code && (obj.code != Pd.code)) {
				const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['code']);
				if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
				const objSame = await PdDB.findOne({'code': obj.code, Firm: payload.Firm});
				if(objSame) return MdFilter.jsonFailed(res, {message: "产品编号相同"});
				updManyProdObj.code = obj.code;
				Pd.code = obj.code;
			}
		}
		if(obj.nome) {
			obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
			const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['nome']);
			if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
			if(obj.nome != Pd.nome) {
				updManyProdObj.nome = obj.nome;
				Pd.nome = obj.nome;
			}
		}
		if(obj.nomeTR) {
			obj.nomeTR = obj.nomeTR.replace(/^\s*/g,"");	// 注意 Pd nomeTR 没有转大写
			if(obj.nomeTR != Pd.nomeTR) {
				updManyProdObj.nomeTR = obj.nomeTR;
				Pd.nomeTR = obj.nomeTR;
			}
		}

		if(obj.weight) {
			obj.weight = parseFloat(obj.weight);
			if(!isNaN(obj.weight) && (Pd.weight !== obj.weight)) {
				Pd.weight = obj.weight;
				updManyProdObj.weight = obj.weight;
			}
		}

		if(obj.unit) {
			obj.unit = obj.unit.replace(/^\s*/g,"");	// 注意 Pd unit 没有转大写
			if(obj.unit && (obj.unit != Pd.unit)) {
				updManyProdObj.unit = obj.unit;
				Pd.unit = obj.unit;
			}
		}

		if(obj.Nation && (obj.Nation != Pd.Nation)) {
			if(!MdFilter.isObjectId(obj.Nation)) return MdFilter.jsonFailed(res, {message: '国家数据需要为 _id 格式'});
			const Nation = await NationDB.findOne({_id: obj.Nation});
			if(!Nation) return MdFilter.jsonFailed(res, {message: '没有找到此国家信息'});
			updManyProdObj.Nation = obj.Nation;
			Pd.Nation = obj.Nation;
		}
		if(obj.Brand && (obj.Brand != Pd.Brand)) {
			if(!MdFilter.isObjectId(obj.Brand)) return MdFilter.jsonFailed(res, {message: '品牌数据需要为 _id 格式'});
			const Brand = await BrandDB.findOne({_id: obj.Brand});
			if(!Brand) return MdFilter.jsonFailed(res, {message: '没有找到此品牌信息'});
			updManyProdObj.Brand = obj.Brand;
			Pd.Brand = obj.Brand;
		}

		if(obj.Categ) {
			if(!MdFilter.isObjectId(obj.Categ)) return MdFilter.jsonFailed(res, {message: '请输入正确的分类'});
			if(String(obj.Categ) !== String(Pd.Categ) ) {
				const Categ = await CategDB.findOne({_id: obj.Categ, Firm: payload.Firm, level: 2});
				if(!Categ) return MdFilter.jsonFailed(res, {message: "您的二级分类不正确, 请输入正确的二级分类"});
				updManyProdObj.Categ = obj.Categ;
				Pd.Categ = obj.Categ;
			}
		}

		Pd.User_upd = payload._id;

		const objSave = await Pd.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "保存错误"});
		if(Object.keys(updManyProdObj).length != 0) {
			const Prod_UpdMany = await ProdDB.updateMany({Pd: Pd._id, Firm: payload.Firm}, updManyProdObj);
		}
		return MdFilter.jsonSuccess(res, {message: "Pd_general", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Pd_general", error});
	}
}

const Pd_delete_img_urls = async(res, obj, Pd, payload) => {
	console.log("-Pd_delete_img_urls")
	try{
		const img_urls = obj.img_urls
		if(!img_urls || img_urls.length == 0) return MdFilter.jsonFailed(res, {message: "请传递需要删除的图片名称"});
		let flag = 0;
		for(let i=0; i<img_urls.length; i++) {
			const index = MdFilter.indexOfArray(Pd.img_urls, img_urls[i]);
			// console.log("/PdPut_ImgDelete", img_urls[i])
			if(index >= 0) {
				flag = 1;
				Pd.img_urls.splice(index, 1);
				await MdFiles.rmPicture(img_urls[i]);
			}
		}
		if(flag == 0) return MdFilter.jsonFailed(res, {message: '您传递的数据与产品图片不匹配'});

		const ProdUpdMany = await ProdDB.updateMany({Pd: Pd._id}, {img_urls: Pd.img_urls});

		Pd.User_upd = payload._id;
		const objSave = await Pd.save();
		return MdFilter.jsonSuccess(res, {message: "Pd_delete_img_urls", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Pd_delete_img_urls", error});
	}
}
const Pd_put_img_url = async(res, obj, Pd, payload) => {
	console.log("-Pd_put_img_url")
	try{
		obj.sort = parseInt(obj.sort);
		const img_url = obj.img_url;
		if(!img_url || isNaN(obj.sort)) return MdFilter.jsonFailed(res, {message: "参数传递不正确"});

		const index = MdFilter.indexOfArray(Pd.img_urls, img_url);
		if(index < 0) return MdFilter.jsonFailed(res, {message: "没有此图片"});
		if(index == obj.sort) return MdFilter.jsonFailed(res, {message: "您没有改动位置"});
		Pd.img_urls.splice(index, 1);
		Pd.img_urls.splice(obj.sort, 0, img_url);

		const ProdUpdMany = await ProdDB.updateMany({Pd: Pd._id}, {img_urls: Pd.img_urls});

		const objSave = await Pd.save();
		return MdFilter.jsonSuccess(res, {message: "Pd_put_img_url", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Pd_put_img_url", error});
	}
}
const Pd_ImgPost = async(res, obj, Pd, payload) => {
	try {
		if(!obj.img_urls || obj.img_urls.length == 0) return MdFilter.jsonFailed(res, {message: "请传输图片"});
		obj.img_urls.forEach(img_url => {
			Pd.img_urls.push(img_url);
		})

		const ProdUpdMany = await ProdDB.updateMany({Pd: Pd._id}, {img_urls: Pd.img_urls});

		const objSave = await Pd.save();
		return MdFilter.jsonSuccess(res, {message: "Pd_ImgPost", data: {object: objSave, put_urls:obj.img_urls}, reference:{img_urls: obj.img_urls}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Pd_ImgPost", error});
	}
}












const Pd_path_Func = (pathObj, payload, queryObj) => {
	pathObj.Firm = payload.Firm;
	if(payload.role >= ConfUser.role_set.pter) {
		pathObj.is_usable = 1;
	}

	if(!queryObj) return;
	if(MdFilter.isObjectId(queryObj.Brand) ) pathObj["Brand"] = queryObj.Brand;
	if(MdFilter.isObjectId(queryObj.Nation) ) pathObj["Nation"] = queryObj.Nation;
	if(queryObj.Categs) {
		const ids = MdFilter.stringToObjectIds(queryObj.Categs);
		pathObj["Categ"] = {$in: ids};
	}
}


const dbPd = 'Pd';
exports.Pds = async(req, res) => {
	console.log("/Pds");
	try {
		const payload = req.payload || req.ip;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: PdDB,
			path_Callback: Pd_path_Func,
			dbName: dbPd,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Pds", Pds});
	}
}



exports.Pd = async(req, res) => {
	console.log("/Pd");
	try {
		const payload = req.payload || req.ip;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: PdDB,
			path_Callback: Pd_path_Func,
			dbName: dbPd,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Pd", error});
	}
}