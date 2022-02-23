const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;

const colection = 'Categ';
const dbSchema = new Schema({
	type: Number,									// [只读 绝对] 	enum: [1, 2];
	level: Number, 									// [只读 绝对]	enum: [1, 2, 3];
	Categ_far: {type: ObjectId, ref: 'Categ'},
	Categ_sons: [{type: ObjectId, ref: 'Categ'}],	// [只读 绝对]

	code: String,

	img_url: String,

	langs: [{
		Lang: {type: ObjectId, ref: 'Lang'},
		desp: String,
	}],

	is_usable: { type: Boolean, default: true },
	sort: Number,

	User_upd: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	User_crt: {type: ObjectId, ref: 'User'},		// [只读 绝对]
	at_upd: Date,									// [只读 绝对]
	at_crt: Date,									// [只读 绝对]
	Firm: {type: ObjectId, ref: 'Firm'},			// [只读 绝对]
});

dbSchema.pre('save', function(next) {
	if(this.isNew) {
		if(!this.sort) this.sort = 0;
		if(!this.level) this.level = 1;
		this.at_upd = this.at_crt = Date.now();
	} else {
		this.at_upd = Date.now();
	}
	if(this.level === 1) this.Categ_far = null;
	if(this.level === 2) this.Categ_sons = null;

	next();
})

module.exports = mongoose.model(colection, dbSchema);