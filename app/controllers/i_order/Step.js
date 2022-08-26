const _ = require('underscore');

const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const StepDB = require(path.resolve(process.cwd(), 'app/models/order/Step'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.StepPost = async(req, res) => {
	console.log("/StepPost");
	try{
		const payload = req.payload;

		let obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!obj.code) obj.code = obj.nome;
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		let match = {$or:[{'code': obj.code}, {'nome': obj.nome}], Firm: payload.Firm};
		if(payload.Shop) match.Shop = payload.Shop;
		const objSame = await StepDB.findOne(match);
		if(objSame) return MdFilter.jsonFailed(res, {message: '品牌编号或名称相同'});


		obj.Firm = payload.Firm;
		if(payload.Shop) obj.Shop = payload.Shop;
		obj.User_crt = payload._id;
		const _object = new StepDB(obj);
		const objSave = await _object.save();

		return MdFilter.jsonSuccess(res, {message: "StepPost", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "StepPost", error});
	}
}

exports.StepDelete = async(req, res) => {
	console.log("/StepDelete");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Step的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const pathObj = {_id: id};
		Step_path_Func(pathObj, payload);

		const Step = await StepDB.findOne(pathObj);
		if(!Step) return MdFilter.jsonFailed(res, {message: "没有找到此品牌信息"});

		// console.log(Pd);
		if(Pd) return MdFilter.jsonFailed(res, {message: "请先删除品牌中的产品"});

		const objDel = await StepDB.deleteOne({_id: Step._id});
		return MdFilter.jsonSuccess(res, {message: "StepDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "StepDelete", error});
	}
}



exports.StepPut = async(req, res) => {
	console.log("/StepPut");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的Step的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});
		const pathObj = {_id: id};
		Step_path_Func(pathObj, payload);

		const Step = await StepDB.findOne(pathObj);
		if(!Step) return MdFilter.jsonFailed(res, {message: "没有找到此品牌信息"});

		let obj = req.body.general;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的数据obj对象数据"});

		if(!obj.code) obj.code = Step.code;
		if(!obj.nome) obj.nome = Step.nome;
		obj.code = obj.code.replace(/^\s*/g,"").toUpperCase();

		if(obj.code !== Step.code || obj.nome !== Step.nome) {
			let match = {_id: {$ne: Step._id}, $or:[{'code': obj.code}, {'nome': obj.nome}], Firm: payload.Firm};
			if(payload.Shop) match.Shop = payload.Shop;
			const objSame = await StepDB.findOne(match);
			if(objSame) return MdFilter.jsonFailed(res, {message: '此品牌编号已被占用, 请查看'});
		}

		obj.User_upd = payload._id;
		const _object = _.extend(Step, obj);

		const objSave = await Step.save();
		return MdFilter.jsonSuccess(res, {message: "StepPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "StepPut", error});
	}
}








const Step_path_Func = (pathObj, payload, queryObj) => {
	if(!queryObj) return;
	if(queryObj.Nations) {
		const ids = MdFilter.stringToObjectIds(queryObj.Nations);
		pathObj["Nation"] = {$in: ids};
	}
}

const dbStep = 'Step';
exports.Steps = async(req, res) => {
	console.log("/Steps");
	try {
		const payload = req.payload;
		let Shop = req.query.Shop;
		if(!MdFilter.isObjectId(Shop)) return MdFilter.jsonFailed(res, {message: "请传递Shop信息"});
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: StepDB,
			path_Callback: Step_path_Func,
			dbName: dbStep,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Steps", error});
	}
}

exports.Step = async(req, res) => {
	console.log("/Step");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: StepDB,
			path_Callback: Step_path_Func,
			dbName: dbStep,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Step", error});
	}
}