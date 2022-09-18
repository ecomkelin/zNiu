const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const StepDB = require(path.resolve(process.cwd(), 'app/models/order/Step'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));



const Step_path_Func = (pathObj, payload, queryObj) => {
	if(payload.Firm) {
		pathObj.Firm = payload.Firm._id || payload.Firm;
		if(!payload.role) {
			pathObj.exist_Client = true;
		}
	}

	if(!queryObj) return;
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