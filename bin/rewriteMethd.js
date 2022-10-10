/**
 * 简单数组的 倒序
 * EX: arr.sort(ArrayReverse);
 */
ArrayReverse = (m,n) => m>=n ? -1 : 1;

/**
 * 数组排序
 * {String} field 根据哪个属性排序
 * { -1 } flag 如果不是-1 那么就为升序 否则为降序
 * returns 1 / -1
 * EX: arr.sort(ArrayObjSort("field"[, -1]))
 */        
ArrayObjSort = (field, flag=1) => { //这是比较函数
	if(flag !== -1) flag = 1;
    return (m,n) =>{
        var a = m[field];
        var b = n[field];
        return a>=b ? 1*flag : -1*flag;
    }
}


let objs1 = [{_id: 1, code: "001"}, {_id: 2, code: "002"}];
let objs2 = [{_id: 1, code: "001"}, {_id: 2, code: "002"}];
let objs3 = [{_id: 2, code: "002"}, {_id: 1, code: "001"}];
objs3.sort(ArrayObjSort("code"))
console.log(JSON.stringify(objs1))
console.log(222, objs1)
console.log(JSON.stringify(objs2))
console.log(JSON.stringify(objs3))
let isEq = JSON.stringify(objs1) === JSON.stringify(objs2);

ArrayCompare = (array, arr) => {
	if ( !(array instanceof Array) ) return false;
	if ( !(arr instanceof Array) ) return false;

	/** 判定为简单数组 */
	if (String(typeof(array[0])) === "object") return false;
	if (String(typeof(arr[0])) === "object") return false;

	array.sort();
	arr.sort();

	if(JSON.stringify(array) === JSON.stringify(arr)) true;
	return false;

}
ArrayElemCompare = (array, arr) => {
	if ( !(array instanceof Array) ) return false;
	if ( !(arr instanceof Array) ) return false;

	/** 判定为对象数组 */
	if (String(typeof(array[0])) !== "object") return false;
	if (String(typeof(arr[0])) !== "object") return false;

	let diff = array.length - arr.length;
	if(diff < 0) diff = -diff;

	array.sort();
	arr.sort();

	if(JSON.stringify(array) === JSON.stringify(arr)) true;
	return false;
}





/**
 * 删除数组对象 中 对象的 field
 * EX:
 */
ArrayObjDelField = (array, field) => { //这是比较函数
	if(!field) return false;
	if (String(typeof(field)) === "object") return false;
	if ( !(array instanceof Array) ) return false;

	for(let i=0; i<array.length; i++) {
		delete array[i][field];
	}
	return array;
}

ArrayDeleteOneElem = (array, elem, is_strict) => {
	if(!elem) return false;
	if (String(typeof(elem)) === "object") return false;
	if ( !(array instanceof Array) ) return false;

	let i = 0;
	for(; i<array.length; i++) {
		let arrTemp = array[i];
		if(is_strict) {
			if(arrTemp === elem) break;
		} else {
			if(arrTemp == elem) break;
		}
	}
	array.splice(i, 1);
	return array;
}

ArrayDeleteManyElem = (array, elem, is_strict) => {
	if(!elem) return false;
	if (String(typeof(elem)) === "object") return false;
	if ( !(array instanceof Array) ) return false;

	let ids = [];
	array.map((val, i) => {
		if(is_strict) {
			if(val === elem) ids.unshift(i);
		} else {
			if(val == elem) ids.unshift(i);
		}
	});
	for(i in ids) {
		array.splice(ids[i], 1);
	}
	return array;
}

ArrayDeleteOneObj = (array, field, val, is_strict) => {
	if (String(typeof(val)) === "object") return false;
	if ( !(array instanceof Array) ) return false;

	let i = 0;
	for(;i<array.length; i++) {
		let arrTemp = array[i];
		if(is_strict) {
			if(arrTemp[field] === val) break;
		} else {
			if(arrTemp[field] == val) break;
		}
	}
	array.splice(i, 1);
	return array;
}