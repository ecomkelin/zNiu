
const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const HomeDB = require(path.resolve(process.cwd(), 'app/models/page/Home'));

module.exports = async(req, res) => {
    console.log("/Home");
	try {
		let payload = req.payload;
        let Shop = payload.Shop._id || payload.Shop;

        let Home = await HomeDB.findOne({Shop});
        if(!Home) {
            const _object = new HomeDB({Shop});
            Home = await _object.save();
            if(!Home) return MdFilter.jsonFailed(res, {message: "保存失败"});
        }

        return MdFilter.jsonSuccess(res, {message: "success", data: {}});
	} catch(error) {
		return MdFilter.json500(res, {message: "price_sale_Prod_percent", error});
	}
}