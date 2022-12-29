const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const publicPath = path.resolve(process.cwd(), 'public');
const uploadPath = publicPath+'/upload';
/** 上传压缩图片
	img_Dir: 	保存在 public/upload/ 下的哪个文件夹
	field: 		图片 属于数据库中的哪个 field (比如 "img_url" "img_urls" "img" "imgUrl");
	is_Array: 	上传的图片是单张还是多张
	跟 mkPicture_prom 区分开的原因是 一个产品需要一个正常图片和一个压缩图片
*/
exports.PdImg_sm = async(req, img_Dir) => {
	return new Promise((resolve, reject) => {
		try {
			console.log("PdImg_sm", img_Dir)
			let payload = req.payload;
			let img_abs = uploadPath+img_Dir;
			let form = formidable({ multiples: true, uploadDir: img_abs});
			form.parse(req, (err, fields, files) => {
				if (err) return reject(err);
				if(!files.img_url || !files.img_xs) return resolve({status: 400, message: "请传递files.img_url和files.img_xs"});
				// 接受 body信息 obj 的具体信息是 fields中的obj存储的信息
				let obj = (fields.obj) ? JSON.parse(fields.obj) : {};
				if(!files) return resolve({status: 200, data:{obj}});	// 如果没有传递正确的 file文件 则直接返回

				let imgArrs = ["jpg", "jpeg", "png", "gif", "svg", "icon"];

				let imgUrl = files.img_url;
				let imgSim = files.img_xs;
				var orgUrlPath = imgUrl.path;
				var orgSimPath = imgSim.path;
				// 接收 图片的路由信息 以便分类存储图片， 如果路由信息不存在, 则放入默认文件夹
				let imgUrl_Type = imgUrl.type.split('/')[1];
				let imgSim_Type = imgSim.type.split('/')[1];
				if(!imgArrs.includes(imgUrl_Type) || !imgArrs.includes(imgSim_Type)) {
					this.rmPicture();
					return resolve({status: 400, message: "只允许输入jpg png gif格式图片"});
				}
				var dateNow = Date.now();
				var img_url = "/upload"+img_Dir+"/" + payload.Firm+'-'+dateNow + '-' + payload._id + '.' + imgUrl_Type;
				var img_xs = "/upload"+img_Dir+"/" + payload.Firm+'-'+dateNow + '_sm-' + payload._id + '.' + imgSim_Type;
				var newUrlPath = publicPath + img_url;
				var newSimPath = publicPath + img_xs;

				fs.rename(orgUrlPath, newUrlPath, err => {
					if(err) {
						console.log("img_url", err)
						return resolve({status: 400, message: "您传递的 img_url 错误"});
					}
					obj.img_url = img_url;
					fs.rename(orgSimPath, newSimPath, err => {
						if(err) {
							console.log("img_xs", err)
							return resolve({status: 400, message: "您传递的 img_xs 错误"});
						}
						obj.img_xs = img_xs;
						return resolve({status: 200, data: {obj}})
					})
				})
			})
		} catch(error) {
			console.log("PdImg_sm", error)
			return reject(error);
		}
	})
}




/** 上传正常的图片 */
exports.mkPicture_prom = async(req, {img_Dir, field, is_Array}) => {
	return new Promise((resolve, reject) => {
		try {
			const payload = req.payload;
			const img_abs = uploadPath+img_Dir;
			const form = formidable({ multiples: true, uploadDir: img_abs});
			form.parse(req, (err, fields, files) => {
				if (err) return reject(err);
				// 接受 body信息 obj 的具体信息是 fields中的obj存储的信息
				const obj = (fields.obj) ? JSON.parse(fields.obj) : {};
				if(is_Array) obj[field] = [];
				if(!files) return resolve(obj);	// 如果没有传递正确的 file文件 则直接返回
				let lenFile = 0;
				let keys = [];
				for(key in files) {
					keys.push(key);
					lenFile++;
				}
				const warnMsg = {};
				warnMsg.files = [];
				multiplesPic_Func(resolve, obj, field, img_Dir, warnMsg, files, keys, payload._id, lenFile, 0);
			})
		} catch(error) {
			console.log("mkPicture_prom", error)
			return reject(error);
		}
	})
}

const multiplesPic_Func = (resolve, obj, field, img_Dir, warnMsg, files, keys, payload_id, lenFile, n) => {
	if(n == lenFile) return resolve(obj);
	const key = keys[n];
	if(files[key] && files[key].path) {
		// const isLt=file.size/1024/1024/<4;	// 判断图片大小 如果图片过大 可以压缩
		const file = files[key]
		const oldfliepath = file.path;
		// 接收 图片的路由信息 以便分类存储图片， 如果路由信息不存在, 则放入默认文件夹
		let imgType = file.type.split('/')[1];
		const imgArrs = ["jpg", "jpeg", "png", "gif", "svg", "icon"];
		if(!imgArrs.includes(imgType)) {
			this.rmPicture()
			warnMsg.fileType = "只允许输入jpg png gif格式图片";
			console.log(warnMsg.fileType);
			multiplesPic_Func(resolve, obj, field, img_Dir, warnMsg, files, keys, payload_id, lenFile, n+1);
		} else {
			const img_url = "/upload"+img_Dir+"/" + payload_id + '-'+n+'-' + Date.now() + '.' + imgType;
			const newfilepath = publicPath + img_url;

			fs.rename(oldfliepath, newfilepath, err => {
				if(err) {
					console.log("multiplesPic_Func", err)
					warnMsg.files.push("您传输的第"+n+"张图片错误");
					multiplesPic_Func(resolve, obj, field, img_Dir, warnMsg, files, keys, payload_id, lenFile, n+1);
				} else {
					if(obj[field]) {
						obj[field].push(img_url);
					} else {
						obj[field] = img_url;
					}
					multiplesPic_Func(resolve, obj, field, img_Dir, warnMsg, files, keys, payload_id, lenFile, n+1);
				}
			})
		}
	} else {
		multiplesPic_Func(resolve, obj, field, img_Dir, warnMsg, files, keys, payload_id, lenFile, n+1);
	}
}



exports.rmPicture = (oldfliepath) => {
	if(oldfliepath) {
		fs.unlink(publicPath+oldfliepath, (err) => {
			if(err) {
				console.log("rmPicture", err);
			}
		});
	}
}