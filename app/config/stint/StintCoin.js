module.exports = {
	code: {regexp: '^[a-zA-Z]*$', trim: 3, errMsg: {
		nullMsg: '货币编号不能为空',
		regexpMsg: '货币编号只能由字母组成',
		trimMsg: '货币编号的长度只能为: ',
	}},
	nome: {min: 2, max: 20, errMsg: {
		nullMsg: '货币名称不能为空',
		minMsg: '货币名称的位数不能小于: ',
		maxMsg: '货币名称的位数不能大于: '
	}}
}