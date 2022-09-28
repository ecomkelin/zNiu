module.exports = {
	code: {regexp: '^[a-zA-Z0-9]*$', min: 2, max: 4,  errMsg: {
		nullMsg: '供应商编号不能为空',
		regexpMsg: '供应商编号只能由字母或数字组成',
		minMsg: '供应商编号的位数不能小于: ',
		maxMsg: '供应商编号的位数不能大于: '
	}},
	nome: {min: 1, max: 20, errMsg: {
		nullMsg: '供应商名称不能为空',
		minMsg: '供应商名称的位数不能小于: ',
		maxMsg: '供应商名称的位数不能大于: '
	}}
}