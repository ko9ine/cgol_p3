/* Usando el patron de modulo. Todo esta dentro de esta
 * variable. */
var life = function () {

    var log = log4javascript.getLogger();
    log.addAppender(new log4javascript.BrowserConsoleAppender());

    var config = {
        width               : 25,
        height              : 30,
        minAutoWidth        : 3,
        minAutoHeight       : 3,
        maxWidth            : 50,
        maxHeight           : 50,
        period              : 200,
        cell_size           : 20, //px
        max_cell_size       : 50,
        track_n_generations : 3, // Must be > 0.
        max_generations     : 10,
        wraparound          : true,

        g_colour            : ['#000', // dead
                               '#8A9B0F', // g1
                               '#F8CA00',
                               '#E97F02',
                               '#BD1550',
                               '#490A3D',
                               '#0f0',
                               '#ff0',
                               '#f00',
                               '#0ff',
                               '#00f' // g10
                              ],
        border_colour      : '#444',
        border_width       : 1
    };

   
    var clock;
    var model;
    var view;

    
    var drawing = {};

    /* *********************** Controlador ******************* */

    function haveLocalStorage() {
        try {
            return !!window.localStorage;
        } catch (e) {
            return false;
        }
    }

    function load() {
        if (haveLocalStorage()) {
            var model_string = localStorage.getItem("model");
            if (model_string !== null) {
                model = Model.deSerialize(model_string);
            } else {
                model = new Model();
            }

            var config_string = localStorage.getItem("config");
            if (config_string !== null) {
                config = JSON.parse(config_string);
            }
        } else {
            model = new Model();
        }

        clock = new Clock(tick, config.period);

        if (document.createElement('canvas').getContext) {
            view  = new CanvasView(model.grid());
        } else {
            view  = new TableView(model.grid());
        }

        view.display();

    }

    function saveState() {
        localStorage.setItem("model", Model.serialize(model));
        localStorage.setItem("config", JSON.stringify(config));
    }

    if (haveLocalStorage()) {
        if (window.addEventListener) {
            window.addEventListener('unload', saveState, false);
        } else if (window.attachEvent) {
            window.attachEvent('unload', saveState);
        }
    }

    function reset() {
        clock.stop();
        model.reset();
        view.status("Pausado");
        view.generation(model.generation());
        view.grid(model.grid());
        view.refreshGrid();
    }

    function tick() {
        model.tick();

        view.generation(model.generation());
        view.grid(model.grid());
        view.refreshGrid();
    }

    function start() {
        clock.start();
        view.status("Corriendo");
    }

    function stop() {
        clock.stop();
        view.status("Pausado");
    }

    function toggle_cell(x, y) {
        if (model.cell(x, y)) {
            model.cell(x, y, 0);
        } else {
            model.cell(x, y, 1);
        }

        view.grid(model.grid());
        view.refreshCell(x, y);
    }

    function setGridWidth(x) {
        model.setWidth(x);
        view.grid(model.grid());
        view.refreshGrid();
    }

    function setGridHeight(y) {
        model.setHeight(y);
        view.grid(model.grid());
        view.refreshGrid();
    }

    function setCellSize (px) {
        view.setCellSize(px);
    }

    function setGenerationColour (generation, colour) {
        config.g_colour[generation] = colour;
        view.updateColours();
    }

    /* ********************** Vista ********************** */

    function View() {
        this.d_generation = 0;
        this.d_status     = "Pausado";

       
        this.grid = function (grid) {
            if (typeof grid !== 'undefined') {
                
                this.d_grid = grid;
            }
            return this.d_grid;
        };

        
        this.generation = function (gen) {
            if (typeof gen !== 'undefined') {
                this.d_generation = gen;
                $('#generation').text(this.d_generation);
            }
            return this.d_generation;
        };

        
        this.status = function (status) {
            if (typeof status !== 'undefined') {
                this.d_status = status;
                $('#status').html(this.d_status);
            }
            return this.d_status;
        };


        if (/iPad/.test(navigator.userAgent)) {
            log.debug("On iPad");
            config.cell_size += 2;
        }

        function Cell(x, y) {
            this.x = x;
            this.y = y;
        }
        Cell.prototype.toString = function () {return '(' + this.x + ',' + this.y + ')';};

        function getCellAtEventPosition (event) {

            var grid = $('#grid');
            var px = (event.pageX - grid.offset().left);
            var py = (event.pageY - grid.offset().top);

            var cellOffset = config.cell_size + config.border_width;

            var x = Math.floor(px / cellOffset);
            var y = Math.floor(py / cellOffset);

            if ((x < 0) || (y < 0) ||
                (x >= config.width) || (y >= config.height)) {
                return null;
            }

            return new Cell(x, y);
        }

        function gridMouseDown (event) {
            var cell = getCellAtEventPosition(event);

            if (cell === null) {

                return true;
            }

            $(document).bind('mousemove', gridMouseMove);

            life.drawing.incell = cell;

            if (model.cell(cell.x, cell.y)) {
                life.drawing.drawmode = 0;
            } else {
                life.drawing.drawmode = 1;
            }

            toggle_cell(cell.x, cell.y);

            return false;
        }

        function gridMouseUp (event) {
            $(document).unbind('mousemove');
        }

        function gridMouseMove (event) {
            var cell = getCellAtEventPosition(event);

            if (cell === null) {
                gridMouseUp();
                return false;
            }

            if (cell.toString() !== life.drawing.incell.toString()) {
                life.drawing.incell = cell;

                model.cell(cell.x, cell.y, life.drawing.drawmode);
                view.grid(model.grid());
                view.refreshCell(cell.x, cell.y);
            }
            return false;
        }

        this.display = function () {
            $("#tick").click(life.tick);
            $("#start").click(life.start);
            $("#stop").click(life.stop);
            $("#reset").click(life.reset);

            $("#speed-val").text(config.period + "ms");

            $('#width-display').text(config.width);
            $('#height-display').text(config.height);

            $("#status").html(this.d_status);
            $('#generation').text(this.d_generation);

            $("#speed-slider").slider(
                {
                    range: "min", 

                    value: config.period,
                    min: 10,
                    max: 1000,
                    slide: function (event, ui) {
                        config.period = ui.value;
                        $("#speed-val").text(ui.value + "ms");
                        clock.setPeriod(ui.value);
                    }
                });

            $("#width-slider").slider({
                                          range: "min",
                                          value: config.width,
                                          min: 1,
                                          max: config.maxWidth,
                                          slide: function (event, ui) {
                                              $("#width-display").text(ui.value);
                                              config.width = ui.value;
                                              setGridWidth(config.width);
                                          }
                                      });
            $("#height-slider").slider({
                                          range: "min",
                                          value: config.height,
                                          min: 1,
                                          max: config.maxHeight,
                                          slide: function (event, ui) {
                                              $("#height-display").text(ui.value);
                                              config.height = ui.value;
                                              setGridHeight(config.height);
                                          }
                                      });

            $("#cellSize-slider").slider({
                                          range: "min",
                                          value: config.cell_size,
                                          min: 2,
                                          max: config.max_cell_size,
                                          slide: function (event, ui) {
                                              config.cell_size = ui.value;
                                              setCellSize(config.cell_size);
                                          }
                                      });




            function onDialogOpen () {
                $('#panels > div, #panels').css('overflow', 'hidden');
                $('#colour-panel').css('height', '350px');
                $('.ui-dialog').css('width', '400px');
                $('.ui-accordion').css('padding', '0');
                $('.ui-dialog').css('padding', '0');
            }

            $("#panels").accordion().dialog({autoOpen: false, open: onDialogOpen});

            $("#show-settings").click(function () {
                                          if ($("#panels").dialog('isOpen')) {
                                              $("#panels").dialog('close');
                                          } else {
                                              $("#panels").dialog('open');
                                          }
                                      });

            $('#grid-div').bind('mousedown', gridMouseDown);
            $('#grid-div').bind('mouseup'  , gridMouseUp);

            /**** Colores ****/

            function set_generation_css_colour (generation, colour) {
                var style = $('#g' + generation).get(0);

                
                if (style.styleSheet) {
                    
                    style.styleSheet.cssText = '.g' + generation
                        + ' {background-color: ' + colour + '}';
                } else {
                    
                    $('#g' + generation)
                        .html('.g' + generation
                              + ' {background-color: ' + colour + '}');
                }
            }

            function bind_selector_to_generation(generation) {
                $.farbtastic('#colour-picker').linkTo(
                    function (colour) {
                        set_generation_css_colour(generation, colour);
                        setGenerationColour(generation, colour);
                    });

                try {
                    $.farbtastic('#colour-picker').setColor(
                        colour_to_hex($('.g' + generation).css('background-color')));
                } catch (e) {

                    log.error("Error setting colour for generation "
                              + generation + ": " + e);
                }
            }

            var i;
            for (i = 1; i <= config.max_generations; ++i) {

                $('head').append('<style id="g' + i + '" type="text/css"></style>');


                set_generation_css_colour(i, config.g_colour[i]);


                $('#colour-pickers table').append(
                    '<tr id="colour-and-label-' + i + '"><td>G' + i + '</td><td id="colour-' + i
                        + '" class="swatch g' + i + '"></td></tr>'
                );

                $('#colour-' + i).click(curry(bind_selector_to_generation, i));
            }

            $('#colour-picker').farbtastic();
            bind_selector_to_generation(1);

            function set_swatch_visibility() {
                var i;
                for (i = 1; i <= config.track_n_generations; ++i) {
                    $('#colour-and-label-' + i).css('visibility', 'visible');
                }
                for (i = config.track_n_generations + 1; i <= config.max_generations; ++i) {
                    $('#colour-and-label-' + i).css('visibility', 'hidden');
                }
            }


            set_swatch_visibility();

            $('#no-of-colours-slider').slider({
                                                  value: config.track_n_generations,
                                                  min: 1,
                                                  max: config.max_generations,
                                                  slide: function(event, ui) {
                                                      config.track_n_generations = ui.value;

                                                      set_swatch_visibility();

                                                  }
                                              });


            $('#wraparound-p').click(function () {
                                         if (this.checked) {
                                             config.wraparound = true;
                                         } else {
                                             config.wraparound = false;
                                         }
                                     }).get(0).checked = config.wraparound;
        };

        function autoConfigSize () {
 

            var left = $("#grid-div").get(0).offsetLeft;
            var top  = $("#grid-div").get(0).offsetTop;

            var width = Math.floor(($(window).width() - left) /
                                   (config.cell_size + config.border_width)) - 1;

            var height = Math.floor(($(window).height() - top) /
                                    (config.cell_size + config.border_width)) - 1;

            var minWidth  = config.minAutoWidth;
            var minHeight = config.minAutoHeight;
            var maxWidth  = config.maxWidth;
            var maxHeight = config.maxHeight;

            if (width < minWidth) {
                width = minWidth;
            } else if (width > maxWidth) {
                width = maxWidth;
            }
            config.width = width;

            if (height < minHeight) {
                height = minHeight;
            } else if (height > maxHeight) {
                height = maxHeight;
            }
            config.height = height;
        }

        autoConfigSize();

        /* For iOS.*/
        window.onorientationchange = function () {
            autoConfigSize();
            setGridWidth(config.width);
            setGridHeight(config.height);
        };

        this.refreshGrid = function () {
            alert("View is an abstract class."
                  + "You have called a method that must be overridden.");
        };
    }

    TableView.prototype = new View();
    TableView.prototype.constructor = TableView;
    function TableView (grid, cellSize) {
        var self = this;
        this.d_grid       = grid;


        this.cellSize = cellSize || config.cell_size || 20;

        this.display = function () {
            TableView.prototype.display();
            var table = make_table('grid', this.d_grid);

            $('head').append('<style type="text/css">#grid-div table {border-color: '
                             + config.border_colour + ';}</style>');

            $("#grid-div").append(table);
            this.displayed_grid = this.d_grid.copy();
        };

        this.setCellSize = function (px) {
            this.cellSize = px;
            $('#grid').get(0).setAttribute("cellpadding", this.cellSize / 2 + "px");
        };

        this.updateColours = function () {

        };

        function make_table(id, grid) {

            var tbl     = document.createElement("table");
            var tblBody = document.createElement("tbody");

            var y, row, x, cell;
            for (y = 0; y < grid.height; y++) {
                row = document.createElement("tr");
                for (x = 0; x < grid.width; ++x) {
                    cell = document.createElement("td");

                    if (grid[x][y]) {
                        cell.className = "live " + "g" + grid[x][y];
                    } else {
                        cell.className = "dead";
                    }
                    row.appendChild(cell);
                }
                tblBody.appendChild(row);
            }
            tbl.appendChild(tblBody);

            tbl.setAttribute("border", config.border_width);
            tbl.setAttribute("rules", "all");
            tbl.setAttribute("cellpadding", self.cellSize / 2 + "px");
            tbl.setAttribute("id", id);

            return tbl;
        }

        this.refreshGrid = function () {
            var table = document.getElementById("grid");
            var grid_tbody = table.getElementsByTagName("tbody")[0];

            if (this.d_grid.size() !== this.displayed_grid.size()) {

                table.parentNode.replaceChild(make_table('grid', this.d_grid), table);
                this.displayed_grid = this.d_grid.copy();
            }
            else {

                var x, y;
                for (x = 0; x < this.d_grid.width; x++) {
                    for (y = 0; y < this.d_grid.height; y++) {


                        if ((this.d_grid[x][y]) !== (this.displayed_grid[x][y])) {

                            this.displayed_grid[x][y] = this.d_grid[x][y];
                            if (this.d_grid[x][y]) {
                                grid_tbody.childNodes[y].childNodes[x]
                                    .className = "live " + "g" + this.d_grid[x][y];
                            } else {
                                grid_tbody.childNodes[y].childNodes[x]
                                    .className = "dead";
                            }
                        }
                    }
                }
            }
        };

        this.refreshCell = function (x, y) {
            var table      = document.getElementById("grid");
            var grid_tbody = table.getElementsByTagName("tbody")[0];


            this.displayed_grid[x][y] = this.d_grid[x][y];

            if (this.d_grid[x][y]) {
                grid_tbody.childNodes[y].childNodes[x]
                    .className = "live " + "g" + this.d_grid[x][y];
            } else {
                grid_tbody.childNodes[y].childNodes[x]
                    .className = "dead";
            }
        };
    }

    CanvasView.prototype = new View();
    CanvasView.prototype.constructor = CanvasView;
    function CanvasView (grid, cellSize) {
        var self = this;

        self.d_grid         = grid;

        self.cellSize = cellSize || config.cell_size || 20;

        var border_width  = config.border_width; 
        var border_colour = config.border_colour;

        function drawCell(x, y) {
            var d      = self.draw;
            var offset = self.cellSize + border_width;

            d.fillStyle = config.g_colour[self.d_grid[x][y] || 0];

            d.fillRect(border_width + x * offset,
                       border_width + y * offset,
                       self.cellSize, self.cellSize);
        }


        function drawGrid(full) {


            for (x = 0; x < self.d_grid.width; ++x) {
                for (y = 0; y < self.d_grid.height; ++y) {
                    if (full || (self.d_grid[x][y]) !== (self.displayed_grid[x][y])) {

                        self.displayed_grid[x][y] = self.d_grid[x][y];

                        drawCell(x, y);
                    }
                }
            }
        }

        function makeCanvas () {
            var canvas = $('<canvas id="grid">');
            self.draw = canvas.get(0).getContext('2d');
            self.canvas = canvas.get(0);
        }

        function clearCanvas () {
            self.draw.fillStyle = border_colour;
            self.draw.fillRect(0, 0, self.c_width, self.c_height);
        }

        function setCanvasSize () {
            self.c_width  = border_width + self.d_grid.width  * (self.cellSize + border_width);
            self.c_height = border_width + self.d_grid.height * (self.cellSize + border_width);
            var canvas = self.canvas;
            canvas.setAttribute("width",  self.c_width);
            canvas.setAttribute("height", self.c_height);


            clearCanvas();
        }

        self.display = function () {
            CanvasView.prototype.display();

            makeCanvas();
            setCanvasSize();

            self.displayed_grid = grid.copy();
            drawGrid(true);

            $("#grid-div").append(self.canvas);
        };

        self.setCellSize = function (px) {
            self.cellSize = px;
            setCanvasSize();

            drawGrid(true);
        };

        self.refreshGrid = function () {
            if (self.displayed_grid.size() !== self.d_grid.size()) {
                self.displayed_grid = self.d_grid.copy();
                setCanvasSize();
                drawGrid(true);
            }
            drawGrid();
        };

        self.refreshCell = function (x, y) {

            self.displayed_grid[x][y] = self.d_grid[x][y];
            drawCell(x, y);
        };

        self.updateColours = function () {
            if (self.canvas) {
                drawGrid(true);
            }
        };
    }


    /* ************************* Modelado *********************** */

    Grid.prototype = []; 
    Grid.prototype.constructor = Grid; 

    Grid.prototype.copy = function () {
        var n = new Grid(this.width, this.height);
        var x, y;
        for (x = 0; x < this.width; ++x) {
            for (y = 0; y < this.height; ++y) {
                n[x][y] = this[x][y];
            }
        }
        return n;
    };

    Grid.prototype.size = function () {
        return "(" + this.width + ", " + this.height + ")";
    };

    Grid.prototype.setWidth = function (x) {
        if (x < this.width) {

            this.length = x; 
        }
        if (x > this.width) {

            var i;
            for (i = this.width; i < x; ++i) {
                this[i] = new Array(this.height);
            }
        }

        this.width = x;
    };

    Grid.prototype.setHeight = function (y) {
        if (y < this.height) {
            var i;
            for (i = 0; i < this.width; ++i) {
                this[i].length = y;
            }
        }
        this.height = y;
    };

    // La construcción
    function Grid(width, height) {
        if (isNaN(Number(width)) ||
            isNaN(Number(height))) {
            throw new Error(
                "La construcción de la cuadrícula necesita dos valores");
        }

        this.width  = width;
        this.height = height;

        this.length = width;
        var x;
        for (x = 0; x < width; ++x) {
            this[x] = new Array(height);
        }
    }


    function protoSupported() {
        function Test(){}
        Test.prototype = "aoeu";
        var test = new Test();
        if (test.__proto__ = "aoeu") {

            log.debug("__proto__ read OK");
        } else {
            log.debug("__proto__ read NOT OK");
            return false;
        }

        var test2 = new Test();
        test2.__proto__ = [];
        if (test2 instanceof Array) {

            log.debug("__proto__ write OK");
        } else {
            log.debug("__proto__ write NOT OK");
            return false;
        }
        return true;
    }


    if (protoSupported()) {
        Model.deSerialize = function (data) {
            var m = JSON.parse(data);
            m.__proto__ = Model.prototype;
            m.d_grid.__proto__ = Grid.prototype;

            return m;
        };
    } else {
        Model.deSerialize = function (data) {
            log.debug("Model using object reconstitution fallback.");
            var d = JSON.parse(data);
            log.debug(d);
            var m = new Model();
            m.d_grid = new Grid(d.d_grid.width, d.d_grid.height);

            for (p in d.d_grid) {

                m.d_grid[p] = d.d_grid[p];
            }
            for (p in d) {
                if (p !== 'd_grid') {
                    m[p] = d[p];
                }
            }

            m.__proto__ = Model.prototype;
            m.d_grid.__proto__ = Grid.prototype;

            return m;
        };
    }

    Model.serialize = function (model) {
        return JSON.stringify(model);
    };

    Model.prototype.grid = function () {
        return this.d_grid;
    };

    Model.prototype.generation = function () {
        return this.d_generation;
    };

    Model.prototype.cell = function (x, y, generation) {
        if (!(x >= 0 &&
              y >= 0)) {
            throw new Error("Model.point: must specify x and y coords");
        }

        if (typeof generation !== 'undefined') {
            this.d_grid[x][y] = generation;
        }
        return this.d_grid[x][y] || 0;
    };

    Model.prototype.reset = function () {
        this.init();
    };

    Model.prototype.tick = function () {
        this.d_grid = this.nextGeneration();
        ++this.d_generation;
    };

    Model.prototype.setWidth = function (x) {
        this.d_grid.setWidth(x);
    };

    Model.prototype.setHeight = function (y) {
        this.d_grid.setHeight(y);
    };

    Model.prototype.init = function () {
        this.d_grid       = new Grid(config.width, config.height);
        this.d_generation = 0;
    };


    Model.prototype.nextGeneration = function() {
        var ng = new Grid(this.d_grid.width, this.d_grid.height);

        var y, x, sum, prev;
        for (y = 0; y < ng.height; y++) {
            for (x = 0; x < ng.width; x++) {
                sum = this.area_sum(x, y);

                prev = this.d_grid[x][y] || 0;
                if (this.live_p(prev, sum)) {

                    ng[x][y] = prev < config.track_n_generations ? prev + 1 : prev;
                }
            }
        }
        return ng;
    };

    Model.prototype.live_p = function (generation, count) {
        if (generation) {
            // If alive
            if (count === 2 || count === 3) {
                // Stay alive
                return true;
            }
        } else {
            if (count === 3) {
                return true;
            }
        }
        return false;
    };


    Model.prototype.area_sum = function (point_x, point_y) {
        var sum = 0;
        var grid = this.d_grid; 
        var row, column;
        var nrow, ncolumn;


        for (row = point_y - 1; row <= point_y + 1; row = row + 2) {
            for (column = point_x - 1; column <= (point_x + 1); column++) {
                nrow    = row;
                ncolumn = column;

                if (config.wraparound) {
                    if (row < 0) {
                        nrow = grid.height - 1;
                    }
                    else if (row === grid.height) {
                        nrow = 0;
                    }

                    if (column < 0) {
                        ncolumn = grid.width - 1;
                    }
                    else if (column === grid.width) {
                        ncolumn = 0;
                    }
                } else {
                    if( row < 0        || column < 0 ||
                        row === grid.height || column === grid.width) {

                        continue;
                    }
                }

                if (grid[ncolumn][nrow]) {
                    ++sum;
                }
            }
        }


        row = point_y;
        for (column = point_x - 1; column <= (point_x + 1); column += 2) {
            ncolumn = column;
            if (config.wraparound) {
                if (ncolumn < 0) {
                    ncolumn = grid.width - 1;
                } else if (ncolumn === grid.width) {
                    ncolumn = 0;
                }
            } else {
                if (column < 0 || column === grid.width) {
                    continue;
                }
            }

            if (grid[ncolumn][row]) {
                ++sum;
            }
        }
        return sum;
    };

    function Model() {
        this.init();
    }

    /* ****************   Funciones auxiliares ************** */

    function run_qunit_tests() {
        $("head").append('<link rel="stylesheet" type="text/css"'
                         + ' href="test/qunit.css"></style>');
        $("body").prepend(
            '<div><h1 id="qunit-header">QUnit</h1>'
                +'<h2 id="qunit-banner"></h2>'
                + '<h2 id="qunit-userAgent"></h2>'
                + '<ol id="qunit-tests"></ol></div><br><br><br>'
        );

    }


    function colour_to_hex(string) {
        var hex = /#(?:[0-9a-fA-F]{3}){1,2}/.exec(string);
        if (hex && hex.length === 1) {
            return hex[0];
        }

        if (/rgb\((\d{0,3}), (\d{0,3}), (\d{0,3})\)/.test(string)) {
            return rgb_to_hex(string);
        }

        throw new Error("colour_to_hex: failed to match hex or rgb. "
                        + "It's probably a named colour which I can't deal "
                        + "with. Given string: \"" + string + '"');
    }


    function rgb_to_hex(string) {
        var regex = /^rgb\((\d{0,3}), (\d{0,3}), (\d{0,3})\)$/;
        var captures  = regex.exec(string);
        if (!captures || captures.length != 4) {
            throw new Error(
                "rgb_to_hex: string did not match expected pattern");
        }

        var hex = "#";
        var i, s;
        for (i = 1; i < 4; ++i) {
            s = Number(captures[i]).toString(16);
            if (s.length === 1) {
                s = '0' + s;
            }
            hex += s;
        }
        return hex;
    }


    function curry(method) {
        if (! (method instanceof Function)) {
            throw new Error("curry: first argument must be a Function");
        }


        var curried = Array.prototype.slice.call(arguments, 1);

        return function() {

            var args = curried.slice(0); 

            args = args.concat(arguments);

            return method.apply(this, args);
        };
    }


    function Clock(func, period) {
        this.timer = null;
        this.func = func;
        this.period = period;

        this.setPeriod = function (period) {
            this.period = period;
            if (this.timer !== null) {
                this.stop();
                this.start();
            }
        };

        this.start = function () {
            if (this.timer === null) {
                this.timer = setInterval(this.func, this.period);
            }
        };

        this.stop = function () {
            if (this.timer !== null) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        };
    }


    return {
        load: load,
        reset: reset,
        tick: tick,
        start: start,
        stop: stop,
        toggle_cell: toggle_cell,

        Grid: Grid,
        Model: Model,
        View: View,
        TableView: TableView,
        CanvasView: CanvasView,
        view: view,
        model: model,
        clock: clock,
        config: config,
        drawing: drawing,

        rgb_to_hex: rgb_to_hex,
        test: run_qunit_tests
    };
}();

window.onload = life.load;
