const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const ShopDB = require(path.resolve(process.cwd(), 'app/models/auth/Shop'));
const ReserveDB = require(path.resolve(process.cwd(), 'app/models/order/Reserve'));
const TableDB = require(path.resolve(process.cwd(), 'app/models/order/Table'));
const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));

exports.ReservePost = async(req, res) => {
	console.log("/ReservePost");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		// 判断 基本参数 是否正确
		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的obj数据"});

		obj.Firm = payload.Firm;
		if(!payload.Shop) return MdFilter.jsonFailed(res, {message: "您的个人信息错误 您的payload.Shop不存在"});
		obj.Shop = payload.Shop;

		if(!obj.Client) obj.Client = null;

		if(!obj.at_arrive) return MdFilter.jsonFailed(res, {message: "请填写预约的日期时间"});
		obj.at_arrive = Number(new Date(obj.at_arrive));
		if(isNaN(obj.at_arrive)) return MdFilter.jsonFailed(res, {message: "预约日期时间的格式错误"});

		if(obj.at_start) {
			obj.at_start = Number(new Date(obj.at_start));
			if(isNaN(obj.at_start)) return MdFilter.jsonFailed(res, {message: "预约日期时间开始的格式错误"});
			if(obj.at_arrive - obj.at_start < 0) return MdFilter.jsonFailed(res, {message: "预约日期时间开始，不可在预约时间之后"});
		} else {
			obj.at_start = obj.at_arrive - 2*60*60*1000;
		}

		if(!obj.at_end) {
			obj.at_end = Number(new Date(obj.at_end));
			if(isNaN(obj.at_end)) return MdFilter.jsonFailed(res, {message: "预约日期时间结束的格式错误"});
			if(obj.at_end - obj.at_arrive < 30*60*1000) return MdFilter.jsonFailed(res, {message: "预约日期时间结束至少要在预约时间的半小时后"});
		} else {
			obj.at_end = obj.at_arrive + 2*60*60*1000;
		}

		// 基本信息赋值
		if(obj.nome) obj.nome = obj.nome.replace(/^\s*/g,"");
		if(!obj.nome) return MdFilter.jsonFailed(res, {message: "请输入预约人姓名"});

		obj.num_person = parseInt(obj.num_person);
		if(isNaN(obj.num_person)) return MdFilter.jsonFailed(res, {message: "请输入预约成人数"});
		obj.num_baby = parseInt(obj.num_baby) || 0;

		const Shop = await ShopDB.findOne({_id: payload._id});
		const Reserves = await ReserveDB.find({
			at_start: {"$lte": obj.at_end},
			at_end: {"$gte": obj.at_start},
		})
		if(Reserves && Reserves.length > 0) {
			const tot_reserves = Reserves.reduce((crTotal, item) => {
				let num_post = 0;
				if(!isNaN(item.num_post)) num_post = item.num_post;
				return num_post + crTotal;
			}, 0);
			if(tot_reserves > Shop.tot_reserves) return MdFilter.jsonFailed(res, {message: "此时间段，预定总人数超出店铺预定人数"});
		}
		obj.User_upd = obj.User_crt = payload._id;

		const _Reserve = new ReserveDB(obj);

		let Table = null;
		if(obj.Table) {
			if(!MdFilter.isObjectId(obj.Table)) return MdFilter.jsonFailed(res, {message: "请传递正确Table_id"});
			Table = await TableDB.findOne({_id: obj.Table, Shop: obj.Shop, is_usable: true})
				.populate({path: "Reserves"});
			if(!Table) return MdFilter.jsonFailed(res, {message: "没有找到此餐桌"});
			if(!Table.Reserves) Table.Reserves = [];
			if(Table.Reserves.length > 0) {
				for(let i=0; i<Table.Reserves.length; i++) {
					const rsv = Table.Reserves[i];
					if(rsv.at_start < obj.at_end && rsv.at_end > obj.at_start) return MdFilter.jsonFailed(res, {message: "此桌已有顶参"});
				}
			}
			Table.Reserves.push(_Reserve._id);
			_Reserve.Table = Table._id;
		} else {
			_Reserve.Table = null;
		}


		const objSave = await _Reserve.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "预定数据库保存错误"});
		if(Table) {
			const tableSave = await Table.save();
		}
		return MdFilter.jsonSuccess(res, {data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "ReservePost", error});
	}
}

