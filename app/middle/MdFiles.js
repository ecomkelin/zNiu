const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const publicPath = path.resolve(process.cwd(), 'public');
const uploadPath = publicPath+'/upload';

rename = (orgName, newName) => new Promise((resolve, reject) => {
	try {
		fs.rename(orgName, newName, err => {
			if(err) return reject(err);
			return resolve({status: 200, message: "success"});
		})
	} catch(e) {
		reject(e);
	}
})
/** 上传压缩图片
	img_Dir: 	保存在 public/upload/ 下的哪个文件夹
	field: 		图片 属于数据库中的哪个 field (比如 "img_url" "img_urls" "img" "imgKey");
	is_Array: 	上传的图片是单张还是多张
	跟 mkPicture_prom 区分开的原因是 一个产品需要一个正常图片和一个压缩图片
*/
exports.PdImg_sm = async(req, img_Dir) => new Promise((resolve, reject) => {
	try {
		console.log("PdImg_sm", img_Dir)
		let payload = req.payload;
		let img_abs = uploadPath+img_Dir;
		let form = formidable({ multiples: true, uploadDir: img_abs});
		form.parse(req, async(err, fields, files) => {
			if (err) return reject(err);
			try {

				// 接受 body信息 obj 的具体信息是 fields中的obj存储的信息
				let obj = (fields.obj) ? JSON.parse(fields.obj) : {};
				obj.img_urls = [];
				if(!files) return resolve({status: 200, data:{obj}});	// 如果没有传递正确的 file文件 则直接返回

				let imgArrs = ["jpg", "jpeg", "png", "gif", "svg", "icon"];

				var dateNow = Date.now();
				let imgUrls = [];

				let i = 0;// 为了 img_urls
				for(key in files) {
					let imgKey = files[key];
					var orgUrlPath = imgKey.path;
					let imgType = imgKey.type.split('/')[1];
					if(!imgArrs.includes(imgType)) {
						this.rmPicture();
						return resolve({status: 400, message: "只允许输入jpg png gif格式图片"});
					}
					var relPath = "/upload"+img_Dir+"/" + payload.Firm+'-'+dateNow + '_sm-' + payload._id + '.' + imgType;
					var newUrlPath = publicPath + relPath;

					if((await rename(orgUrlPath, newUrlPath)).status === 200) {
						if(key === 'img_url') obj.img_xs = relPath;
						else if(key === 'img_xs') obj.img_url = relPath;
						else obj.img_urls[i++] = relPath;
					}
				}

				return resolve({status: 200, data: {obj}});
			} catch(e) {
				return reject({status: 500, e})
			}
		})
	} catch(error) {
		console.log("PdImg_sm", error)
		return reject(error);
	}
});




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

				/** 如果后端控制器给的是数组 比如 img_urls */
				if(is_Array) obj[field] = [];

				if(!files) return resolve(obj);	// 如果没有传递正确的 file文件 则直接返回

				let lenFile = 0;
				let keys = [];
				for(key in files) {	// 前端传递的文件数量
					keys.push(key);
					lenFile++;
				}
				const warnMsg = {};
				warnMsg.files = [];
				multiplesPic_Func(resolve, obj, field, img_Dir, warnMsg, files, keys, payload._id, lenFile, 0);

				// for(key in files) {	// 前端传递的文件数量
				// 	if(files[key] && files[key].path) {
						
				// 	}
				// }

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




/** 前台传输的 file 文件 展示
 * 
 * {
  img_url: File {
    _events: [Object: null prototype] {},
    _eventsCount: 0,
    _maxListeners: undefined,
    size: 139441,
    path: '/root/server/dev/public/upload/Prod/upload_59a66d02e98fb57fdb6eb7b5ede87e8b',
    name: 'app_startup_image.png',
    type: 'image/png',
    hash: null,
    lastModifiedDate: 2022-12-29T17:11:11.042Z,
    _writeStream: WriteStream {
      _writableState: [WritableState],
      writable: false,
      _events: [Object: null prototype] {},
      _eventsCount: 0,
      _maxListeners: undefined,
      path: '/root/server/dev/public/upload/Prod/upload_59a66d02e98fb57fdb6eb7b5ede87e8b',
      fd: null,
      flags: 'w',
      mode: 438,
      start: undefined,
      autoClose: true,
      pos: undefined,
      bytesWritten: 139441,
      closed: true,
      [Symbol(kFs)]: [Object],
      [Symbol(kCapture)]: false,
      [Symbol(kIsPerformingIO)]: false
    },
    [Symbol(kCapture)]: false
  },
  img_xs: File {
    _events: [Object: null prototype] {},
    _eventsCount: 0,
    _maxListeners: undefined,
    size: 10090,
    path: '/root/server/dev/public/upload/Prod/upload_8858675d9e15b57361d424a5ff070ba9',
    name: 'blob',
    type: 'image/png',
    hash: null,
    lastModifiedDate: 2022-12-29T17:11:11.043Z,
    _writeStream: WriteStream {
      _writableState: [WritableState],
      writable: false,
      _events: [Object: null prototype] {},
      _eventsCount: 0,
      _maxListeners: undefined,
      path: '/root/server/dev/public/upload/Prod/upload_8858675d9e15b57361d424a5ff070ba9',
      fd: null,
      flags: 'w',
      mode: 438,
      start: undefined,
      autoClose: true,
      pos: undefined,
      bytesWritten: 10090,
      closed: false,
      [Symbol(kFs)]: [Object],
      [Symbol(kCapture)]: false,
      [Symbol(kIsPerformingIO)]: false
    },
    [Symbol(kCapture)]: false
  }
}
 */