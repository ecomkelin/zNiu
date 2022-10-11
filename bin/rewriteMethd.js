/**
* 简单数组的 倒序
* EX: arr.sort(SortReverse);
*/
SortReverse = (m, n) => m >= n ? -1 : 1;


/**
 * 对象数组排序 sort()中的参数
 * @param {String} field 根据哪个属性排序
 * @param { -1 } flag 如果不是-1 那么就为升序 否则为降序
 * returns 1 / -1
 * EX: arr.sort(SortParam("field"[, -1]))
 */
SortParam = (field, flag = 1) => { //这是比较函数
	if (flag !== -1) flag = 1;
	return (m, n) => {
		var a = m[field];
		var b = n[field];
		return a >= b ? 1 * flag : -1 * flag;
	}
}




/**
 * 对象数组排序
 * @param {Array} array: 要排序的数组
 * @param {String} field: 根据 数组对象中的 指定属性 排序
 * @param {Number} flag: 枚举类型 [1, -1] 默认为1 升序 -1 为降序
 * @param {Boolean} is_strict: 如果严格排序的话 就把每个对象中的属性也排序整齐
 * 数据错误返回 -2
 * 注意 array 不会根据形参变化 最终结果 返回给array 才会真正的变化
 */
 sortArrayObj = (array, field, flag=1, is_strict) => {
	if (!(array instanceof Array)) return -2;

	/** field 检测 */
	if (!field) return -2;
	if (String(typeof (field)) === "object") return -2;
	field = String(field);  // 强行转为 String类型

	if(flag !== -1) flag = 1; // flag 赋值

	array.sort(SortParam(field, flag)); // 排序

	// 如果为严格模式
	if(is_strict) array = JSON.parse(JSON.stringify(array, Object.keys(array[0]).sort()));

	return array;
}
// let objs = [{_id: 2, code: "002"}, {code: "003", _id: 3}, {_id: 1, code: "001"}];
// let objj = sortArrayObj(objs, "_id", 1, true);
// console.log(objj)
// console.log(objs)





/**
 * 两个 数组 比较 是否相同
 * 如果相同返回 true 不相同返回 false 数据错误返回 -2
 */
isArraySame = (array, arr, field) => {
	if (!(array instanceof Array)) return -2;
	if (!(arr instanceof Array)) return -2;

	if(array.length !== arr.length) return false;   // 如果长度不同 肯定不相同

	/** field 检测 */
	if (!field) {
		/** 判定为简单数组 */
		if (String(typeof (array[0])) === "object") return -2;
		if (String(typeof (arr[0])) === "object") return -2;

		array.sort();
		arr.sort();
	} else {
		/** 判定为对象数组 */
		if (String(typeof (array[0])) !== "object") return -2;
		if (String(typeof (arr[0])) !== "object") return -2;

		if (String(typeof (field)) === "object") return -2;
		field = String(field);  // 强行转为 String类型

		array = sortArrayObj(array, field, 1, true);
		arr = sortArrayObj(arr, field, 1, true);
	}

	return JSON.stringify(array) === JSON.stringify(arr);
}




/**
 * 删除 对象数组 中 对象的 field
 * EX:
 */
ArrayObjDelField = (array, field) => {
	if (!(array instanceof Array)) return -2;    // array 数组检测

	/** field 检测 */
	if (!field) return -2;
	if (String(typeof (field)) === "object") return -2;
	field = String(field);  // 强行转为 String类型


	for (let i = 0; i < array.length; i++) {
		delete array[i][field];
	}
	return array;
}










/**
 * 获取 ids 服务于 ArrayDelChild 方法
 * @param {*} array 
 * @param {*} value 
 * @param {*} isRepeat 
 * @param {*} ids 
 */
const obtIds = (array, value, isRepeat, ids, field) => {
	let i = 0;
	for (; i < array.length; i++) {
		let val = field ? array[i][field] : array[i];
		if (val === value) {
			if (isRepeat) { // 重复删除
				if(!ids.includes(i)) ids.unshift(i); // 如果i还不存在 ids中, 因为如果ids中有两个相同的数 则错误
			} else {
				break;
			}
		} 
	}
	if(i !== array.length && !ids.includes(i)) ids.unshift(i);  // 不重复删除 每次删除一个
}
/**
 * 删除 简单数组 中的一个元素 或数组
 * @param {Array} array 要操作的数组
 * @param {Array} / {basic Type} values 要被删除的元素
 * @param {Boolean} isRepeat 是否重复的全部删除
 * EX: ["aa", "bb", "aa"] 删除 "aa" 后 为 ["bb", "aa"], 如果是重复删除 则结果为 ["bb"];
 */
ArrayDelChild = (array, values, isRepeat=true, field) => {
	if (!(array instanceof Array)) return -2;

	if (!values) return -2;
	let isArray = (values instanceof Array) ? true: false;    // values 是否为数组

	if (!isArray && String(typeof (values)) === "object") return -2;  // 如果不为数组 但为其他对象 则错误

	if(isRepeat !== true && isRepeat !== false) return -2;

	/** 如果有 field 检测 */
	if (field) {
		if (String(typeof (field)) === "object") return -2;
		field = String(field);  // 强行转为 String类型
	}

	let ids = [];
	if(isArray) {   // 如果 elems是数组
		for(k in values) {   
			value = values[k];// 为每一个要删除的元素遍历
			if (!field && String(typeof (value)) === "object") return -2;
			if (field && String(typeof (value)) !== "object") return -2;

			obtIds(array, value, isRepeat, ids, field);
		}
	} else {    // 如果elems 只是一个基本元素
		let value = values;
		if (!field && String(typeof (value)) === "object") return -2;
		if (field && String(typeof (value)) !== "object") return -2;

		obtIds(array, value, isRepeat, ids, field);
	}
	for (i in ids) {
		array.splice(ids[i], 1);
	}

	return array;
}