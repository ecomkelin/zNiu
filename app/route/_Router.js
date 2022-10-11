module.exports = (app) => {
	app.get('/', (req, res) => {
		return res.render('./index', {title: process.env.SYSTEMNAME, error: req.query.error, reUrl: req.query.reUrl});
	});
	// require('./ader/a_Ader')(app);
	require('./ader/ader0_Ader')(app);
	require('./ader/ader1_login')(app);
	require('./ader/ader2_addr')(app);
	require('./ader/ader4_Firm')(app);
	require('./ader/ader5_Shop')(app);
	require('./ader/ader51_Step')(app);
	require('./ader/ader52_Pnome')(app);
	require('./ader/ader53_Prod_codeMatchs')(app);
	require('./ader/ader6_User')(app);
	require('./ader/ader9_multi')(app);
	require('./c_Conf')(app);

	require('./back/b_authorization')(app);
	require('./back/e_address')(app);
	require('./back/f_auth')(app);
	require('./back/g_complement')(app);
	require('./back/h_product')(app);
	require('./back/i_order')(app);
	require('./back/j_finance')(app);
	require('./back/z_other')(app);

	require('./front/b_authorization')(app);
	require('./front/e_address')(app);
	require('./front/f_auth')(app);
	require('./front/g_complement')(app);
	require('./front/h_product')(app);
	require('./front/i_order')(app);
	require('./front/p_payment')(app);

	require('./k_Analys')(app);
};