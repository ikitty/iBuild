"use strict";

const md5 = require('crypto-md5');
const path = require('path');
const rd = require('rd');
const fs = require('fs');
const _ = require('lodash');
const Common = require(path.join(__dirname, '../../common'));

function changed(dir) {

    var manifestPath = path.join(path.dirname(dir), './src/manifest.json');
    var manifest = {};
    var originManifest = {};

    //如果存在 manifest.json, 则加载保存
    if (Common.fileExist(manifestPath)) {
        originManifest = require(manifestPath);
    }

    //遍历目录, 根据内容 md5 加密
    rd.eachFileFilterSync(dir, function (file) {
        var index = path.relative(dir, file);

        //过滤掉 隐藏文件 和 manifest.json
        if (path.extname(file) && index !== 'manifest.json' && fs.existsSync(file)) {

            var data = fs.readFileSync(file);

            if (data) {
                manifest[index] = md5(data, 'hex');
            }
        }

    });

    //将新的 manifest.json 保存
    fs.writeFile(manifestPath, JSON.stringify(manifest), function (err) {
        if (err) throw err;
    });

    //找出有变动的文件
    if(originManifest){
        var diff = {};

        _.forEach(manifest, function (item, index) {
            if (originManifest[index] !== item) {
                diff[index] = item;
            }
        });
    }

    return diff;

}


module.exports = function(){
    return changed;
};
