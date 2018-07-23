cos = Math.cos;
sin = Math.sin;
PI = Math.PI;

function init_paths(drawing, n) {
    var result = [];
    for (var i=0; i<n; i++) {

        result.push(drawing.path("M 0 0").attr('fill', 'none').stroke({width: stroke_width, color: '#000'}));

    }
    return result;
}

function draw2d(points) {
    path2d.attr("d", "M " + (origin2d[0] + points[0])  + " " + (origin2d[1] - points[1])
                + " C " + (origin2d[0] + points[2]) + " " +  (origin2d[1] - points[3])
                + " " + (origin2d[0] + points[4]) + " " +  (origin2d[1] - points[5]
                        + " " + (origin2d[0] + points[6]) + " " +  (origin2d[1] - points[7])));
}

function draw_iso3d(points) {
    var n = 0;
    paths_iso3d.forEach(function (path, i, paths_iso3d) {
        var y_scale = 0.25;
        var angle = 2*Math.PI * i / granularity;
        //
        path.attr("d", "M " + (origin2d[0] + points[0] * Math.cos(angle)) // Starting point of the curve
                  + " " + (origin2d[1] - (points[1] + y_scale * points[0] * Math.sin(angle)))

                  + " C " + (origin2d[0] + points[2] * Math.cos(angle)) // Control point
                  + " " + (origin2d[1] - ( points[3] + y_scale * points[2] * Math.sin(angle)))
                  + " " + (origin2d[0] + points[4] * Math.cos(angle)) // Control point
                  + " " + (origin2d[1] - ( points[5] + y_scale * points[4] * Math.sin(angle)))

                  + " " +(origin2d[0] + points[6] * Math.cos(angle)) // Endpoint
                  + " " + (origin2d[1] -(points[7] +  y_scale * points[6] * Math.sin(angle))));
    });
}

function draw3d(points, cam) {

    paths3d.forEach(function (path, i, paths3d) {
        //var z_scale = 0.25;
        var angle = 2*Math.PI * i / granularity;
        //
        try {
            path.attr("d", "M " + cam.img_coords([points[0]* Math.sin(angle),
                                                  points[1], points[0]* Math.cos(angle)])
                      + " C " +cam.img_coords([points[2]* Math.sin(angle),
                                               points[3], points[2]* Math.cos(angle)])

                      + " " +cam.img_coords([points[4]* Math.sin(angle),
                                             points[5], points[4]* Math.cos(angle)])
                      + " " +cam.img_coords([points[6]* Math.sin(angle),
                                             points[7], points[6]* Math.cos(angle)]));
        } catch (e) {
            path.attr("d", "M 0 0");
        }

    });

}

function normalize(v) {
    var len = math.distance([0, 0, 0], v);
    return v.map(x => x / len);
}



function Camera(eye_spherecoords, gaze_pt, origin_2d, f) {
    var w = [];
    eye = sphere_to_cart(eye_spherecoords);
    this.eye_spherecoords = eye_spherecoords;
    console.log(eye_spherecoords, eye);
    this.gaze_pt = gaze_pt;
    this.f = f;
    eye.forEach(function(value, i) {
        w.push(gaze_pt[i] - value);
    });
    w = normalize(w);
    var u = normalize(math.cross(w, [0, 1, 0]));
    var v = normalize(math.cross(u, w));
    var w2c = [u, v, w];
    var c2w = [];
    u.forEach(function (item, index) {
        c2w.push([item, v[index], w[index], eye[index]]);
    });
    c2w.push([0, 0, 0, 1]);
    w2c.forEach(function (item, index) {
        w2c[index].push(-math.dot([u, v, w][index], eye));
    });
    w2c.push([0, 0, 0, 1]);
    this.w2c = w2c;
    this.c2w = c2w;
    //console.log(w2c, c2w, math.multiply(w2c, [[0], [0], [0], [1]]));
    this.img_coords = function (point3d) {
        point3d = point3d.map(x => [x]);
        if (point3d.length == 3) {
            point3d.push([1]);
        }

        //console.log(point3d);
        result = math.multiply(w2c, point3d).slice(0,3);
        if (result[2] < this.f) {
            //throw "Behind view plane";
        }
        result = result.map(x => (x * this.f / result[2]));
        if (isNaN(result[0]) || isNaN(result[1])
                || !isFinite(result[0]) || !isFinite(result[1])) {
            throw "Bad img coords";
        }
        result =  "" + (result[0] +origin3d[0]).toFixed(2)
                  + " " + (result[1] +origin3d[1]).toFixed(2);
        //console.log(result);
        return result;
    };
    this.step = PI / 90;
    this.left = function() {
        var eye_spherecoords = this.eye_spherecoords;
        eye_spherecoords[1] = (eye_spherecoords[1] - this.step) % (2 * PI);
        return new Camera(eye_spherecoords, this.gaze_pt, this.origin_2d, this.f);
    };
    this.right = function() {
        var eye_spherecoords = this.eye_spherecoords;
        eye_spherecoords[1] = (eye_spherecoords[1] + this.step) % (2 * PI);
        return new Camera(eye_spherecoords, this.gaze_pt, this.origin_2d, this.f);
    };
    this.up = function() {
        var eye_spherecoords = this.eye_spherecoords.slice();
        eye_spherecoords[0] =Math.max(0, eye_spherecoords[0] - 10);
        return new Camera(eye_spherecoords, this.gaze_pt, this.origin_2d, this.f);
    };
    this.down = function() {
        var eye_spherecoords = this.eye_spherecoords.slice();
        eye_spherecoords[0] += 10;
        return new Camera(eye_spherecoords, this.gaze_pt, this.origin_2d, this.f);
    };
}
function randomize() {
    transition.activate(ticks_recent);
}

