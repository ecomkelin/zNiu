module.exports = (app) => {
	app.get('/', (req, res) => {
		return res.render('./index', {title: process.env.SYSTEMNAME, error: req.query.error, reUrl: req.query.reUrl});
	});
	require('./a_Ader')(app);
	require('./c_Conf')(app);
	require('./back/b_authorization')(app);
	require('./back/e_address')(app);
	require('./back/f_auth')(app);
	require('./back/g_complement')(app);
	require('./back/h_product')(app);
	require('./back/i_order')(app);
	require('./back/j_finance')(app);

	require('./front/b_authorization')(app);
	require('./front/e_address')(app);
	require('./front/f_auth')(app);
	require('./front/g_complement')(app);
	require('./front/h_product')(app);
	require('./front/i_order')(app);
	require('./front/p_payment')(app);
};