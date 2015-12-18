/*
 * Дполнительные модули
 *
 */

// Обработка путей
var path = require('path');

// Поток событий
var es = require('event-stream');

// Swig шаблонизатор
var swig = require('swig');

// Кастомизируем обработку переменных
swig.Swig({
    varControls: ['{[', ']}']
});

// Кастомный фильтр
// проверяет нахождение элементов в даннх,
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

// Настройка модуля наследования 
var _ = require('lodash'); // библиотека работы с данными
var extendify = require('extendify'); // надстройка для lodash, с более тонким мержем файлов

// настраиваем extendify
// для мержа файлов
_.extend = extendify({
    arrays: 'concat'
});

// Gulp утилиты
var gutil = require('gulp-util');

/*
 * Методы помощники
 *
 */

// Возвращает путь, на одну папку выше
var parentDir = function(path) {
    return path.split('/').slice(0, -1).join('/');
}


/*
 * Экспортируем модуль
 *
 */

module.exports = function(options) {

    'use strict';

    /*
     * Настройка шаблонизатора
     *
     */

    var

        // опции
        swigOpts = options.swigOpts || null;

    // Применяем опции
    if (!!swigOpts) {
        swig.Swig(swigOpts);
    }

    /*
     * Обработка шаблона
     *
     */

    var 
        // Будущий шаблон
        tmpl = null, 

        // Будущие данные
        tmplData = null,

        // Шаблонные данные
        tmplCrossData = null,

        // Будущий скомпилированный шаблон
        compiled = null,
        
        // В зависимости от типа, выбираем логику обработки
        compileType = options.param.compileType || 'tmpl',

        // Тип расширения шаблона
        extFile = options.param.ext || '.html';    

    // Обрвботка данных
    //      @file - файловый буффер
    //      @callback - функция, которая обяхательно вызывается в потоке
    //      ей можно передать ошибку, данные, или ничего не передавать

    var rgswig = function(file, callback) {

        // Отправляем данные дальше в поток
        try {

            // Если просто компиляция шаблона
            if (compileType === 'tmpl') {

                // Обрабатываем шаблон
                tmpl = swig.compile(
                    String(file.contents),
                    {
                        filename: file.path
                    }
                );

            } else if (compileType === 'data') { // Если собираем шаблоны по данным

                //console.log('tmpl ' + parentDir(path.dirname(file.path)) + '/route.html');
                //console.log('tmplData ' + file.path);
                //console.log('tmplCrossData ' + path.dirname(file.path) + '/crosspages/page.js\n');

                //console.log('file.relative ' + file.relative);
                //console.log('file.base ' + file.base + '\n');

                // Обрабатываем файл шаблона
                tmpl = swig.compileFile(parentDir(path.dirname(file.path)) + '/route.html');

                // Задаем файл данных
                tmplData = require(file.path);

                // Задаем файл шаблонных данных
                tmplCrossData = require(path.dirname(file.path) + '/crosspages/page');

                // Объединяем его с маской данных
                tmplData = _.extend(tmplCrossData, tmplData.toMerge);

                // Изменяем расширение
                file.path = gutil.replaceExtension(file.path, extFile);

            } else {
                throw Error('неверно задан тип компиляции');
            }

            // Скомпилированный шаблон
            compiled = tmpl(tmplData);

            // Сохраняем данные
            file.contents = new Buffer(compiled);

            // Отправляем дальше в поток
            callback(null, file);

        } catch (err) {

            // Кидаем ошибку
            callback(err);
        }

    };

    // Возвращаем поток данных
    // Метод map получает функцию,
    // которая асинхронно обрабатывается в потоке
    return es.map(rgswig);

};