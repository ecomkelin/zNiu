const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));

exports.limitSelect = (dbName, payload) => {
	if(!dbName) return [];
	if(dbName === 'User') return ['refreshToken', 'pwd'];
	if(dbName === 'Shop') {
		if(payload.role != ConfUser.role_set.boss) return ['strip'];
		return [];
	}
	return [];
}

exports.limitPopulate = (popStr, payload) => {
	try{
		if(!popStr) return null;	// 如果 字符串 为空 则返回空
		const populate = JSON.parse(popStr);	// 获取 populate 对象
		recursivePop(populate, payload);		// 根据回调 筛选去掉不可返回的populate 中的 select
		return populate;
	} catch(e) {
		return null;				// 如果错误(主要是 JSON.parse 的错误) 则返回空
	}
}
const recursivePop = (pops, payload) => {
	if(pops instanceof Array) {	// 如果此 populate 是数组 则按数组对待
		for(let i=0; i<pops.length; i++) {
			limitFilter(pops[i], payload);
		}
	} else {	// 如果是一个对象 则按对象对待
		limitFilter(pops, payload);
	}
}
const limitFilter = (pop, payload) => {
	if(!pop.path) {	// 如果此对象下没有 path 则为其设置一个 path值 此path值不能在数据库名字 , 并且完成了
		pop.path = 'null';
	} else {	// 如果有 path 值 
		if(!pop.select) {	// 如果 没有 select 则为其设置基础值
			pop.select = '_id code nome';
		} else {	// 否则 进行筛选
			const limSels = this.limitSelect(pop.path, payload);	// 查看这个数据库中 是否有限制的字段
			if(limSels.length !== 0) {		// 如果有限制字段 则根据限制 设置select的值
				const fields = MdFilter.stringToArray(pop.select, ' ');
				const sels = MdFilter.ArrayDelElems(fields, limSels);
				pop.select = sels.join(' ');
			}
		}
		if(pop.populate) recursivePop(pop.populate, payload);
	}
}

const sortObj = {
	'User': {Shop: 1, role: 1, is_usable: -1, sort: -1, at_upd: -1, code: 1, nome: 1 },
	'Order': {at_crt: 1},
}
exports.sortDBs = (dbName) => {
	if(!dbName || !sortObj[dbName]) return null;
	return sortObj[dbName];
}