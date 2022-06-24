const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const MdSafe = require(path.resolve(process.cwd(), 'app/middle/MdSafe'));
const dbFilter = require(path.resolve(process.cwd(), 'app/config/dbFilter'));

exports.db = (GetDB_Filter) => {
	// console.log("/db")
	return new Promise(async(resolve) => {
		try{
			const {id, payload, queryObj, objectDB, path_Callback, dbName} = GetDB_Filter;
			if(MdSafe.fq_spanTimes1_Func((payload&&payload._id)?payload._id:payload)) resolve({status: 400, message: "您刷新太过频繁"});
			if(!id || !MdFilter.isObjectId(id)) resolve({status: 400, message: "请传递正确的数据 _id"});

			const pathObj = {_id: id};
			if(path_Callback) path_Callback(pathObj, payload, queryObj);
			const selectObj = MdFilter.select_Func(queryObj.selects, queryObj.selectVal, dbName, payload);

			const populateObjs = dbFilter.limitPopulate(queryObj.populateObjs, payload);

			// console.log("/db pathObj", pathObj);
			// console.log("/db populateObjs", populateObjs);
			const object = await objectDB.findOne(pathObj, selectObj)
				.populate(populateObjs);
			if(!object) resolve({status: 400, message: "没有找到数据"});
			return resolve({status: 200, message: `成功读取obj: [${dbName}]`, data: {object}});
		} catch(error) {
			console.log("[resolve GetDB.db]", error);
			return resolve({status: 400, message: "[resolve GetDB.db]"});
		}
	})
}

/*
	payload: 身份
	queryObj: 前端传递的参数
	objectDB: 传递的数据库模型
	path_Callback: function;
*/
exports.dbs = (GetDB_Filter) => {
	// console.log("/dbs");
	return new Promise(async(resolve) => {
		try{
			const {payload, queryObj, objectDB, path_Callback, dbName} = GetDB_Filter;
			if(MdSafe.fq_spanTimes1_Func((payload&&payload._id)?payload._id:payload)) resolve({status: 400, message: "您刷新太过频繁"});

			// 确定数据的页码和每夜条目数
			const {page, pagesize, skip} = MdFilter.page_Func(parseInt(queryObj.page), parseInt(queryObj.pagesize));

			// 过一遍整体 path
			const pathObj = MdFilter.path_Func(queryObj);
			// 再过一遍 特殊 path
			if(path_Callback) path_Callback(pathObj, payload, queryObj);

			const selectObj = MdFilter.select_Func(queryObj.selects, queryObj.selectVal, dbName, payload);

			const populateObjs = dbFilter.limitPopulate(queryObj.populateObjs, payload);
			// console.log("/dbs populateObjs", populateObjs);

			if(queryObj.sortKeys) queryObj.sortKey = queryObj.sortKeys[queryObj.sortKeys.length -1];
			if(queryObj.sortVals) queryObj.sortVal = queryObj.sortVals[queryObj.sortVals.length -1];
			const sortObj = MdFilter.sort_Func(queryObj.sortKey, parseInt(queryObj.sortVal), dbName);
			// console.log('dbs pathObj: ', pathObj)
			const count = await objectDB.countDocuments(pathObj);
			let objects = await objectDB.find(pathObj, selectObj)
				.skip(skip).limit(pagesize)
				.sort(sortObj)
				.populate(populateObjs);
			let object = null;
			let len_Objs = objects.length;
			if(len_Objs > 0 && queryObj.search) {
				pathObj.code = queryObj.search.replace(/(\s*$)/g, "").replace( /^\s*/, '').toUpperCase();
				object = await objectDB.findOne(pathObj, selectObj)
					.populate(populateObjs);
				if(object && object._id) {
					let i=0;
					for(;i<len_Objs; i++) {
						if(String(objects[i]._id) === String(object._id)) break;
					}
					if(i === len_Objs) i--;
					objects.splice(i, 1);
					objects.unshift(object);
				}
			}
			// console.log('obj', count)
			return resolve({status: 200, message: `成功读取objs: [${dbName}s]`, data: {count, page, pagesize, object, objects}, parameter: {pathObj, sortObj}});
		} catch(error) {
			console.log("[resolve GetDB.dbs]", error);
			return resolve({status: 400, message: "[resolve GetDB.dbs]"});
		}
	})
}