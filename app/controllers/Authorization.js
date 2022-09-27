const axios = require('axios');

const path = require('path');
const MdFilter = require(path.resolve(process.cwd(), 'app/middle/MdFilter'));
const ConfIndex = require(path.resolve(process.cwd(), 'app/config/conf/ConfIndex'));
const StintClient = require(path.resolve(process.cwd(), 'app/config/stint/StintClient'));
const MdJwt = require(path.resolve(process.cwd(), 'app/middle/MdJwt'));
const ClientDB = require(path.resolve(process.cwd(), 'app/models/auth/Client'));


const getObject = async(objectDB, param) => new Promise(async(resolve, reject) => {
	try {
		let object = await objectDB.findOne(param)
			.populate({path: "Shop", select: "able_MBsell able_PCsell allow_codeDuplicate is_Pnome cassa_auth"});
		return resolve(object);
	} catch(error) {
		return reject(error);
	}
});
/* 用refreshToken刷新 accessToken */
exports.refreshtoken = async(req, res, objectDB) => {
	try {
		const refresh_res = await MdJwt.token_VerifyProm(req.headers['authorization']);
		if(refresh_res.status !== 200) return MdFilter.jsonRes(res, refresh_res);
		const payload = refresh_res.data.payload;
		const reToken = refresh_res.data.token;
		let object = await getObject(objectDB, {_id: payload._id});
		if(!object) return MdFilter.jsonFailed(res, {message: "授权错误, 请重新登录"});
		// const match_res = await MdFilter.matchBcryptProm(reToken, object.refreshToken);
		// if(match_res.status != 200) return MdFilter.jsonFailed(res, {message: "refreshToken 不匹配"});

		const accessToken = MdJwt.generateToken(object);
		const refreshToken = MdJwt.generateToken(object, true);

		object.at_last_login = Date.now();
		object.refreshToken = await MdFilter.encrypt_Prom(refreshToken);
		await object.save();
		return MdFilter.jsonSuccess(res, {
			message: "refreshtoken 刷新token成功",
			data: {accessToken, refreshToken, payload},
		});
	} catch(error) {
		return MdFilter.json500(res, {message: "refreshtoken", error});
	}
}

/* 用户登出 */
exports.logout = async(req, res, objectDB) => {
	try {
		const refresh_res = await MdJwt.token_VerifyProm(req.headers['authorization']);
		if(refresh_res.status !== 200) return MdFilter.jsonRes(res, refresh_res);
		const payload = refresh_res.data.payload;
		const object = await objectDB.findOne({_id: payload._id}, {refreshToken: 1});
		if(!object) return MdFilter.jsonSuccess(res, {message: "logout 但 未找到相应用户"});
		object.refreshToken = null;
		const objSave = await object.save();
		return MdFilter.jsonSuccess(res, {message: "logout 成功从服务器登出"});
	} catch(error) {
		return MdFilter.json500(res, {message: "logout", error});
	}
}


