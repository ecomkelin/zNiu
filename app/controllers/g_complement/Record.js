const _ = require('underscore');
const path = require('path');

const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const RecordDB = require(path.resolve(process.cwd(), 'app/models/complement/Record'));

const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));




const dbRecord = 'Record';
exports.Records = async(req, res) => {
	console.log("/Records");
	try {
		const payload = req.payload || req.ip;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: RecordDB,
			path_Callback: null,
			dbName: dbRecord,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Records", error});
	}
}