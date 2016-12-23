"use strict";

const path = require('path');
const fs = require('fs');

class Common {

}

Common.NAME = 'iBuild';
Common.ROOT = path.join(__dirname, '../');
Common.WORKSPACE = `${Common.NAME}_workdir`;
Common.CONFIGNAME = 'config.json';
Common.CONFIGPATH = path.join(__dirname, '../', Common.CONFIGNAME);

Common.PLATFORM = process.platform;
//Common.DEFAULT_PATH = Common.PLATFORM === 'win32' ? 'desktop' : 'home';
Common.DEFAULT_PATH = 'desktop' ;

Common.EXAMPLE_NAME = 'demo';
Common.template_path = path.resolve(path.join(__dirname, '../templates/'));
Common.template_demo = path.resolve(path.join(__dirname, '../templates/demo/**/*'));
Common.template_project = path.resolve(path.join(__dirname, '../templates/project/**/*'));


Common.CHECKURL = 'https://raw.githubusercontent.com/ikitty/iBuild/master/package.json';
Common.DOWNLOADURL = 'https://github.com/ikitty/iBuild/releases';

Common.requireUncached = function (module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

Common.fileExist = function (filePath) {
    try {
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        } else {
            throw new Error(err);
        }
    }
};

Common.dirExist = function (dirPath) {
    try {
        var stat = fs.statSync(dirPath);
        if (stat.isDirectory()) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        } else {
            throw new Error(err);
        }
    }
}

Common.getStorage = function () {
    let storage = window.localStorage;

    if (storage.getItem(Common.NAME)) {
        return JSON.parse(storage.getItem(Common.NAME));
    } else {
        return false;
    }
};

Common.setStorage = function (storage) {
    localStorage.setItem(Common.NAME, JSON.stringify(storage));
};

Common.resetStorage = function () {
    let storage = localStorage.getItem(Common.NAME);

    if (storage) {
        storage.removeItem(Common.NAME);
    }
};

module.exports = Common;