/*
	用户登录
	获取用户信息
	生成本地 accessToken 和 refreshToken
	并记录用户的登录时间 保存到数据库
*/
exports.login = async(req, res, objectDB) => {
	console.log("/login")
	try{
		// console.log(req.body)
		const Obj_res = await obtain_payload(req.body.system, req.body.social, objectDB);
		if(Obj_res.status !== 200) return MdFilter.jsonRes(res, Obj_res);
		const payload = Obj_res.data.object;
		if(!payload) return MdFilter.jsonFailed(res, {message: "登陆失败"});
		const accessToken = MdJwt.generateToken(payload);
		const refreshToken = MdJwt.generateToken(payload, true);

		payload.at_last_login = Date.now();
		payload.refreshToken = refreshToken;
		const objSave = await payload.save();

		return MdFilter.jsonSuccess(res, {
			message: "login 登录成功",
			data: {
				accessToken,
				refreshToken,
				payload
			},
		})
	} catch(error) {
		return MdFilter.json500(res, {message: "login", error});
	}
}
// 获取用户信息
// 1 账号(code,email,phone)密码登录
// 2 第三方登录
const obtain_payload = (system_obj, social_obj, objectDB) => {
	return new Promise(async(resolve) => {
		try{
			if(system_obj) {
				const param = {};
				if(system_obj.code) {
					param.code = system_obj.code.replace(/^\s*/g,"").toUpperCase();
				} else if(system_obj.email) {
					param.email = system_obj.email.replace(/^\s*/g,"").toUpperCase();
				} else {
					system_obj.phonePre = system_obj.phonePre.replace(/^\s*/g,"").toUpperCase();
					system_obj.phonePre = MdFilter.format_phonePre(system_obj.phonePre);
					if(!system_obj.phonePre) return resolve({status: 400, message: "电话前缀错误"});
					system_obj.phoneNum = system_obj.phoneNum.replace(/^\s*/g,"").toUpperCase();
					param.phone = system_obj.phonePre+system_obj.phoneNum;
				}

				let object = await getObject(objectDB, param);
				if(!object) return resolve({status: 400, message: "登录失败"});
				const pwd_match_res = await MdFilter.matchBcryptProm(system_obj.pwd, object.pwd);
				if(pwd_match_res.status != 200) return resolve({status: 400, message: "登录失败"});
				return resolve({status: 200, data: {object}});
			} else if(social_obj) {
				/* ==================== 检查第三方登录是否成功 ==================== */
				// 从前端获取 登录类型 及第三方社交账号的 token
				const login_type = social_obj.login_type;
				const Client_accessToken = social_obj.Client_accessToken;
				// 根据 登录类型 和 第三方token 获取第三方社交账号的登录结果
				let social_res = null;
				if(login_type === "facebook") {
					// console.log("facebook");
					social_res = await facebookAuth_Prom(Client_accessToken);
				} else if(login_type === "google") {
					// console.log("google");
					social_res = await googleAuth_Prom(Client_accessToken);
				} else if(login_type === "wx") {
					social_res = await weixinAuth_Prom(Client_accessToken);
				}
				if(social_res.status !== 200) return resolve({status: social_res.status, message: social_res.message});
				// 获取第三方的 唯一标识 user_id
				const user_id = social_res.data.user_id;
				if(!user_id) return resolve({status: 400, message: "没有找到 user_id 请联系后端"});

				/* ==================== 如果第三方授权成功 ==================== */
				// 查看是否已登录过系统
				// 如果已经登录 则找到此系统账号
				let object = await getObject(objectDB, {socials: { $elemMatch: {social_type: login_type, social_id: user_id}} });

				// 如果此第三方账号 不在系统中 则为其创建一个 系统账号
				if(!object) {
					// 生成新 code
					const result_code = await generate_codeClient();
					if(result_code.status !== 200) return resolve(result_code);
					const obj = {};
					obj.socials = [{
						social_type: login_type,
						social_id: user_id
					}];
					obj.code = result_code.data.code;
					obj.is_usable = true;
					const _object = new objectDB(obj);
					object = await _object.save();
					if(!object) return resolve({status: 400, message: "第三方登陆 创建用户失败"});
				}
				return resolve({status: 200, data: {object}});
			}
			return resolve({status: 400, message: "请传入正确的登陆参数"});
		} catch(error) {
			console.log("[resolve]", error);
			return resolve({status: 400, message: "[resolve]"});
		}
	})
}
































