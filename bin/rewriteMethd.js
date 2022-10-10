ArrayDeleteManyElem = (array, elem, is_strict) => {
	if(!elem) return -1;
	if (String(typeof(elem)) === "object") return -1;
	if ( !(array instanceof Array) ) return -1;

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