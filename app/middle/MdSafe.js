let fq_st1_ids = [];
exports.fq_spanTimes1_Func = (uniqueIndex) => {
	spanTimes(uniqueIndex, 5000, 30)
}


const spanTimes = (uniqueIndex, max_timespan, max_times) => {
	let visiter = null;
	for(let i=0; i<fq_st1_ids.length; i++) {
		let timeSpan = Date.now() - fq_st1_ids[i].at_last;
		if(timeSpan > max_timespan){
			fq_st1_ids.splice(i, (fq_st1_ids.length - i));
			break;
		}
		if(String(uniqueIndex) === String(fq_st1_ids[i].uniqueIndex)) {
			visiter = fq_st1_ids[i];
			break;
		}
	}
	if(!visiter) {
		fq_st1_ids.unshift({
			at_last: Date.now(),
			uniqueIndex: uniqueIndex,
			times: 1
		})
	} else {
		if(visiter.times > max_times) {
			return true;
		} else {
			visiter.times++;
		}
	}
	return false;
}