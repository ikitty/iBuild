"use strict";

const path = require('path');
const util = require('gulp-util');
let config = require(path.join(__dirname, '../../../config.json'));


var tmt_util = {
    log: function (task_name) {
        util.log.apply(util, arguments);
    },
    task_log: function (task_name) {
        this.log(util.colors.magenta(task_name), util.colors.green.bold('√'));
    },
    colors: util.colors
};

module.exports = tmt_util;
