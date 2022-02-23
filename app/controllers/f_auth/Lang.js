/*
	[语言]数据库 谨慎添加 删除. 容易添加 删除时要考虑到所有用语言的数据库
*/
const _ = require('underscore');

const path = require('path');
const LangDB = require(path.resolve(process.cwd(), 'app/models/auth/Lang'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));

exports.Langs = async(req, res) => {
	console.log("/Langs");
	try{
		const payload = req.payload;
		const Langs = await LangDB.find({Firm: payload.Firm})
			.populate("langs.Lang")
			.sort({"sort": -1, "updAt": -1});
		// Langs.forEach((item) => {console.log("/Langs", item); });
		// return res.render("./user/ower/lang/list", {title: "语言管理", Langs});
		return MdFilter.jsonSuccess(res, {data: {Langs}});
	} catch(error) {
		console.log("/Langs", error);
		return MdFilter.json500(res, {message: "[服务器错误: Langs]"});
	}
}

exports.LangPost = async(req, res) => {
	console.log("/LangPost");
	try{
		const payload = req.payload;
		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();
		if(obj.code.length !== 2) return MdFilter.jsonFailed(res, {message: '语言编号为2位 如IT CN EN'});
		if(!obj.langs[0].nome) return MdFilter.jsonFailed(res, {message: '没有填写语言名称'});
		obj.langs.forEach((lang) => {
			if(!lang.nome) lang.nome = '*';
		})
		const objSame = await LangDB.findOne({code: obj.code, Firm: payload.Firm});
		if(objSame) return MdFilter.jsonFailed(res, {message: '语言编号相同'});
		const _object = new LangDB(obj);
		const objSave = await _object.save();
		const Langs = await LangDB.find({_id: {"$ne": objSave._id}, Firm: payload.Firm})
			.sort({"sort": -1, "updAt": -1});
		for(let i=0; i<Langs.length; i++) {
			const Lang = Langs[i];
			Lang.langs.push({Lang: objSave._id, nome: '*'});
			await Lang.save();
		}
		return MdFilter.jsonSuccess(res, {message: "创建新成功"});
	} catch(error) {
		console.log("/LangPost", error);
		return MdFilter.json500(res, {message: "[服务器错误: LangPost]"});
	}
}

exports.LangPut = async(req, res) => {
	console.log("/LangPut");
	try{
		const payload = req.payload;
		const id = req.params.id;		// 所要更改的Lang的id

		const Lang = await LangDB.findOne({_id: id, Firm: payload.Firm});
		if(!Lang) return MdFilter.jsonFailed(res, {message: "没有找到此语言信息, 请刷新重试"});

		const field = req.body.field;	// 要改变的 key
		let val = String(req.body.val).replace(/^\s*/g,"").toUpperCase();		// 数据的值
		
		if(field == "nome") {
			if(val.length < 1) val = '*';
			const lang = Lang.langs.find((item) => {
				return String(item._id) == String(req.body.subid);
			});
			lang.nome = val;
		} else {
			if(field == "code") {
				if(val.length < 2) return MdFilter.jsonFailed(res, {message: "国家编号错误"});
				const objSame = await LangDB.findOne({code: val});
				if(objSame) return MdFilter.jsonFailed(res, {message: "有相同的编号"});
			}
			Lang[field] = val;
		}

		const objSave = await Lang.save();
		return MdFilter.jsonSuccess(res, {status: 200});
	} catch(error) {
		console.log("/LangPut", error);
		return MdFilter.json500(res, {message: error});
	}
}