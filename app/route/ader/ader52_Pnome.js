const AderIsLogin = require("./aderPath");

const path = require('path');

const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const PnomeDB = require(path.resolve(process.cwd(), 'app/models/complement/Pnome'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

module.exports = (app) => {

	app.get('/PnomeFixed', AderIsLogin, async(req, res) => {
		try {
			let curAder = req.session.curAder;
			let Firm = req.params.Firm_id;

			const Prods = await ProdDB.find({Firm},{nome: 1});

			await PnomeDB.deleteMany({Firm});

			setPnomes(req, res, Firm, Prods, 0)

			return res.redirect('/adShops');
		} catch(error) {
			return res.redirect('/?error=PnomeFixed,Error: '+error+'&reUrl=/adHome');
		}
	});

}

const setPnomes = async(req, res, Firm, Prods, n) => {
	try {
		if(n == Prods.length) return res.redirect('/bsNomes')

		let Prod = Prods[n];

		// 如果Prod 没有名称就跳过
		if(!Prod.nome || Prod.nome.length == 0) return setPnomes(req, res, Prods, n+1);

		// 统一名称 如果名称不统一则修改产品名称并保存
		pnome = Prod.nome.replace(/\s+/g,"").toUpperCase();
		if(pnome != Prod.nome) {
			Prod.nome = pnome;
			await Prod.save();
		}

		const Pnome = await PnomeDB.findOne({Firm, 'code': pnome});
		if(Pnome) {
			Pnome.sort += 1;
			await Pnome.save()
		} else {
			let _Pnome = new PnomeDB();	// 创建nome
			_Pnome.code = pnome;
			_Pnome.sort = 1;
			_Pnome.Firm = Firm;
			await _Pnome.save();
		}
		return setPnomes(req, res, Prods, n+1);

	} catch(e) {
		console.log("eeee:", e)
		return setPnomes(req, res, Prods, n+1);
	}
}