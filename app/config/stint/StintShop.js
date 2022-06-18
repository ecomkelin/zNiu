module.exports = {
	code: {regexp: '^[a-zA-Z0-9]*$', min: 2, max: 4,  errMsg: {
		nullMsg: '商铺编号不能为空',
		regexpMsg: '商铺编号只能由字母或数字组成',
		minMsg: '商铺编号的位数不能小于: ',
		maxMsg: '商铺编号的位数不能大于: '
	}},
	nome: {min: 2, max: 20, errMsg: {
		nullMsg: '商铺名称不能为空',
		minMsg: '商铺名称的位数不能小于: ',
		maxMsg: '商铺名称的位数不能大于: '
	}}
}