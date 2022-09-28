const ObjectId = require('mongodb').ObjectId;
const moment = require('moment');

const path = require('path');
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));

const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));
const OrderProdDB = require(path.resolve(process.cwd(), 'app/models/order/OrderProd'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

module.exports = (app) => {
	app.post('/api/b1/analys', MdAuth.path_User, analys);
	app.post('/api/b1/ProdTotal', MdAuth.path_User, ProdTotal);
};
const ProdTotal = async(req, res) => {
	console.log("ProdTotal");
	try {
		const payload = req.payload;
		const total = await ProdDB.aggregate([
			// {$match: {Firm: Object("60c4a9adfc343a4d901a3566")}},
			{$group: {
			  	_id: null,
			  	count: {$sum: 1},
			  	quantity: {$sum: "$quantity"},
				price_cost: {$sum: {$multiply:["$price_cost","$quantity"]}},
				price_regular: {$sum: {$multiply:["$price_regular","$quantity"]}},
				price_sale: {$sum: {$multiply:["$price_sale","$quantity"]}}
			}},

		]);

		return MdFilter.jsonSuccess(res, {status: 200, message: '分析完成', total});
	} catch(error) {
		return MdFilter.json500(res, {message: "analys", error});
	}
}


const analys = async(req, res) => {
	console.log("analys");
	try {
		const payload = req.payload;
		const objs = req.body.objs || [];
		const errMessage = [];
		const analys = {};
		// console.log("objs", objs)
		for(let i=0; i<objs.length; i++) {
			/* 找到要分析的数据库 */
			const {key=i, dbName="Order", is_native, aggregates, pipeline} = objs[i];
			const objectDB = get_DB(dbName);
			if(!objectDB) {
				const errMsg = `第${i}个objs 需要传递正确的 数据库名 您传递的dbName: ${dbName}`;
				errMessage.push(errMsg);
				return;
			}

			let aggregateObjs;
			if(is_native === true) {	// 如果前端写了原生 就不用分析了
				aggregateObjs = aggregates;
			} else {
				aggregateObjs = getAggregate(i, dbName, pipeline, errMessage, payload);
				if(!aggregateObjs) continue;
			}
			// console.log("aggregateObjs", aggregateObjs)
			// console.log("boundaries", aggregateObjs[1]["$bucket"].boundaries)
			// console.log("output", aggregateObjs[1]["$bucket"].output)
			const data = await objectDB.aggregate(aggregateObjs);
			analys[key] = data;
		}

		return MdFilter.jsonSuccess(res, {status: 200, message: '分析完成', analys, errMessage});
	} catch(error) {
		return MdFilter.json500(res, {message: "analys", error});
	}
}

const getAggregate = (i, dbName, pipeline={}, errMessage, payload) => {	
	const aggregateObjs = [];

	const {matchObj, field, is_interval, sortObj} = pipeline;
	if(judge_field(dbName, field) === false) {
		const errMsg = `第${i}个objs ${dbName} 中, 没有 此 field: ${field}`;
		errMessage.push(errMsg);
		return;
	};

	const match = path_match(dbName, {...matchObj}, payload);
	Object.keys(match).forEach(item => {
		if(match[item].length === 24 && MdFilter.isObjectId(match[item])) {
			match[item] = ObjectId(match[item]);
		}
	});
	// console.log("match", match);
	aggregateObjs.push({$match: match});

	if(is_interval)  {	// 分析区间 用 bucket
		const {bucketObj} = pipeline;
		const groupBy = field ? '$'+field : null;
		// console.log("groupBy", groupBy)
		if(!bucketObj) {
			const errMsg = `第${i}个objs中 bucketObj: ${bucketObj}`;
			errMessage.push(errMsg);
			return;
		}
		const {is_at, outputs} = bucketObj;
		const boundaries = is_at ? path_boundaries(bucketObj) : bucketObj.splits;
		// console.log("boundaries", boundaries)
		if(!boundaries) {
			const errMsg = `第${i}个objs 没有传递正确的 bucketObj.boundaries`;
			errMessage.push(errMsg);
			return {};
		}

		const output = {count: {$sum: 1}};
		if(outputs && outputs.length > 0) {
			outputs.forEach(item => output[item] = {'$sum': item});
		}
		aggregateObjs.push({$bucket: {
			groupBy, 
			boundaries,
			default: bucketObj.df || "Other",
			output
		}});
	} else {		// 分析点 用 group
		const { groupObj={} } = pipeline;
		const {outputs} = groupObj;
		const group = {_id: null, count: {$sum: 1}};
		if(field) {
			group._id = '$'+field;	// Paidtype
			// console.log(field)
			const lookup = get_joinDB(dbName, field);
			if(lookup) aggregateObjs.push({$lookup: lookup});
		}
		if(outputs) outputs.forEach(item => group[item] = {$sum: '$'+item});
		aggregateObjs.push({$group: group});	
	}
	if(sortObj && Object.keys(sortObj).length > 0) {
		aggregateObjs.push({$sort: sortObj});
	}

	return aggregateObjs;
}











const dbs_obj = {
	"Order": {
		db: OrderDB,
		joinDB: 'orders',
		fields: [
			'Firm', 'Shop', 'Client', 'type_Order', 'Supplier', 'status',
			'is_hide_client', 'is_payAfter', 'type_ship', 'is_ship',
			'is_regular', 'is_sale', 'is_pass', 'is_paid', 
			'Paidtype', 'rate', 'symbol',
			'at_crt', 
		],
		lookupObj: {
			'Firm': 'firms',
			'Shop': 'shops',
			'Client': 'clients',
			'Supplier': 'suppliers',
			'Paidtype': 'paidtypes',
		}
	},
	"OrderProd": {
		db: OrderProdDB,
		joinDB: 'orderprods',
		fields: ['Firm', 'Shop', 'Client', 'Supplier', 'Prod', 'is_simple', 'Shop'],
		lookupObj: {
			'Shop': 'shops',
			'Client': 'clients',
			'Supplier': 'suppliers',
			'Prod': 'prods'
		}
	},
	"Prod": {
		db: ProdDB,
		joinDB: 'prods',
		fields: [
			'Shop', 'Brand', 'Nation', 'Categ',
			'price_regular', 'price_sale', 'price_cost',
			'is_discount'
		],
		lookupObj: {
			'Shop': 'shops',
			'Brand': 'brands',
			'Nation': 'nations',
			'Categ': 'categs',
		}
	}
};

const get_joinDB = (dbName, field) => {
	if(!dbName) return null;
	if(!dbs_obj[dbName]) return null;
	if(!dbs_obj[dbName]["lookupObj"]) return null;

	const from  = dbs_obj[dbName]["lookupObj"][field];
	if(!from) return null;

	const lookup = {};
	lookup.from = from;
	lookup.localField = field;
	lookup.foreignField = "_id";
	lookup.as = field;
	lookup.pipeline = [{$project: {code: 1, nome: 1, img_urls: 1, img_url: 1, img_xs: 1}} ];
	return lookup;
}
const get_DB = (dbName) => {
	if(!dbName) return null;
	if(!dbs_obj[dbName]) return null;
	return dbs_obj[dbName].db;
}

const judge_field = (dbName, field) => {
	if(!field) return true;
	return dbs_obj[dbName].fields.includes(field);
}
const path_match = (dbName, match={}, payload) => {
	match.Firm = payload.Firm;
	if(payload.Shop) match.Shop = payload.Shop._id;
	if(dbName === 'Order' || dbName === 'OrderProd') match.type_Order = (match.type_Order === 1) ? 1: -1;
	if(match.crt_after && match.crt_after.length > 8) {
		let crt_after = new Date(match.crt_after);
		if(!isNaN(crt_after)) {
			(match["at_crt"]) ? (match["at_crt"]["$gte"] = crt_after) : (match["at_crt"] = {"$gte": crt_after})
		}
	}
	delete match.crt_after;

	if(match.crt_before && match.crt_before.length > 8) {
		let crt_before = new Date((new Date(match.crt_before).setHours(23,59,59,999)));
		if(!isNaN(crt_before)) {
			(match["at_crt"]) ? (match["at_crt"]["$lte"] = crt_before) : (match["at_crt"] = {"$lte": crt_before+24*60*60*1000})
		}
	}
	delete match.crt_before;

	return match;
}

const path_boundaries = (bucketObj) => {
	const {splits, atObj={}} = bucketObj;
	const {start, ended, atUnit="D", span=1, times=30} = atObj;
	const boundaries=[];
	if(!start) {
		splits.forEach(item => boundaries.push(new Date(item)));
		return boundaries;
	}

	const ts_start = new Date(start).setHours(0,0,0,0);
	const ts_now = Date.now();
	for(let i=0; i<times; i++) {
		const ts_split = ts_start + 1000*60*60*24*span*i;
		boundaries.push(new Date(ts_split));
		if(ts_split > ts_now) break;
	}
	return boundaries;
}