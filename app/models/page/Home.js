// Prod Sku
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ObjectId = Schema.Types.ObjectId;
const Float = require('mongoose-float').loadType(mongoose, 2);

const colection = 'Home';

const dbSchema = new Schema({
    Shop: {type: ObjectId, ref: 'Shop'},

    // sources: [],
    title: String,
    desc: String,
    keywords: String,

    slides: [{
        img_url: String,
        title: String,
        desc: String,
        link: String,

        at_crt: Date,								// [只读 绝对]
        at_upd: Date,								// [只读 绝对]
    }],

    homeProds: [{type: ObjectId, ref: 'Prod'}],

    homeCategs: [{
        sort: Number,
        Categ: {type: ObjectId, ref: 'Categ'},
        desp: String,
        img_url: String,
        Prods: [{type: ObjectId, ref: 'Prod'}]
    }],
});

module.exports = mongoose.model(colection, dbSchema);