function Transition() {
    this.active = false;
    this.prev_shape = null;
    this.next_shape = null;
    this.difference = null;
    this.transition_start = 0;
    this.activate = function(ticks) {
        this.active = true;
        this.transition_start = ticks;
        this.prev_shape = input_points.map(x => parseFloat(x.value)).map(x => isNaN(x) ? 0 : x);
        input_points.forEach(function(item) {
            item.value = 400 * (Math.random()-.5);
        });
        var next_shape = this.next_shape = input_points.map(x => parseFloat(x.value)).map(x => isNaN(x) ? 0 : x);
        var difference = [];
        this.prev_shape.forEach(function(item, i) {
            difference.push(next_shape[i] - item);
        });
        this.difference = difference;
    };
    this.points = function(ticks) {
        var time_elapsed = ticks - this.transition_start;
        var duration = 1000;
        console.log(time_elapsed, duration);
        if (time_elapsed > duration) {
            this.active = false;
            return this.next_shape;
        } else {
            result = [];
            var difference = this.difference;
            this.next_shape.forEach(function(item, i) {
                result.push(item - difference[i] * (1 - time_elapsed / duration));
            });
            console.log(time_elapsed / duration, this.prev_shape, this.next_shape, result);

            return result;
        }
    };
}
function sphere_to_cart(spherecoords) { // Not currently used
    return [spherecoords[0] * sin(spherecoords[1]) * cos(spherecoords[2]),
            spherecoords[0] * sin(spherecoords[1]) * sin(spherecoords[2]),
            spherecoords[0] * cos(spherecoords[1])];
}

function draw_grid() { // Not currently used
    var divisions =50;
    for (var j=0; j<divisions; j++) {
        for (var i=0; i<divisions*2; i++) {


            console.log(sphere_to_cart([100, i*PI/20, j*PI/20]));
            console.log(cam.img_coords(sphere_to_cart([100, i*PI/20, j*PI/20])));
            grid3d.push(drawing3d.path("M " + cam.img_coords(sphere_to_cart([grid_size, i*PI/divisions, j*PI/divisions])) + " L " + cam.img_coords(sphere_to_cart([grid_size, (i)*PI/divisions, (j-1)*PI/divisions]))).attr('fill', 'none').stroke({width: stroke_width, color: '#000'}));
            grid3d.push(drawing3d.path("M " + cam.img_coords(sphere_to_cart([grid_size, i*PI/divisions, j*PI/divisions])) + " L " + cam.img_coords(sphere_to_cart([grid_size, (i-1)*PI/divisions, (j)*PI/divisions]))).attr('fill', 'none').stroke({width: stroke_width, color: '#000'}));
            grid3d.push(drawing3d.path("M " + cam.img_coords(sphere_to_cart([grid_size, i*PI/divisions, j*PI/divisions])) + " L " + cam.img_coords(sphere_to_cart([grid_size, (i-1)*PI/divisions, (j-1)*PI/divisions]))).attr('fill', 'none').stroke({width: stroke_width, color: '#000'}));
        }
    }
}

var ticks_recent = 0;
var svg_size = 1000;
var preview_size = 500;
var stroke_width = 0.1;
var granularity = 500;
var drawing2d = SVG('drawing2d').size(preview_size, preview_size);
var drawing_iso3d = SVG('drawing_iso3d').size(preview_size, preview_size);
var drawing3d = SVG('drawing3d').size(svg_size, svg_size);
var origin2d = [preview_size/2, preview_size/2];
var origin3d = [svg_size/2, svg_size/2];
var input_points = ["x1", "y1", "x2", "y2", "x3", "y3", "x4", "y4"].map(x => document.getElementById(x));
transition = new Transition();
path2d = drawing2d.path("M 0 0").attr('fill', 'none').stroke({width: 0.5, color: '#000'});
var points = input_points.map(x => parseFloat(x.value)).map(x => isNaN(x) ? 0 : x);
var grid_size = 500;
paths_iso3d = init_paths(drawing_iso3d, granularity);
paths3d = init_paths(drawing3d, granularity);
grid3d = init_paths(drawing3d, grid_size);

var cam = new Camera([900, 0, 0], [0, 0, 0], origin3d, -700);


function draw_all(ticks) {
    ticks_recent = ticks;
    points = input_points.map(x => parseFloat(x.value)).map(x => isNaN(x) ? 0 : x);
    if (transition.active) {
        points = transition.points(ticks);
        //console.log(points);
    }
    draw2d(points);
    draw_iso3d(points);
    draw3d(points, cam);
    requestAnimationFrame(draw_all);
}

SVG.on(document, 'keydown', function(e) {
    switch(e.keyCode) {
    case 37:
        //console.log("Left");
        //console.log(cam);
        cam = cam.left();
        //console.log(cam);
        e.preventDefault();
        break;
    case 38:
        //console.log("Up");
        //console.log(cam);
        cam = cam.up();
        //console.log(cam);
        e.preventDefault();
        break;
    case 39:
        //console.log("Right");
        //console.log(cam);
        cam = cam.right();
        //console.log(cam);
        e.preventDefault();
        break;
    case 40:
        //console.log("Down");
        //console.log(cam);
        cam = cam.down();
        //console.log(cam);
        e.preventDefault();
        break;
    default:
        //console.log(e);
    }
});

draw_all(0);