/* 新账户注册 */
exports.register = async(req, res) => {
	try {
		let obj = null;
		let to = null;
		// const {email, phonePre, phoneNum, pwd, opt} = req.body;
		const pathSame = {};	// 检查是否有相同的账号
		if(req.body.email) {		// 邮箱注册
			to = req.body.email.replace(/^\s*/g,"").toUpperCase();
			obj = {email: to};
			pathSame.email = to;
		} else {					// 手机注册
			const phonePre = MdFilter.format_phonePre(req.body.phonePre);
			if(!phonePre) return MdFilter.jsonFailed(res, {message: "phonePre 错误"});
			const phoneNum = req.body.phoneNum.replace(/^\s*/g,"").toUpperCase();
			to = phonePre+phoneNum;
			obj = {phone: to};
			obj.phonePre = phonePre;
			obj.phoneNum = phoneNum;
			pathSame.phone = to;
		}
		const vrifyChecks_res = await verifyChecks(to, req.body.otp);	// 把注册邮箱或手机 连同验证码 验证
		if(vrifyChecks_res.status !== 200) return MdFilter.jsonRes(res, vrifyChecks_res);

		// 如果验证成功 则检查数据库 是否已有此邮箱或手机的账户
		const objSame = await ClientDB.findOne(pathSame);	
		if(objSame) return MdFilter.jsonFailed(res, {message: "此电话或邮箱已被注册"});
		// 创建新账户
		const code_result = await generate_codeClient();		// 自动生成账户编号
		if(code_result.status !== 200) return MdFilter.jsonRes(res, code_result);
		obj.code = code_result.data.code;

		const pwd = req.body.pwd.replace(/(\s*$)/g, "").replace( /^\s*/, '');
		const errorInfo = MdFilter.objMatchStint(StintClient, req.body, ['pwd']);
		if(errorInfo) return MdFilter.jsonFailed(res, {message: errorInfo});
		obj.pwd = await MdFilter.encrypt_Prom(pwd);			// 密码加密

		obj.is_active = true;
		obj.is_usable = true;
		const _object = new ClientDB(obj);
		objSave = await _object.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "创建用户失败"});
		return MdFilter.jsonSuccess(res, {message: "register 成功", data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "register_Error:", error});
	}
}





/* 关联第三方登录 */
exports.relSocial = async(req, res)=> {
	try{
		const payload = req.payload;
		const object = await ClientDB.findOne({_id: payload._id});

		// 从前端获取 登录类型 及第三方社交账号的 token
		const login_type = req.body.login_type;
		const Client_accessToken = req.body.Client_accessToken;

		// 判断是否已经关联了此类型的社交账号
		const is_reled = object.socials.map(item => {if(item.social_type === login_type) return item});
		if(is_reled.length > 0) return MdFilter.jsonFailed(res, {message: "已经存在此社交媒体"});

		// 根据 登录类型 和 第三方token 获取第三方社交账号的登录结果
		let social_res = null;
		if(login_type === "facebook") {
			// console.log("/vRelSocial", "facebook");
			social_res = await facebookAuth_Prom(Client_accessToken);
		} else if(login_type === "google") {
			// console.log("/vRelSocial", "google");
			social_res = await googleAuth_Prom(Client_accessToken);
		} else if(login_type === "wx") {
			// console.log("/vRelSocial", "weixin");
			social_res = await weixinAuth_Prom(Client_accessToken);
		} else {
			return MdFilter.jsonFailed(res, {message: "系统还没有此社交媒体关联"});
		}
		if(social_res.status !== 200) return MdFilter.jsonRes(res, social_res);
		// 获取第三方的 唯一标识 user_id
		const user_id = social_res.data.user_id;
		if(!user_id) return MdFilter.jsonFailed(res, {message: "没有找到user_id请联系后端"});

		// 查找其他账号 是否被此账号 关联 如果已被关联 则不可再次关联
		const objSame = await ClientDB.findOne({socials: { $elemMatch: {social_type: login_type, social_id: user_id}} });
		if(objSame) return MdFilter.jsonFailed(res, {message: "此第三方社交媒体已关联了账户"});

		// 在此账号上加入 第三方社交账号
		object.socials.push({social_type: login_type, social_id: user_id});

		const objSave = await object.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "保存错误"});

		return MdFilter.jsonSuccess(res, {message: "relSocial 成功"});
	} catch(error) {
		return MdFilter.json500(res, {message: "relSocial", error});
	}
}














