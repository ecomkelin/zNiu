const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const CartProdDB = require(path.resolve(process.cwd(), 'app/models/order/CartProd'));
const ProdDB = require(path.resolve(process.cwd(), 'app/models/product/Prod'));

const GetDB = require(path.resolve(process.cwd(), 'app/controllers/_db/GetDB'));


/** 加一个商品进入购物车 只有Client使用 */
exports.CartProd_plusProd = async(req, res) => {
	console.log("/CartProd_plusProd");
	try{
		const payload = req.payload;

		const Prod_id = req.params.Prod_id;		// 所要更改的Prod_id
		if(!MdFilter.isObjectId(Prod_id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

        // 判断 基本参数 是否正确
        const paramObj = {Shop: payload.Shop, Client: payload._id, Prod: Prod_id};

		let object = null;
		const CartProd = await CartProdDB.findOne(paramObj);
		if(CartProd) {
			CartProd.quantity += 1;
			object = await CartProd.save();
			if(!object) return MdFilter.jsonFailed(res, {message: "预定 数据库保存错误"});
		} else {
			// 判断 基本参数 是否正确
			const obj = {};
			obj.quantity = 1;
			obj.sort = 0;

			obj.Shop = payload.Shop;
			obj.Client = payload._id;
			console.log(111, obj.Shop)
			const Prod1 = await ProdDB.findOne({_id: Prod_id}, {price_sale: 1});
			console.log(Prod1);
			const Prod = await ProdDB.findOne({_id: Prod_id, Shop: obj.Shop}, {price_sale: 1});
			if(!Prod) return MdFilter.jsonFailed(res, {message: "没有此商品信息"});
			obj.is_delete_Prod = false;
			
			obj.price_sale = Prod.price_sale;
			obj.is_priceChange = false;

			const _CartProd = new CartProdDB(obj);

			object = await _CartProd.save();
			if(!object) return MdFilter.jsonFailed(res, {message: "数据库保存错误"});
		}
		return MdFilter.jsonSuccess(res, {message: "CartProd_plusProd", data: {object}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CartProd_plusProd", error});
	}
}
/** 减一个商品从购物车减去 只有Client使用 */
exports.CartProd_menusProd = async(req, res) => {
	console.log("/CartProd_menusProd");
	try{
		const payload = req.payload;

		const Prod_id = req.params.Prod_id;		// 所要更改的Prod_id
		if(!MdFilter.isObjectId(Prod_id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

        // 判断 基本参数 是否正确
        const paramObj = {Shop: payload.Shop, Client: payload._id, Prod: Prod_id};

		const CartProd = await CartProdDB.findOne(paramObj);
		if(CartProd) return MdFilter.jsonFailed(res, {message: "没有找到此CartProd信息"});

		CartProd.quantity -= 1;
		if(CartProd.quantity === 0) {		
			const objDel = await CartProdDB.deleteOne({_id: id});
			return MdFilter.jsonSuccess(res, {message: "CartProd_menusProd 成功 已从购物车中移除"});
		} else {
			const objSave = await CartProd.save();
			if(!objSave) return MdFilter.jsonFailed(res, {message: "预定 数据库保存错误"});
			return MdFilter.jsonSuccess(res, {message: "CartProd_menusProd", data: {object: objSave}});
		}

	} catch(error) {
		return MdFilter.json500(res, {message: "CartProd_menusProd", error});
	}
}

/** 购物车修改确认 只有Client 控制 */
exports.CartProdPut_confirm = async(req, res) => {
	console.log("/CartProdPut");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的CartProd的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

        const CartProd = await CartProdDB.findOne({_id: id, Client: payload._id});
		if(!CartProd) return MdFilter.jsonFailed(res, {message: "没有找到此CartProd信息"});

		if(CartProd.is_delete_Prod === true) {
            const objDel = await CartProdDB.deleteOne({_id: id});
            return MdFilter.jsonSuccess(res, {message: "此商品 已从购物车删除"});
        }

        if(CartProd.is_priceChange) {
            const Prod = await ProdDB.findOne({_id: CartProd.Prod}, {price_sale});
            if(!Prod) return MdFilter.jsonFailed(res, {message: "数据库中没有 此商品"});

            CartProd.price_sale = Prod.price_sale;

            const objSave = await CartProd.save();
            if(!objSave) return MdFilter.jsonFailed(res, {message: "预定 数据库保存错误"});
            return MdFilter.jsonSuccess(res, {message: "CartProdPut", data: {object: objSave}});
        }

        return MdFilter.jsonSuccess(res, {message: "CartProdPut 没有数据改变"});
	} catch(error) {
		return MdFilter.json500(res, {message: "CartProdPut", error});
	}
}






/** 只有Client 控制 */
exports.CartProdPost = async(req, res) => {
	console.log("/CartProdPost");
	try{
		const payload = req.payload;

		// 判断 基本参数 是否正确
		const obj = req.body.obj;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的obj数据"});
        obj.quantity = parseInt(obj.quantity);
        if(isNaN(obj.quantity) || obj.quantity < 1) obj.quantity = 1;

        obj.sort = parseInt(obj.sort);
        if(isNaN(obj.sort) ) obj.sort = 0; 

        obj.Client = payload._id;
        obj.Shop = payload.Shop;

		if(!MdFilter.isObjectId(obj.Prod)) return MdFilter.jsonFailed(res, {message: "请传递 Prod _id 信息"});

		const existObj = await CartProdDB.findOne({Shop: obj.Shop, Client: obj.Client, Prod: obj.Prod});
		if(existObj) return MdFilter.jsonFailed(res, {message: "已经加入了购物车"});

        const Prod = await ProdDB.findOne({_id: obj.Prod, Shop: obj.Shop}, {price_sale: 1});
        if(!Prod) return MdFilter.jsonFailed(res, {message: "没有此商品信息"});
        obj.is_delete_Prod = false;
        
        obj.price_sale = Prod.price_sale;
        obj.is_priceChange = false;


		const _CartProd = new CartProdDB(obj);

		const objSave = await _CartProd.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "数据库保存错误"});

		return MdFilter.jsonSuccess(res, {data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CartProdPost", error});
	}
}



/** 购物车删除 */
exports.CartProdDelete = async(req, res) => {
	console.log("/CartProdDelete");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的CartProd的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

        const paramObj = {_id: id, Shop: payload.Shop._id || payload.Shop};
        if(!payload.role) {
            paramObj.Client = payload._id;
        }
        const CartProd = await CartProdDB.findOne(paramObj);
		if(!CartProd) return MdFilter.jsonFailed(res, {message: "没有找到此CartProd信息"});

		const objDel = await CartProdDB.deleteOne({_id: id});

		return MdFilter.jsonSuccess(res, {message: "CartProdDelete"});
	} catch(error) {
		return MdFilter.json500(res, {message: "CartProdDelete", error});
	}
}

/** post 购物车清除 */
exports.CartProdDeleteMany = async(req, res) => {
	console.log("/CartProdDelete");
	try{
		const payload = req.payload;

        const paramObj = {Shop: payload.Shop._id || payload.Shop};
        if(!payload.role) {
            paramObj.Client = payload._id;
        }

		if(req.body.obj) {
			let {CartProds} = req.body.obj;
			if(!ArrIsObjectId(CartProds)) return MdFilter.jsonFailed(res, {message: "obj.CartProds 必须是 ObjectId 数组"});
			paramObj["_id"] = {$in: CartProds};
		}
		const objDel = await CartProdDB.deleteMany(paramObj);

		return MdFilter.jsonSuccess(res, {message: "CartProdDeleteMany Success"});
	} catch(error) {
		return MdFilter.json500(res, {message: "CartProdDeleteMany", error});
	}
}

/** 购物车修改 */
exports.CartProdPut = async(req, res) => {
	console.log("/CartProdPut");
	try{
		const payload = req.payload;

		const id = req.params.id;		// 所要更改的CartProd的id
		if(!MdFilter.isObjectId(id)) return MdFilter.jsonFailed(res, {message: "请传递正确的数据_id"});

        // 判断 基本参数 是否正确
		const obj = req.body.general;
		if(!obj) return MdFilter.jsonFailed(res, {message: "请传递正确的obj数据"});

        const paramObj = {_id: id, Shop: payload.Shop._id || payload.Shop};
        if(!payload.role) {
            paramObj.Client = payload._id;
        }
        const CartProd = await CartProdDB.findOne(paramObj);
		if(!CartProd) return MdFilter.jsonFailed(res, {message: "没有找到此CartProd信息"});

		if(obj.quantity) {
			obj.quantity = parseInt(obj.quantity);
			if(isNaN(obj.quantity)) return MdFilter.jsonFailed(res, {message: "请输入桌子能容纳几人"});
			CartProd.quantity = obj.quantity;
		}

		if(obj.sort) {
			obj.sort = parseInt(obj.sort);
			if(isNaN(obj.sort)) return MdFilter.jsonFailed(res, {message: "请输入桌子能容纳几人"});
			CartProd.sort = obj.sort;
		}

		const objSave = await CartProd.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "预定 数据库保存错误"});

		return MdFilter.jsonSuccess(res, {message: "CartProdPut", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "CartProdPut", error});
	}
}







const CartProd_path_Func = (pathObj, payload, queryObj={}) => {
	if(payload.role) {
		pathObj.Shop = payload.Shop._id || payload.Shop;
        if(queryObj.Clients ) {
            const arrs = MdFilter.stringToArray(queryObj.Clients);
            if(arrs.length > 0) pathObj.Client = {"$in": arrs};
        }
	} else {
        pathObj.Client = payload._id;
    }

    if(queryObj.Prods) {
		const arrs = MdFilter.stringToArray(queryObj.Prods);
		if(arrs.length > 0) pathObj.Prod = {"$in": arrs};
	}
}

const dbCartProd = 'CartProd';
exports.CartProds = async(req, res) => {
	console.log("/CartProds");
	// console.log(req.query)
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			payload: payload,
			queryObj: req.query,
			objectDB: CartProdDB,
			path_Callback: CartProd_path_Func,
			dbName: dbCartProd,
		};
		const dbs_res = await GetDB.dbs(GetDB_Filter);
		return MdFilter.jsonSuccess(res, dbs_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "CartProds", error});
	}
}

exports.CartProd = async(req, res) => {
	console.log("/CartProd");
	try {
		const payload = req.payload;
		const GetDB_Filter = {
			id: req.params.id,
			payload: payload,
			queryObj: req.query,
			objectDB: CartProdDB,
			path_Callback: CartProd_path_Func,
			dbName: dbCartProd,
		};
		const db_res = await GetDB.db(GetDB_Filter);
		return MdFilter.jsonSuccess(res, db_res);
	} catch(error) {
		return MdFilter.json500(res, {message: "CartProd"});
	}
}