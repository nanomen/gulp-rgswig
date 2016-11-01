/*
 * Gulp-plugin for custom processing swig templates
 * @author: rg team
 *
 */

var fs = require('fs');
var path = require('path');
var es = require('event-stream');
var gutil = require('gulp-util');
var _ = require('lodash');
var minimist = require('minimist');

var swig = require('swig');

// Set custom varControls
swig.Swig({
    varControls: ['{[', ']}']
});

// Кастомный фильтр
// проверяет нахождение элементов в данных,
// к которым применяем фильтр
//
// Аргументы:
// @input итерируемый элемент,
// @arrayMask - массив, в котором ищем совпадение
swig.setFilter('rgInArray', function (input, arrayMask) {
    var i = 0;

    for (; i < arrayMask.length; i++) {
        if (input === arrayMask[i]) {
            return true
        }
    }

    return false;

});

// Кастомный фильтр
// получает комментарий из пути файла
//
// Аргументы:
// @_input итерируемый элемент
swig.setFilter('rgPathComm', function (_input) {

    return _input.replace(pathMap.src._, '');

});


// Кастомный фильтр
// split
// разбиваем строку на элементы массива по delimiter
swig.setFilter('split', function (_input, delimiter) {

    // Если входящий элемент не строка,
    // возвращаем его
    if (typeof _input !== 'string') {
        return _input;
    }

    return _input.split(delimiter);

});

// Кастомный фильтр
// reverse
// Переопределяем дефолтный фильр,
// так как он является только алиасом input|sort(true) и делает не совсем то, что ожидается.
swig.setFilter('reverse', function (_input) {

    return _input.reverse();

});

// Кастомный фильтр
// getRGB
// подключает RGB блок и отдает его в шаблон
swig.setFilter('getRGB', function(rgb){

    // Подключаем RGB и отдаем данные
    return require(pathMap._ + '/rgb')(rgb);

});

// Кастомный фильтр
// isObject
// проверяет является ли объектом значение
// Под объектом понимается любое значение,
// кроме простого - строка, число, boolean
swig.setFilter('isObject', function(val){

    // Отправляем результат
    return _.isObject(val);

});




// Customize extend method LoDash
var extendify = require('extendify');
_.extend = extendify({
    arrays: 'concat'
});




/*
 * Helpers
 *
 */

// If resource exists
var resExistsSync = function(path) {
    try {
        fs.statSync(path);
        return true;
    } catch (err) {
        return false;
    }
};

// Get parent folder
var parentDir = function(path) {
    return path.split('/').slice(0, -1).join('/');
};

// Find template file
var findTmpl = function(dirPath) {

    var targetDir = null,
        tmplFile = 'route.html',
        targetFile = null;

    // #1 Find setup
    targetDir = parentDir(dirPath);
    targetFile = targetDir + '/' + tmplFile;

    // #1 Find process
    if (resExistsSync(targetFile)) {
        return targetFile;
    } else { // if not file, go to parent dir

        // #2 Find setup
        targetDir = parentDir(targetDir);
        targetFile = targetDir + '/' + tmplFile;

        // #2 Find process
        if (resExistsSync(targetFile)) {
            return targetFile;
        } else { // if not file, go to default template

            // #3 Find setup
            targetDir = parentDir(parentDir(targetDir));
            targetFile = targetDir + '/' + tmplFile;

            // #3 Find process
            if (resExistsSync(targetFile)) {
                return targetFile;
            }

        }

    }

    return null;
};

// Find crossdata file
var findCrossData = function(dirPath) {

    var targetDir = dirPath,
        crossData = '/crosspages/page.js';

    // #1 Find setup
    targetFile = targetDir + crossData;

    // #1 Find process
    if (resExistsSync(targetFile)) {
        return targetFile;
    } else { // if not file, go to parent dir

        // #2 Find setup
        targetDir = parentDir(parentDir(targetDir));
        targetFile = targetDir + crossData;

        // #2 Find process
        if (resExistsSync(targetFile)) {
            return targetFile;
        } else { // if not file, go to default template

            // #3 Find setup
            targetDir = parentDir(parentDir(targetDir));
            targetFile = targetDir + '/data' + crossData;

            // #3 Find process
            if (resExistsSync(targetFile)) {
                return targetFile;
            }

        }

    }

    return null;

};


/*
 * Module
 *
 */

module.exports = function(userOptions) {

    'use strict';

    /*
     * Setup
     *
     */

    var

        // default options
        options = {

            // Custom options for swig
            swigOpts: {
                varControls: ['{[', ']}']
            },

            // Param module
            param: {

                // Process type
                compileType: 'tmpl',

                // Ext template
                extFile: '.html'
            }
        };


    // Update options
    _.extend(options, userOptions);

    // Set swig custom options
    swig.Swig(options.swigOpts);


    // Data processing
    //      @file - file pass gulp
    //      @callback - process function

    var rgswig = function(file, callback) {

        var

            // File contents
            fileContents = file.contents,

            // File path
            filePath = file.path,

            // src dest
            dirPath = null,

            // Compile type
            compileType = options.param.compileType,

            // Ext file
            extFile = options.param.extFile,

            /*
             * Template var
             *
             */

            // Template
            tmpl = null,

            // Template data
            tmplData = (options.data) ? options.data : null,

            // Template cross data
            tmplCrossData = null,

            // Compiled template
            compiled = null,

            // Node Arguments
            nodeArgv = null,

            // Environment
            processEnv = null,

            // Use custom minify (for current xml minify)
            customHtmlMinify = (options.customHtmlMinify) ? true : false;

        // Processing
        try {

            // Get node arguments
            nodeArgv = minimist(process.argv);

            // Set Environment
            processEnv = nodeArgv.env || 'dev';

            // Set ENV as global
            global.env = processEnv;

            // If process from template
            if (compileType === 'tmpl') {

                // Compile template file
                tmpl = swig.compile(
                    String(fileContents),
                    {
                        filename: filePath
                    }
                );

            } else if (compileType === 'data') { // If process from data

                // Store dir path file, when watch gulp
                dirPath = path.dirname(filePath);

                // Compile template file
                tmpl = swig.compileFile(findTmpl(dirPath));

                // Set crossdata file
                tmplCrossData = require(findCrossData(dirPath));

                // Merge data template
                tmplData = _.extend({}, tmplCrossData, require(filePath).toMerge);

                // Add Environment in data template
                tmplData = _.extend({}, tmplData, { env: processEnv });

                // Set extension
                file.path = gutil.replaceExtension(filePath, extFile);

            } else {
                throw Error('неверно задан тип компиляции');
            }

            // Compile template,
            // Whitch customMinify or not
            if (customHtmlMinify) {
                compiled = tmpl(tmplData).replace(/\r|\n}/g, '').replace(/\t{1,}|\s{2,}/g, ' ');
            } else {
                compiled = tmpl(tmplData);
            }

            // Save data
            file.contents = new Buffer(compiled);

            // Send data
            callback(null, file);

        } catch (err) {

            // Send error
            callback(err);
        }

    };

    // Return data
    return es.map(rgswig);

};