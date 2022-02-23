const path = require('path');
const ConfUser = require(path.resolve(process.cwd(), 'app/config/conf/ConfUser'));
const ConfOrder = require(path.resolve(process.cwd(), 'app/config/conf/ConfOrder'));
const Stint = require(path.resolve(process.cwd(), 'app/config/Stint'));

module.exports = (app) => {
	app.get('/api/b1/ConfOrder', apiConfOrder);
	app.get('/api/b1/ConfUser', apiConfUser);
	app.get('/api/b1/get_social_AppId', get_social_AppId);
	app.get('/api/b1/Stint', apiStint);
	// app.get('/api/b1/Stint/:code', apiStint_code);




	app.get('/api/v1/ConfOrder', apiConfOrder);
	app.get('/api/v1/ConfUser', apiConfUser);
	app.get('/api/v1/get_social_AppId', get_social_AppId);
	app.get('/api/v1/Stint', apiStint);
	// app.get('/api/v1/Stint/:code', apiStint_code);

	app.get('/api/v1/get_payment_clientId', get_payment_clientId);
};

const get_payment_clientId = (req, res) => {
	console.log("/v1/get_payment_clientId")
	const paypal_client_id = process.env.PAYPAL_CLIENT_ID || null;
	return MdFilter.jsonSuccess(res, {data: {paypal_client_id}})
}

const get_social_AppId = (req, res)=> {
	const data = {
		"google": process.env.GOOGLE_APPID,
		"facebook": process.env.FB_APPID
	}
	return MdFilter.jsonSuccess(res, {data});
};

const apiConfOrder = (req, res) => {
	try{
		return res.json({status: 200,message: "获取成功",data: {ConfOrder }})
	} catch(error) {
		return MdFilter.json500(res, {message: "[服务器错误: loginFunc]"});
	}
}
const apiConfUser = (req, res) => {
	try{
		return res.json({status: 200,message: "获取成功",data: {ConfUser}})
	} catch(error) {
		return MdFilter.json500(res, {message: "[服务器错误: loginFunc]"});
	}
}

const apiStint = (req, res) => {
	try{
		return res.json({status: 200,message: "获取成功",data: {
			User: Stint.User,
			Firm: Stint.Firm,
			Shop: Stint.Shop,
		}})
	} catch(error) {
		return MdFilter.json500(res, {message: "[服务器错误: loginFunc]"});
	}
}


const apiStint_code = (req, res) => {
	try{
		const code = req.params.code;
		const object = Stint[code];
		if(!object) return res.json({status: 400, message: '没有此项的限制'});
		return res.json({status: 200,message: "获取成功",data: {
			key: code,
			object
		}})
	} catch(error) {
		return MdFilter.json500(res, {message: "[服务器错误: loginFunc]"});
	}
}