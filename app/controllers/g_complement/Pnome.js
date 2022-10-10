const _ = require('underscore');
const path = require('path');

const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const PnomeDB = require(path.resolve(process.cwd(), 'app/models/complement/Pnome'));

const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));


exports.PnomePlus_prom = (payload, code) => new Promise(async(resolve, reject) => {
	try {
		if(code && payload.Firm) {
			let Firm = payload.Firm;
			if(Firm._id) Firm = Firm._id;

			code = code.replace(/^\s*/g,"").toUpperCase();
			if(code) {
				let Pnome = await PnomeDB.findOne({code, Firm});
				if(!Pnome) {
					const _object = new PnomeDB({code, sort: 1, Firm});
					_object.save();
				} else {
					Pnome.sort += 1;
					Pnome.save(); 
				}
			}
			return resolve();
		}
	} catch(e) {
		return reject(e);
	}
});
exports.PnomeMenus_prom = (payload, code) => new Promise(async(resolve, reject) => {
	try {
		if(code && payload.Firm) {
			let Firm = payload.Firm;
			if(Firm._id) Firm = Firm._id;
			code = code.replace(/^\s*/g,"").toUpperCase();
			if(code) {
				let Pnome = await PnomeDB.findOne({code, Firm});
				if(Pnome) {
					Pnome.sort -= 1;
					if(Pnome.sort > 0) {
						Pnome.save();
					} else {
						PnomeDB.deleteOne({_id: Pnome._id});
					}
				}
			}
			return resolve();
		}
	} catch(e) {
		return reject(e);
	}
});




const dbPnome = 'Pnome';
exports.Pnomes = async(req, res) => {
	console.log("/Pnomes");
	try {
		const payload = req.payload || req.ip;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: PnomeDB,
			path_Callback: null,
			dbName: dbPnome,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Pnomes", error});
	}
}