/* 重新激活 换手机号或邮箱时用的 */
exports.reActive = async(req, res) => {
	try{
		const payload = req.payload;
		const Client = await ClientDB.findOne({_id: payload._id});
		if(!Client) return MdFilter.jsonFailed(res, {message: "没有找到此人"});
		const pwd_match_res = await MdFilter.matchBcryptProm(req.body.pwd, Client.pwd);
		if(pwd_match_res.status != 200) return MdFilter.jsonFailed(res, pwd_match_res);

		let to = null;
		const pathSame = {_id: {"$ne": payload._id}};
		if(req.body.email) {		// 邮箱注册
			to = req.body.email.replace(/^\s*/g,"").toUpperCase();
			pathSame.email = to;
			Client.email = to;
		} else {					// 手机注册
			const phonePre = MdFilter.format_phonePre(req.body.phonePre);
			if(!phonePre) return MdFilter.jsonFailed(res, {message: "phonePre 错误"});
			const phoneNum = req.body.phoneNum.replace(/^\s*/g,"").toUpperCase();
			to = phonePre+phoneNum;
			pathSame.phone = to;
			Client.phonePre = phonePre;
			Client.phoneNum = phoneNum;
			Client.phone = to;
		}
		const vrifyChecks_res = await verifyChecks(to, req.body.otp);	// 把注册邮箱或手机 连同验证码 验证
		if(vrifyChecks_res.status !== 200) return MdFilter.jsonRes(res, vrifyChecks_res);

		// 如果验证成功 则检查数据库 是否已有其他此邮箱或手机的账户
		const objSame = await ClientDB.findOne(pathSame);	
		if(objSame) return MdFilter.jsonFailed(res, {message: "此电话或邮箱已被注册"});

		objSave = await Client.save();
		if(!objSave) return MdFilter.jsonFailed(res, {message: "重新激活失败"});

		return MdFilter.jsonSuccess(res, {data: {object: objSave}});
	} catch(error) {
		return MdFilter.json500(res, {message: "reActive", error});
	}
}
// 检查 验证码 是否正确
const verifyChecks = async(to, code) => {
	return new Promise((resolve) => {
		const accountSid = process.env.TWILIO_ACCOUNT_SID;
		const authToken = process.env.TWILIO_AUTH_TOKEN;
		const client = require('twilio')(accountSid, authToken);

		client.verify.services(process.env.TWILIO_SERVICE_SID)
		.verificationChecks
		.create({to, code})
		.then(async(verification_check) => {
			return resolve({status: 200, data: {status: verification_check.status}});
		}).catch(error => {
			console.log("[resolve verifyChecks]", error);
			return resolve({status: 400, message: "[resolve verifyChecks]"});
		});
	})
}





/* 获取手机验证码 */
exports.obtain_otp = async(req, res) => {
	let [to, channel] = [null, null];

	if(req.body.email) {
		channel = 'email';
		to = req.body.email.replace(/^\s*/g,"").toUpperCase();
	} else if(req.body.phonePre && req.body.phoneNum){
		channel = 'sms';
		const phonePre = MdFilter.format_phonePre(req.body.phonePre);
		if(!phonePre) return MdFilter.jsonFailed(res, {message: "phonePre错误"});
		const phoneNum =req.body.phoneNum.replace(/^\s*/g,"").toUpperCase();
		to = `${phonePre}${phoneNum}`;
	} else {
		return MdFilter.jsonFailed(res, {message: "请输入正确的邮箱或电话参数"});
	}
	const accountSid = process.env.TWILIO_ACCOUNT_SID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;
	const client = require('twilio')(accountSid, authToken);

	client.verify
	.services(process.env.TWILIO_SERVICE_SID)
	.verifications
	.create({to, channel})
	.then(verification => {
		// console.log("/Obtain_otp", verification.status);
		// 要给一个过期时间
		return MdFilter.jsonSuccess(res, {data: {status: verification.status}});
	}).catch(error => {
		return MdFilter.json500(res, {message: "obtain_otp", error});
	});
}


















