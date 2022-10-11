
const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

exports.price_sale_Prod_percent = async(req, res) => {
	console.log("/price_sale_Prod_percent");
	try {
		let payload = req.payload;
        let Shop = payload.Shop._id || payload.Shop;

        let paramProd = {Shop, "$or":[]};

        let body = req.body;
        let {Prod_ids, Categ_ids, percent} = body;
        if(Prod_ids) {
            if(!MdFilter.ArrIsObjectId(Prod_ids))return MdFilter.jsonFailed(res, {message: "Prod_ids 必须为 ObjectId 数组"});
            paramProd["$or"].push({"_id":{$in: Prod_ids}});
        }
        if(Categ_ids) {
            if(!MdFilter.ArrIsObjectId(Categ_ids))return MdFilter.jsonFailed(res, {message: "Categ_ids 必须为 ObjectId 数组"});
            paramProd["$or"].push({"Categs":{$in: Categ_ids}});
        }

        percent = parseFloat(percent);
        if(isNaN(percent)) return MdFilter.jsonFailed(res, {message: "percent 必须为数字"});
        if(percent < 0) return MdFilter.jsonFailed(res, {message: "percent 不能小于 0"});
        if(percent > 100) return MdFilter.jsonFailed(res, {message: "percent 不能大于 100"});
        let mul = parseFloat(percent) / 100;

        const upds = await ProdDB.updateMany(paramProd, {$mul: {price_sale:mul}});
        const Prods = await ProdDB.find(paramProd, {code: 1, price_sale: 1});
        
		return MdFilter.jsonSuccess(res, {message: "success", data: {mul, upds, Prods}, body});
	} catch(error) {
		return MdFilter.json500(res, {message: "price_sale_Prod_percent", error});
	}
}

exports.price_sale_Prod_recover = async(req, res) => {
	console.log("/price_sale_Prod_recover");
	try {
		let payload = req.payload;
        let Shop = payload.Shop._id || payload.Shop;

        let paramProd = {Shop, "$or":[]};

        let body = req.body;
        let {Prod_ids, Categ_ids} = body;
        if(Prod_ids) {
            if(!MdFilter.ArrIsObjectId(Prod_ids))return MdFilter.jsonFailed(res, {message: "Prod_ids 必须为 ObjectId 数组"});
            paramProd["$or"].push({"_id":{$in: Prod_ids}});
        }
        if(Categ_ids) {
            if(!MdFilter.ArrIsObjectId(Categ_ids))return MdFilter.jsonFailed(res, {message: "Categ_ids 必须为 ObjectId 数组"});
            paramProd["$or"].push({"Categs":{$in: Categ_ids}});
        }

        const Prods = await ProdDB.find(paramProd, {code: 1, price_sale: 1, price_regular: 1});
        for(i in Prods) {
            let Prod = Prods[i];
            Prod.price_sale = Prod.price_regular;
            Prod.save();
        }
        
		return MdFilter.jsonSuccess(res, {message: "success", data: {Prods}, body});
	} catch(error) {
		return MdFilter.json500(res, {message: "price_sale_Prod_recover", error});
	}
}