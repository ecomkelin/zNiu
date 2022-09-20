const AderIsLogin = require("./aderPath");

const _ = require('underscore')
const multipart = require('connect-multiparty')
const postForm = multipart();

const path = require('path');
const StintBrand = require(path.resolve(process.cwd(), 'app/config/stint/StintBrand'));
const StintPd = require(path.resolve(process.cwd(), 'app/config/stint/StintPd'));
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const NationDB = require(path.resolve(process.cwd(), 'app/models/address/Nation'));
const BrandDB = require(path.resolve(process.cwd(), 'app/models/complement/Brand'));
const CategDB = require(path.resolve(process.cwd(), 'app/models/complement/Categ'));
const PdDB = require(path.resolve(process.cwd(), 'app/models/product/Pd'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

module.exports = (app) => {
	let BP_Nations = null;
	app.post('/excel_Brand', AderIsLogin, postForm, async(req, res) => {
		console.log("Ader Brand excel");
		if(!BP_Nations) BP_Nations = await NationDB.find();
		try{
			const Firm = req.body.obj.Firm;
			const fileData = req.files.mulFile;
			if(!fileData) return res.redirect('/?error=!req.files.mulFile');

			const filePath = fileData.path;
			if(!filePath) return res.redirect('/?error=!filePath');

			const types = filePath.split('.');
			const type = types[types.length -1]
			if(type !== 'xlsx') return res.redirect('/?error=!xlsx');
			const excel = require('node-xlsx').parse(filePath)[0];
			const arrs = excel.data;
			for(let i=5; i<arrs.length; i++) {
				const arr = arrs[i];
				const obj = {};
				obj.code = String(arr[1]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				console.log("code", obj.code)
				obj.nome = String(arr[2]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				console.log("nome", obj.nome)
				if(obj.code === 'undefined' || obj.nome === 'undefined') continue;
				const errorInfo = MdFilter.objMatchStint(StintBrand, obj, ['code', 'nome']);
				if(errorInfo) {
					console.log(i+2, xuhao, errorInfo, obj.code);
					continue;
				}

				const objSame = await BrandDB.findOne({'code': obj.code, Firm});
				if(objSame) {
					console.log(i+2, xuhao, '已经有相同的编号', obj.code);
					continue;
				}
				obj.Firm = Firm;

				const NationCode = String(arr[3]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(NationCode.length === 2) {
					const Nation = BP_Nations.find(item => item.code === NationCode);
					if(Nation) obj.Nation = Nation._id;
				}

				const is_usable = String(arr[4]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(is_usable === '1') obj.is_usable = true;

				const img_url = String(arr[5]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(img_url !== "undefined") obj.img_url = '/upload/Brand/'+img_url;

				const _object = new BrandDB(obj);
				const objSave = await _object.save();
			}
			return res.redirect('/adHome');
		} catch(error) {
			console.log(error)
			return res.redirect('/?error=adUserDel,Error: '+error+'&reUrl=/adUsers');
		}
	});

	let P_Brands = null;
	let P_Categs = null;
	app.post('/excel_Pd', AderIsLogin, postForm, async(req, res) => {
		console.log("Ader Pd excel");
		try{
			const Firm = req.body.obj.Firm;

			if(!P_Brands) P_Brands = await BrandDB.find({Firm});
			if(!P_Categs) P_Categs = await CategDB.find({Firm});
			if(!BP_Nations) BP_Nations = await NationDB.find({Firm});

			const fileData = req.files.mulFile;
			if(!fileData) return res.redirect('/?error=!req.files.mulFile');

			const filePath = fileData.path;
			if(!filePath) return res.redirect('/?error=!filePath');

			const types = filePath.split('.');
			const type = types[types.length -1]
			if(type !== 'xlsx') return res.redirect('/?error=!xlsx');
			const excel = require('node-xlsx').parse(filePath)[0];
			const arrs = excel.data;
			for(let i=5; i<arrs.length; i++) {
				const arr = arrs[i];
				const obj = {};
				const xuhao = String(arr[0]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				obj.code = String(arr[1]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				obj.nome = String(arr[2]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(obj.code === 'undefined' || obj.nome === 'undefined') continue;
				const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['code', 'nome']);
				if(errorInfo) {
					console.log(i+2, xuhao, errorInfo);
					continue;
				}

				const objSame = await PdDB.findOne({$or:[{'code': obj.code}, {'nome': obj.nome}], Firm});
				if(objSame) {
					console.log(i+2, xuhao, '有相同的编号或名称');
					continue;
				}
				obj.Firm = Firm;

				obj.unit = String(arr[3]).replace(/(\s*$)/g, "").replace( /^\s*/, '');

				const price_regular = parseFloat(String(arr[4]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(price_regular) || price_regular <= 0) {
					console.log(i+2, xuhao, '价格错误');
					continue;
				}
				obj.price_regular = price_regular;
				obj.price_sale = price_regular;

				const sort = parseInt(String(arr[5]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				obj.sort = isNaN(sort) ? 0 : sort;

				const CategCode = String(arr[6]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				const Categ = P_Categs.find(item => item.code === CategCode);
				if(Categ) obj.Categ = Categ._id;

				const BrandCode = String(arr[7]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				const Brand = P_Brands.find(item => item.code === BrandCode);
				if(Brand) obj.Brand = Brand._id;

				const NationCode = String(arr[8]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(NationCode.length === 2) {
					const Nation = BP_Nations.find(item => item.code === NationCode);
					if(Nation) obj.Nation = Nation._id;
				}

				const is_usable = String(arr[9]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(is_usable === '1') obj.is_usable = true;

				obj.img_urls = [];
				for(let j=10; j<15; j++) {
					const img_url = String(arr[j]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
					if(img_url !== "undefined") obj.img_urls.push('/upload/Pd/'+img_url);
				}

				const _object = new PdDB(obj);
				const objSave = await _object.save();
			}
			return res.redirect('/adHome');
		} catch(error) {
			console.log(error)
			return res.redirect('/?error=adUserDel,Error: '+error+'&reUrl=/adUsers');
		}
	});

	app.post('/excel_Prod', AderIsLogin, postForm, async(req, res) => {
		console.log("Ader Prod excel");
		try{
			const Firm = req.body.obj.Firm;
			const Shop = req.body.obj.Shop;

			if(!P_Brands) P_Brands = await BrandDB.find({Firm});
			if(!P_Categs) P_Categs = await CategDB.find({Firm, Shop});
			if(!BP_Nations) BP_Nations = await NationDB.find({Firm});

			const fileData = req.files.mulFile;
			if(!fileData) return res.redirect('/?error=!req.files.mulFile');

			const filePath = fileData.path;
			if(!filePath) return res.redirect('/?error=!filePath');

			const types = filePath.split('.');
			const type = types[types.length -1]
			if(type !== 'xlsx') return res.redirect('/?error=!xlsx');
			const excel = require('node-xlsx').parse(filePath)[0];
			const arrs = excel.data;

			let codes = [];			// 检查相同code用的
			for(let i=1; i<arrs.length; i++) {
				const arr = arrs[i];

				// if(i<3) {
				// 	console.log(arr);
				// 	continue;
				// } else {
				// 	break;
				// }

				const obj = {};
				// const xuhao = String(arr[0]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				const xuhao = i+1;
				let col = 0;
				obj.code = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(obj.code === 'undefined') {
					console.log(i+2, xuhao, "code 错误");
					continue;
				}
				const errorInfo = MdFilter.objMatchStint(StintPd, obj, ['code']);
				if(errorInfo) {
					console.log(i+2, xuhao, errorInfo, obj.code);
					continue;
				}
				if(codes.includes(obj.code)) {
					console.log(i+2, xuhao, '已经有相同的编号', obj.code);
					continue;
				} else {
					codes.push(obj.code);
				}
				// const objSame = await PdDB.findOne({'code': obj.code, Shop});
				// if(objSame) {
				// 	console.log(i+2, xuhao, '已经有相同的编号', obj.code);
				// 	continue;
				// }

				obj.nomeTR = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				obj.nome = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');

				obj.unit = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');

				let CategPreCode = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');

				let CategCode = String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				if(!CategCode) CategCode = CategPreCode;
				if(CategCode) {
					let Categ = P_Categs.find(item => item.code === CategCode);
					if(!Categ) {
						let CategObj = {Firm, Shop};
						CategObj.code = CategObj.nome = CategCode;
						let _CategObj = new CategDB(CategObj);

						Categ = await _CategObj.save();
						P_Categs.push(Categ);
					}
					obj.Categ = Categ._id;
				}

				obj.price_cost = parseFloat(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.price_cost) || obj.price_cost < 0) obj.price_cost = 0;

				obj.price_regular = parseFloat(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.price_regular) || obj.price_regular <= 0) {
					console.log(i+2, xuhao, '标价错误', obj.price_regular);
					continue;
				}

				obj.price_sale = parseFloat(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.price_sale) || obj.price_sale <= 0) obj.price_sale = obj.price_regular;

				obj.iva = parseInt(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.iva) || obj.iva < 0) obj.iva = 22;

				obj.weight = parseFloat(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.weight) || obj.weight < 0) obj.weight = 0;

				obj.num_batch = parseInt(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.num_batch) || obj.num_batch < 0) obj.num_batch = 1;

				obj.quantity = parseInt(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.quantity)) obj.quantity = 0;

				obj.quantity_alert = parseInt(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.quantity_alert) || obj.quantity < 0) obj.quantity_alert = 0;

				obj.sort = parseInt(String(arr[col++]).replace(/(\s*$)/g, "").replace( /^\s*/, ''));
				if(isNaN(obj.sort)) obj.sort = 0;

				// obj.img_urls = [];
				// for(let j=10; j<15; j++) {
				// 	const img_url = String(arr[j]).replace(/(\s*$)/g, "").replace( /^\s*/, '');
				// 	if(img_url !== "undefined") obj.img_urls.push('/upload/Pd/'+img_url);
				// }

				obj.Firm = Firm;
				obj.Shop = Shop;
				obj.Pd = null;
				obj.is_usable = true;
				obj.is_simple = true;
				obj.is_sell = true;

				const _object = new ProdDB(obj);
				const objSave = await _object.save();
			}
			return res.redirect('/adHome');
		} catch(error) {
			console.log(error)
			return res.redirect('/?error=adUserDel,Error: '+error+'&reUrl=/adUsers');
		}
	});
}

const getCateg = (objs, str) => {
	for(let i=0; i<objs.length; i++) {
		let obj = objs[i];
		if(obj.code === str) return obj;
	}
	return null;
}
