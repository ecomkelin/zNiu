const _ = require('underscore');
const path = require('path');

const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const PnomeDB = require(path.resolve(process.cwd(), 'app/models/complement/Pnome'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));


exports.PnomePlus_prom = (payload, code) => new Promise(async(resolve, reject) => {
	try {
		if(code && payload.Firm) {
			let Firm = payload.Firm;
			if(Firm._id) Firm = Firm._id;

			code = code.replace(/^\s*/g,"").toUpperCase();
			if(code) {
				let Pnome = await ProdDB.findOne({code, Firm});
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
				let Pnome = await ProdDB.findOne({code, Firm});
				if(Pnome) {
					Pnome.sort -= 1;
					if(Pnome.sort > 0) {
						Pnome.save();
					} else {
						ProdDB.deleteOne({_id: Pnome._id});
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



exports.PnomeRevise = async(req, res) => {
	try {
		const payload = req.payload;
		const Prods = await ProdDB.find({Firm: payload.Firm },{nome: 1});

		await PnomeDB.deleteMany({Firm: payload.Firm});

		setPnomes(req, res, Prods, 0)
		return MdFilter.jsonSuccess(res, {status: 200, message: "success"});
	} catch(e) {
		return MdFilter.json500(res, {message: "PnomeRevise", e});
	}
}
const setPnomes = async(req, res, Prods, n) => {
	try {
		if(n == Prods.length) return res.redirect('/bsNomes')

		let payload = req.payload;
		let Prod = Prods[n];

		// 如果Prod 没有名称就跳过
		if(!Prod.nome || Prod.nome.length == 0) return setPnomes(req, res, Prods, n+1);

		// 统一名称 如果名称不统一则修改产品名称并保存
		pnome = Prod.nome.replace(/\s+/g,"").toUpperCase();
		if(pnome != Prod.nome) {
			Prod.nome = pnome;
			await Prod.save();
		}

		const Pnome = await PnomeDB.findOne({'Firm': payload.Firm, 'code': pnome});
		if(Pnome) {
			Pnome.sort += 1;
			await Pnome.save()
		} else {
			let _Pnome = new PnomeDB();	// 创建nome
			_Pnome.code = pnome;
			_Pnome.sort = 1;
			_Pnome.Firm = payload.Firm;
			await _Pnome.save();
		}
		return setPnomes(req, res, Prods, n+1);

	} catch(e) {
		console.log("eeee:", e)
		return setPnomes(req, res, Prods, n+1);
	}
}









