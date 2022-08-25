module.exports = (req, res, next) => {
	let curAder = req.session.curAder;
	if(!curAder) {
		return res.redirect('/?info=需要您的Administrator账户');
	} else {
		next();
	}
}