const googleAuth_Prom = async(Client_accessToken) => {
	return new Promise(async(resolve) => {
		try {
			const CLIENT_ID = process.env.GOOGLE_APPID;
			const token = Client_accessToken;
			const {OAuth2Client} = require('google-auth-library');
			const client = new OAuth2Client(CLIENT_ID);
			// console.log("googleAuth", Client_accessToken)
			const ticket = await client.verifyIdToken({
				idToken: token,
				audience: CLIENT_ID,
			});
			const payload = ticket.getPayload();
			return resolve({status: 200, data: {object: payload, user_id: payload['sub']}})
		} catch(error) {
			console.log("[resolve googleAuth_Prom]", error);
			return resolve({status: 400, message: "[resolve googleAuth_Prom]"});
		}
	})
}
const facebookAuth_Prom = async(Client_accessToken) => {
	console.log("/facebookAuth");
	return new Promise(async(resolve) => {
		try {
			if(!Client_accessToken) return resolve({status: 400, message: "[facebookAuth] 请传入 客户facebook 对应的 accessToken"});
			const url = `https://graph.facebook.com/debug_token?access_token=${process.env.FB_APPID}%7C${process.env.FB_APPSECRET}&input_token=${Client_accessToken}`;
			const response = await axios.get(url);

			return resolve({status:200, data: {object: response.data.data, user_id: response.data.data.user_id}});
		} catch(error) {
			console.log("[resolve facebookAuth_Prom]", error);
			return resolve({status: 400, message: "[resolve facebookAuth_Prom]"});
		}
	})
}
const weixinAuth_Prom = async(Client_accessToken) => {
	console.log("/weixinAuth");
	return new Promise(async(resolve) => {
		try {
			// console.log("code1", Client_accessToken);
			if(!Client_accessToken) return resolve({status: 400, message: "[weixinAuth] 请传入 客户facebook 对应的 accessToken"});
			const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APPID}&secret=${process.env.WX_APPSECRET}&js_code=${Client_accessToken}&grant_type=authorization_code`;
			const response = await axios.get(url);
			// console.log("status", response.data);
			return resolve({status:200, data: {object: response.data, user_id: response.data.openid}});
		} catch(error) {
			console.log("[resolve weixinAuth_Prom]", error);
			return resolve({status: 400, message: "[resolve weixinAuth_Prom]"});
		}
	})
}


// 生成账户编号
const generate_codeClient = () => {
	console.log('generate_codeClient')
	return new Promise(async(resolve) => {
		try{
			// 找到未更改账号的 最新注册账号 因为如果已经修改 则不会在此规则了
			const pre_Client = await ClientDB.findOne({is_changed: false})
				.sort({'at_crt': -1});
			// 获取今天的日期
			const nowDate = new Date();
			const year = nowDate.getFullYear();	// 2021
			const month = nowDate.getMonth()+1;	// 7
			const Mth = ConfIndex.month[month];	// JUL

			let codeNum = 1;	// 如果之前没有注册用户 则编号为 1
			if(pre_Client) {	// 如果有用户 则获取之前用户的编号 并且 +1
				const poMonth = ConfIndex.month[pre_Client.at_crt.getMonth()+1];
				if((Mth === poMonth) && (year === pre_Client.at_crt.getFullYear()) ) {
					codeNum = parseInt(pre_Client.code.split(poMonth)[1])+1;
				}
			}
			const codePre = String(year%100) + Mth;	// 编号的前缀
			// 根据编号前缀 和 预计编号 获取完整的 用户编号, 为了防止账户重复 所以要先验证
			const code_res = await recu_codeClientSame(codePre, codeNum);
			return resolve(code_res);
		} catch(error) {
			console.log("[resolve generate_codeClient]", error);
			return resolve({status: 400, message: "[resolve generate_codeClient]"});
		}
	})
}
const recu_codeClientSame = (codePre, codeNum) => {
	return new Promise(async(resolve) => {
		try{
			codeNum = String(codeNum);
			for(let len = codeNum.length; len < 4; len = codeNum.length) codeNum = "0" + codeNum; // 序列号补0
			// 验证是否有此账号
			const objSame = await ClientDB.findOne({code: codePre+codeNum});
			if(objSame) {// 如果有 则继续验证
				codeNum = parseInt(codeNum) + 1;
				const recu_res = await recu_codeClientSame(codePre, codeNum);
				return resolve({recu_res});
			} else {// 如果没有 则使用账号
				return resolve({status: 200, data: {code: codePre+codeNum}});
			}
		} catch(error) {
			console.log("[resolve recu_codeClientSame]", error);
			return resolve({status: 400, message: "[resolve recu_codeClientSame]"});
		}
	})
}