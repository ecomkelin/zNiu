const _ = require('underscore');

const path = require('path');
const StintAttr = require(path.resolve(process.cwd(), 'app/config/stint/StintAttr'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));
const SkuDB = require(path.resolve(process.cwd(), 'app/models/product/Sku'));
const AttrDB = require(path.resolve(process.cwd(), 'app/models/product/internal/Attr'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.AttrPost = async(req, res) => {
	console.log("/AttrPost");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!MdFilter.isObjectId(obj.Prod)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const Prod = await ProdDB.findOne({_id: obj.Prod, Firm: payload.Firm}, {Attrs: 1});
		if(!Prod) return MdFilter.jsonFailed(res, {message: "没有找到此商品信息"});

		const errorInfo = MdFilter.objMatchStint(StintAttr, obj, ['nome']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();

		const objSame = await AttrDB.findOne({Prod: obj.Prod, nome: obj.nome});
		if(objSame) return MdFilter.jsonFailed(res, {message: "此产品已有此属性"});

		if(!obj.options || obj.options.length == 0) return MdFilter.jsonFailed(res, {message: "请正确传输 新的商品属性值参数"});
		if(!(obj.options instanceof Array)) obj.options = MdFilter.stringToArray(obj.options);
		obj.options = MdFilter.toUpperArray(obj.options);
		obj.options = MdFilter.setArray(obj.options);

		obj.Firm = payload.Firm;
		obj.User_crt = payload._id;
		if(obj.sort) obj.sort = parseInt(obj.sort);

		const _object = new AttrDB(obj);
		const objSave = await _object.save();

		Prod.Attrs.push(objSave._id);
		const ProdSave = await Prod.save();
		return MdFilter.jsonSuccess(res, {message: 'AttrPost', data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "AttrPost", error});
	}
}




exports.AttrDelete = async(req, res) => {
	console.log("/AttrDelete");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const Attr = await AttrDB.findOne({_id: id, Firm: payload.Firm}, {nome: 1, Prod:1});
		if(!Attr) return MdFilter.jsonFailed(res, {message: "没有找到此规格信息"});

		const Sku = await SkuDB.findOne({attrs: { $elemMatch: {nome: Attr.nome}}});
		if(Sku) return MdFilter.jsonFailed(res, {message: "请先删除商品中对应该属性的Product"});

		const Prod = await ProdDB.findOne({_id: Attr.Prod, Firm: payload.Firm});
		if(!Prod) return MdFilter.jsonFailed(res, {message: "没有找到对应的 商品"});

		const index = MdFilter.indexOfArray(Prod.Attrs, id);
		Prod.Attrs.splice(index, 1);
		const objSave = await Prod.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "对应的 商品 保存错误"});

		const objDel = await AttrDB.deleteOne({_id: id});
		return MdFilter.jsonSuccess(res, {message: 'AttrDelete', data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "AttrDelete", error});
	}
}


