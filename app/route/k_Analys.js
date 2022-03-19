const ObjectId = require('mongodb').ObjectId;

const path = require('path');
const MdAuth = require(path.resolve(process.cwd(), 'app/middle/MdAuth'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));

const OrderDB = require(path.resolve(process.cwd(), 'app/models/order/Order'));
const OrderProdDB = require(path.resolve(process.cwd(), 'app/models/order/OrderProd'));

module.exports = (app) => {
	app.post('/api/b1/analys', MdAuth.path_User, analys);
};

const analys = async(req, res) => {
	console.log("analys");
	try {
		const payload = req.payload;
		const objs = req.body.objs;

		const errMessage = [];
		const analys = [];
		for(let i=0; i<objs.length; i++) {
			const data = await objectDB.aggregate(getAggregate(objs[i], i, payload));
			analys.push(data);
		}

		return MdFilter.jsonSuccess(res, {status: 200, message: '分析成功', analys, errMessage});
	} catch(error) {
		return MdFilter.json500(res, {message: "Orders", error});
	}
}

const getAggregate = (obj, i, payload) => {
	const {dbName, is_native, aggregates, pipeline} = obj;
	/* 找到要分析的数据库 */
	const objectDB = get_DB(dbName);
	if(!objectDB) {
		const errMsg = `第${i}个objs 需要传递正确的 数据库名 您传递的dbName: ${dbName}`;
		errMessage.push(errMsg);
		return;
	}

	if(is_native === true) return aggregates; // 如果前端写了原生 就不用分析了

	const aggregateObjs = [];
	const {matchObj, field, is_interval, bucketObj, groupObj, sortObj} = pipeline;

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
	aggregateObjs.push({$match: match});

	if(is_interval)  {	// 分析区间 用 bucket
		const groupBy = field ? '$'+field : null;
		let {span, boundaries, df, outputs} = bucketObj;
		boundaries = path_boundaries(field, matchObj, span, boundaries);
		if(!boundaries) {
			const errMsg = `第${i}个objs 没有传递正确的 bucketObj.boundaries`;
			errMessage.push(errMsg);
			return;
		}
		if(!df) df = 'Other';
		const output = {count: {$sum: 1}};
		if(outputs && outputs.length > 0) {
			outputs.forEach(item => output[item] = {'$sum': item});
		}
		aggregateObjs.push({$bucket: {
			groupBy, 
			boundaries,
			default: df,
			output
		}});
	} else {		// 分析点 用 group
		const {is_join, joinDB, lookup_as, group_fields} = groupObj;
		const group = {_id: null, count: {$sum: 1}};
		if(field) {
			group._id = '$'+field;	// Paidtype
			if(is_join && joinDB) {
				const lookup = {
					from: joinDB,
					localField: field,
					foreignField: "_id",
					as: field,
				}
				if(lookup_as && Object.keys(lookup_as).length > 0) {
					lookup.pipeline = [
						{$project: lookup_as}
					]
				}
				aggregateObjs.push({$lookup: lookup});
			}
		}
		if(group_fields) group_fields.forEach(item => group[item] = {$sum: '$'+item});
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
		fields: [
			'Shop', 'Client', 'type_Order', 'Supplier', 'status',
			'is_hide_client', 'is_payAfter', 'type_ship', 'is_ship',
			'is_regular', 'is_sale', 'is_pass', 'is_paid', 
			'Paidtype', 'rate', 
			'at_crt', 
		],
	},
	"OrderProd": {
		db: OrderProdDB,
		fields: ['Client', 'Supplier', 'Prod', 'is_simple', 'Shop'],
	}
	// "Prod": ProdDB,
};
const get_DB = (dbName) => {
	if(!dbName) return null;
	const objectDB = dbs_obj[dbName].db;
}
const judge_field = (dbName, field) => {
	if(!field) return true;
	if(!dbs_obj[dbName].fields.includes(field)) return false;
}
const path_match = (dbName, match, payload) => {
	if(!match) match = {};
	match.Firm = payload.Firm;
	if(payload.Shop) match.Shop = payload.Shop;
	if(dbName === 'Order' || dbName === 'OrderProd') match.type_Order = (match.type_Order === 1) ? 1: -1;
	if(match.crt_after ) {
		let crt_after = new Date(match.crt_after).setHours(0,0,0,0);
		if(!isNaN(crt_after)) {
			(match["at_crt"]) ? (match["at_crt"]["$gte"] = crt_after) : (match["at_crt"] = {"$gte": crt_after})
		}
		delete match.crt_after;
	}
	if(match.crt_before) {
		let crt_before = (new Date(match.crt_before).setHours(23,59,59,999));
		if(!isNaN(crt_before)) {
			(match["at_crt"]) ? (match["at_crt"]["$lte"] = crt_before) : (match["at_crt"] = {"$lte": crt_before+24*60*60*1000})
		}
		delete match.crt_before;
	}
	return match;
}

const path_boundaries = (field, match, span, boundaries) => {
	if(field === 'at_crt') {
		if(!match.crt_after) return null;
		if(!span) span = 1;
		const start_at = (new Date(match.crt_after).setHours(0,0,0,0)).getTime();
		const ended_at = (match.crt_before) ? (new Date(match.crt_before).setHours(23,59,59,999)).getTime(): Date.now();
		boundaries = [];
		for(let time=start_at; time<ended_at; time+=1000*60*60*24*span) {
			boundaries.push(time);
		}
	}
	return boundaries;
}