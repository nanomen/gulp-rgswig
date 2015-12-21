/*
 * Gulp-plugin for custom processing swig templates
 * @author: rg team
 *
 */

var fs = require('fs');
var path = require('path');
var es = require('event-stream');
var gutil = require('gulp-util');

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
swig.setFilter('customInArray', function (input, arrayMask) {
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
// @input итерируемый элемент
swig.setFilter('rgPathComm', function (input) {
    return input.split('.').slice(0, -1).join('/').replace(pathMap.src._, '').split('/').join('.').substr(1);
});





// Customize extend method LoDash
var _ = require('lodash');
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
        console.error('Error check file exist: ' + err);
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
            compiled = null;

        // Processing
        try {

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

                // Set extension
                file.path = gutil.replaceExtension(filePath, extFile);

            } else {
                throw Error('неверно задан тип компиляции');
            }

            // Compile template
            compiled = tmpl(tmplData);

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