exports.ReservePut = async(req, res) => {
	console.log("/ReservePut");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Reserve的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Reserve = await ReserveDB.findOne({_id: id, Shop: payload.Shop});
		if(!Reserve) return MdFilter.jsonFailed(res, {message: "没有找到此Reserve信息"});

		if(obj.at_arrive) {
			obj.at_arrive = Number(new Date(obj.at_arrive));
			if(isNaN(obj.at_arrive)) return MdFilter.jsonFailed(res, {message: "预约日期时间的格式错误"});
			Reserve.at_arrive = obj.at_arrive;
		}

		if(obj.at_start) {
			obj.at_start = Number(new Date(obj.at_start));
			if(isNaN(obj.at_start)) return MdFilter.jsonFailed(res, {message: "预约日期时间开始的格式错误"});
			if(obj.at_arrive - obj.at_start < 0) return MdFilter.jsonFailed(res, {message: "预约日期时间开始 不可在预约时间之后"});
			Reserve.at_start = obj.at_start;
		}

		if(!obj.at_end) {
			obj.at_end = Number(new Date(obj.at_end));
			if(isNaN(obj.at_end)) return MdFilter.jsonFailed(res, {message: "预约日期时间结束的格式错误"});
			if(obj.at_end - obj.at_arrive < 30*60*1000) return MdFilter.jsonFailed(res, {message: "预约日期时间结束至少要在预约时间的半小时后"});
			Reserve.at_end = obj.at_end;
		}

		if(obj.nome) {
			obj.nome = obj.nome.replace(/^\s*/g,"");
			if(!obj.nome) return MdFilter.jsonFailed(res, {message: "请输入预约人姓名"});
			Reserve.nome = obj.nome;
		}

		if(obj.num_person) {
			obj.num_person = parseInt(obj.num_person);
			if(isNaN(obj.num_person)) return MdFilter.jsonFailed(res, {message: "请输入预约成人数"});
			Reserve.num_person = obj.num_person;
		}
		if(obj.num_baby) {
			obj.num_baby = parseInt(obj.num_baby);
			if(isNaN(obj.num_baby)) return MdFilter.jsonFailed(res, {message: "请输入预约小孩数"});
			Reserve.num_baby = obj.num_baby;
		}

		const Shop = await ShopDB.findOne({_id: payload._id});
		const Reserves = await ReserveDB.find({
			at_start: {"$lte": obj.at_end},
			at_end: {"$gte": obj.at_start},
			_id: {"$ne": id},
		})
		if(Reserves && Reserves.length > 0) {
			const tot_reserves = Reserves.reduce((crTotal, item) => {
				let num_post = 0;
				if(!isNaN(item.num_post)) num_post = item.num_post;
				return num_post + crTotal;
			}, 0);
			if(tot_reserves > Shop.tot_reserves) return MdFilter.jsonFailed(res, {message: "此时间段，预定总人数超出店铺预定人数"});
		}
		Reserve.User_upd = payload._id;

		let org_Table = null;
		let Table = null;
		if(obj.Table) {
			if(!MdFilter.isObjectId(obj.Table)) return MdFilter.jsonFailed(res, {message: "请传递正确Table_id"});
			if(obj.Table != String(Reserve.Table)) {
				org_Table = await TableDB.findOne({_id: Reserve.Table});
				if(org_Table) {
					const index = MdFilter.indexOfArray(org_Table.Reserves, id);
					if(index >= 0) org_Table.Reserves.splice(index, 1);
				}
				Table = await TableDB.findOne({_id: obj.Table, Shop: obj.Shop, is_usable: true})
					.populate({path: "Reserves"});
				if(!Table) return MdFilter.jsonFailed(res, {message: "没有找到此餐桌"});
				if(!Table.Reserves) Table.Reserves = [];
				if(Table.Reserves.length > 0) {
					for(let i=0; i<Table.Reserves.length; i++) {
						const rsv = Table.Reserves[i];
						if(rsv.at_start < obj.at_end && rsv.at_end > obj.at_start) return MdFilter.jsonFailed(res, {message: "此桌已有顶参"});
					}
				}
				Table.Reserves.push(Reserve._id);
				Reserve.Table = Table._id;
			}
		}

		const objSave = await Reserve.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "预定数据库保存错误"});
		if(org_Table) {
			const org_Table_Save = await org_Table.save();
		}
		if(Table) {
			const Table_Save = await Table.save();
		}

		return MdFilter.jsonSuccess(res, {message: "ReservePut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "ReservePut", error});
	}
}

exports.ReserveDelete = async(req, res) => {
	console.log("/ReserveDelete");
	try{
		const payload = req.payload;
		if(MdSafe.fq_spanTimes1_Func(payload._id)) return MdFilter.jsonFailed(res, {message: "您刷新太过频繁"});

		const id = req.params.id;		// 所要更改的Reserve的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

		const Reserve = await ReserveDB.findOne({_id: id, Shop: payload.Shop});
		if(!Reserve) return MdFilter.jsonFailed(res, {message: "没有找到此预定信息请刷新重试"});

		if(Reserve.Table) {
			const org_Table = await TableDB.findOne({_id: Reserve.Table});
			if(org_Table) {
				const index = MdFilter.indexOfArray(org_Table.Reserves, id);
				if(index >= 0) org_Table.Reserves.splice(index, 1);
				const org_Table_Save = await org_Table.save();
				if(!org_Table_Save) return MdFilter.jsonFailed(res, {message: "org_Table_Save保存错误"});
			}
		}

		const objDel = await ReserveDB.deleteOne({_id: id});

		return MdFilter.jsonSuccess(res, {message: "ReserveDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "ReserveDelete", error});
	}
}







const Reserve_path_Func = (pathObj, payload, queryObj) => {
	pathObj.Firm = payload.Firm;
	if(payload.role >= ConfUser.role_set.pter) {
		pathObj.Shop = payload.Shop;
	}

	if(!queryObj) return;
	if(queryObj.status) {
		const arrs = MdFilter.stringToArray(queryObj.status);
		// if(arrs.length > 0) pathObj.status["$in"] = arrs;
		if(arrs.length > 0) pathObj.status = {"$in": arrs};
	}
	if(queryObj.Clients && payload.role < ConfUser.role_set.pter) {
		const arrs = MdFilter.stringToArray(queryObj.Clients);
		if(arrs.length > 0) pathObj.Client = {"$in": arrs};
	}
	if(queryObj.Shops && payload.role < ConfUser.role_set.pter) {
		const arrs = MdFilter.stringToArray(queryObj.Shops);
		if(arrs.length > 0) pathObj.Shop = {"$in": arrs};
	}
}
const dbReserve = 'Reserve';
exports.Reserves = async(req, res) => {
	console.log("/Reserves");
	// console.log(req.query)
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: ReserveDB,
			path_Callback: Reserve_path_Func,
			dbName: dbReserve,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Reserves", error});
	}
}

exports.Reserve = async(req, res) => {
	console.log("/Reserve");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: ReserveDB,
			path_Callback: Reserve_path_Func,
			dbName: dbReserve,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "Reserve", error});
	}
}