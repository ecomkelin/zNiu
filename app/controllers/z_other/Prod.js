
const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

exports.price_sale_Prod_percent = async(req, res) => {
	console.log("/price_sale_Prod_percent");
	try {
		let payload = req.payload;
        let Shop = payload.Shop._id || payload.Shop;

        let paramProd = {Shop};

        let body = req.body;
        let {Prod_ids, Categ_ids, percent} = body;
        if(Prod_ids) {
            if(!MdFilter.ArrIsObjectId(Prod_ids))return MdFilter.jsonFailed(res, {message: "Prod_ids 必须为 ObjectId 数组"});
            paramProd["_id"] = {$in: Prod_ids};
        } else if(Categ_ids) {
            if(!MdFilter.ArrIsObjectId(Categ_ids))return MdFilter.jsonFailed(res, {message: "Categ_ids 必须为 ObjectId 数组"});
            paramProd.Categs = {$in: Categ_ids};
            if(MdFilter.ArrIsObjectId(maskProd_ids)) paramProd["_id"] = {$nin: maskProd_ids};
        } else {
            return MdFilter.jsonFailed(res, {message: "请传递 Prod_ids 或 Categ_ids 参数"});
        }

        percent = parseFloat(percent);
        if(isNaN(percent)) return MdFilter.jsonFailed(res, {message: "percent 必须为数字"});
        if(percent < 0) return MdFilter.jsonFailed(res, {message: "percent 不能小于 0"});
        if(percent > 100) return MdFilter.jsonFailed(res, {message: "percent 不能大于 100"});

        let upds = await ProdDB.updateMany(
            paramProd, 
            [{
                $set: {
                    price_sale:{
                        $multiply:["$price_regular", percent/100]
                    },
                    is_discount: percent === 100 ? false : true
                }
            }]
        );
        let Prods = await ProdDB.find(paramProd, {code: 1, price_sale: 1, price_regular: 1, is_discount: 1});

        return MdFilter.jsonSuccess(res, {message: "success", data: {upds, Prods}, body});
	} catch(error) {
		return MdFilter.json500(res, {message: "price_sale_Prod_percent", error});
	}
};