exports.AttrPut = async(req, res) => {
	console.log("/AttrPut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const Attr = await AttrDB.findOne({_id: id, Firm: payload.Firm});
		if(!Attr) return MdFilter.jsonFailed(res, {message: "没有找到此规格信息"});
		
		if(req.body.general) {
			Attr_general(res, req.body.general, Attr);
		} else if(req.body.optionDelete) {
			Attr_optionDelete(res, req.body.optionDelete, Attr);
		} else if(req.body.optionPuts) {
			Attr_optionPut(res, req.body.optionPuts, Attr);
		} else if(req.body.optionPost) {
			Attr_optionPost(res, req.body.optionPost, Attr);
		} else {
			return MdFilter.jsonFailed(res, {message: '请检查传递的参数是否正确'});
		}

	} catch(error) {
		return MdFilter.json500(res, {message: "AttrPut", error});
	}
}
const Attr_optionPost = async(res, obj, Attr) => {
	console.log("/Attr_optionPost")
	try{
		if(!obj.options) return MdFilter.jsonFailed(res, {message: '请传递 options 属性值'});
		if(!(obj.options instanceof Array)) obj.options = MdFilter.stringToArray(obj.options);
		obj.options = MdFilter.toUpperArray(obj.options);
		if(!Attr.options) Attr.options = [];
		for(let i=0; i<obj.options.length; i++) {
			let option = obj.options[i];
			let j=0;
			for(; j<Attr.options.length; j++) {
				if(Attr.options.includes(option)) break;
			}
			if(j === Attr.options.length) Attr.options.push(String(option));
		}
		const object = await Attr.save();
		return MdFilter.jsonSuccess(res, {message: 'Attr_optionPost', data: {object: Attr}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Attr_optionPost", error});
	}
}
const Attr_optionPut = async(res, objs, Attr) => {
	console.log("/Attr_optionPut")
	try{
		for(let i=0; i<objs.length; i++) {
			const obj = objs[i];

			if(!obj.option) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
			// 新的 option 为 optionPut
			if(!obj.optionPut) obj.optionPut = obj.option;
			obj.option = obj.option.toUpperCase();	// 原option的值
			obj.optionPut = obj.optionPut.toUpperCase();	// 要修改的值

			const index = MdFilter.indexOfArray(Attr.options, obj.option);	// 获取原属性值的位置
			if(index < 0) return MdFilter.jsonFailed(res, {message: "要修改的产品属性值 不存在"});

			const options = [...Attr.options];

			if(obj.sort) {
				obj.sort = parseInt(obj.sort);
				if(isNaN(obj.sort)) obj.sort = index;
			} else {
				obj.sort = index;
			}

			if(obj.sort !== index) {
				options.splice(index, 1);
				options.splice(obj.sort, 0, obj.optionPut);
			} else {
				options[index] = obj.optionPut;
			}
			if(obj.optionPut !== obj.option) {
				console.log(options)
				console.log(obj.optionPut)
				if(options.includes(obj.optionPut)) return MdFilter.jsonFailed(res, {message: "此属性值中, 已有此值"});
				const option_UpdMany = await SkuDB.updateMany(
					{Prod: Attr.Prod, attrs: { $elemMatch: {nome: Attr.nome, option: obj.option}}},
					{ $set: { "attrs.$[elem].option" : obj.optionPut } },
					{ arrayFilters: [ { "elem.option": obj.option } ], "multi": true }
				)
			}
			Attr.options = options
		}
		// await AttrDB.updateOne({_id: Attr._id}, { options });
		const object = await Attr.save();
		return MdFilter.jsonSuccess(res, {message: 'Attr_optionPut', data: {object}});
	} catch(error) {
		console.log("/Attr_optionPut", error);
		return MdFilter.json500(res, {message: "Attr_optionPut", error});
	}
}
const Attr_optionDelete = async(res, obj, Attr) => {
	console.log("/Attr_optionDelete")
	try{
		if(!obj.options || obj.options.length == 0) return MdFilter.jsonFailed(res, {message: "请正确传输 请传递产品属性值"});
		if(!(obj.options instanceof Array)) obj.options = MdFilter.stringToArray(obj.options);
		obj.options = MdFilter.toUpperArray(obj.options);
		obj.options = MdFilter.setArray(obj.options);

		if(obj.options.length == Attr.options.length)  return MdFilter.jsonFailed(res, {message: "如果需要全部删除, 请删除属性"});

		const Sku = await SkuDB.findOne({
			Prod: Attr.Prod,
			attrs: { $elemMatch: {nome: Attr.nome, option: {$in: obj.options}}}
		});

		if(Sku) return MdFilter.jsonFailed(res, {message: `删除属性值时[${String(obj.options)}]中有值被[${Sku._id}]Sku在用`});

		for(let i=0; i<obj.options.length; i++) {
			const option = obj.options[i];
			const index = MdFilter.indexOfArray(Attr.options, option);
			if(index >= 0) {
				Attr.options.splice(index, 1);
			}
		}
		const object = await Attr.save();
		return MdFilter.jsonSuccess(res, {message: 'Attr_optionDelete', data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Attr_optionDelete"});
	}
}
const Attr_general = async(res, obj, Attr) => {
	console.log("/Attr_general")
	try{
		if(obj.nome) {
			obj.nome = obj.nome.replace(/^\s*/g,"").toUpperCase();
			if(obj.nome !== Attr.nome) {
				const errorInfo = MdFilter.objMatchStint(StintAttr, obj, ['nome']);
				if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});

				const objSame = await AttrDB.findOne({_id: {$ne: Attr._id}, Prod: obj.Prod, nome: obj.nome});
				if(objSame) return MdFilter.jsonFailed(res, {message: "此产品已有此属性"});

				const Sku_Upd_nome = await SkuDB.updateMany(
					{Prod: Attr.Prod, attrs: { $elemMatch: {nome: Attr.nome}}},
					{ $set: { "attrs.$[elem].nome" : obj.nome } },
					{ arrayFilters: [ { "elem.nome": Attr.nome } ] }
				);

				Attr.nome = obj.nome;
			}
		}
		if(obj.sort && !isNaN(parseInt(obj.sort))) {
			Attr.sort = parseInt(obj.sort);
		}
		const object = await Attr.save();
		return MdFilter.jsonSuccess(res, {message: 'Attr_general', data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "Attr_general", error});
	}
}



















const Attr_path_Func = (pathObj, payload, queryObj) => {
	if(payload) {
		pathObj.Firm = payload.Firm;
	}
	if(!queryObj) return;
	pathObj.Prod = queryObj.Prod;
}
const dbAttr = 'Attr'

exports.Attrs = async(req, res) => {
	console.log("/Attrs");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: AttrDB,
			path_Callback: Attr_path_Func,
			dbName: dbAttr,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Attrs"});
	}
}


exports.Attr = async(req, res) => {
	console.log("/Attr");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: AttrDB,
			path_Callback: Attr_path_Func,
			dbName: dbAttr,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Attr"});
	}
}