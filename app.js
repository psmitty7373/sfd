var express = require('express');
var fs = require('fs');
var app = express();
var multer = require('multer');
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var async = require('async');
var path = require('path');
var upload = multer({dest: './temp_uploads'});

app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function getDir(dir, cb) {
    var resp = new Array();
    if (dir === './root') {
        resp.push({
            "id": '/',
            "text": '/',
            "icon" : 'jstree-custom-folder',
            "state": {
                "opened": true,
                "disabled": true,
                "selected": false
            },
            "li_attr": {
                "base": '#',
                "isLeaf": false
            },
            "a_attr": {
                "class": 'droppable'
            },
            "children": null
        });
    }
    fs.readdir(dir, function(err, list) {
        var children = new Array();
        list.sort(function(a, b) {
            return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
        }).forEach(function(file, key) {
            children.push(processNode(dir, file));
        });
        if (dir === './root') {
            resp[0].children = children;
            cb(resp);
        } else
            cb(children);
    });
}

function processNode(dir, f) {
    var s = fs.statSync(path.join(dir, f));
    var base = path.join(dir, f);
    var rel = path.relative(path.join(__dirname, '/root/'), base);
    return {
        "id": rel,
        "text": f,
        "icon" : s.isDirectory() ? 'jstree-custom-folder' : 'jstree-custom-file',
        "state": {
            "opened": false,
            "disabled": false,
            "selected": false
        },
        "li_attr": {
            "base": rel,
            "isLeaf": !s.isDirectory()
        },
        "a_attr": {
            "class": (s.isDirectory() ? 'droppable' : '')
        },
        "children": s.isDirectory()
    };
}

app.get('/', function (req, res) {
    res.render('index', { title: 'Simple File Drop'});
});

app.post('/dir/', function (req, res) {
    var dir = req.body.id;
    if (dir && dir !== '#') {
        dir = path.normalize(dir).replace(/^(\.\.[\/\\])+/, '');
        dir = path.join(__dirname + '/root/', dir);
        var s = fs.statSync(dir);
        if (s.isDirectory()) {
            getDir(dir, function(r) {
                res.send(r);
            })
        } else {
            res.status(404).send('Not found');
        }
    } else {
        getDir('./root', function(r) {
            res.send(r);
        });
    }
});

app.use('/download', express.static(path.join(__dirname, 'root'), {
    etag: false,
    setHeaders: function(res, path) {
        res.attachment(path);
    }

}))

app.post('/mkdir', function (req, res) {
    var id = req.body.id;
    var name = req.body.name;
    if (id && name) {
        var dir = path.normalize(id).replace(/^(\.\.[\/\\])+/, '');
        name = path.normalize('/' + name + '/').replace(/^(\.\.[\/\\])+/, '');
        dir = path.join(path.join(path.join(__dirname, '/root/'), dir), name);
        fs.stat(dir, function (err, s) {
            if (err == null)
                res.status(500).send('mkdir error');
            else if (err.code == 'ENOENT') {
                fs.mkdir(dir,function(err){
                    if(err)
                        res.status(500).send('mkdir error');
                    else
                        res.send('{}');
               });
            } else {
                res.status(500).send('mkdir error');
            }
        });
    } else
        res.status(404).send('Y U bein wierd?');
});

app.post('/mv', function (req, res) {
    var dst = req.body.dst;
    var src = req.body.src;
    if (dst && src) {
        var dstdir = path.normalize(dst).replace(/^(\.\.[\/\\])+/, '');
        var srcdir = path.normalize(src).replace(/^(\.\.[\/\\])+/, '');
        dstdir = path.join(path.join(__dirname, '/root/'), dstdir);
        srcdir = path.join(path.join(__dirname, '/root/'), srcdir);
        fs.stat(dstdir, function (err, s) {
            if (s.isDirectory()) {
                fs.stat(srcdir, function (err, s) {
                    if (s.isDirectory() || s.isFile()) {
                        fs.rename(srcdir, dstdir + '/' + path.basename(srcdir), function(err) {
                            if (err)
                                res.status(500).send('mv error');
                            res.send('{}');
                        });
                    } else
                        res.status(500).send('mv error');
                });
            } else 
                res.status(500).send('mv error');
        });
    } else
        res.status(404).send('Y U bein wierd?');
});

app.post('/delete', function (req, res) {
    var id = req.body.id;
    if (id) {
        var dir = path.normalize(id).replace(/^(\.\.[\/\\])+/, '');
        dir = path.join(path.join(__dirname, '/root/'), dir);
        fs.stat(dir, function (err, s) {
            if (err)
                res.status(500).send('delete error');
            if (s.isDirectory()) {
                fs.rmdir(dir,function(err){
                    if(err)
                        res.status(500).send('delete error');
                    else
                        res.send('{}');
               });
            } else {
                fs.unlink(dir,function(err){
                    if(err)
                        res.status(500).send('delete error');
                    else
                        res.send('{}');
               });
            }
        });
    } else
        res.status(404).send('Y U bein wierd?');
});

app.post('/upload', upload.any(), function (req, res) {
    if (req.body.dir && req.body.dir.indexOf('_anchor')) {
        var dir = req.body.dir.substring(0,req.body.dir.indexOf('_anchor'));
        dir = path.normalize(dir).replace(/^(\.\.[\/\\])+/, '');
        dir = path.join(__dirname + '/root/', dir);
        async.each(req.files, function(file, callback) {
            fs.rename(file.path, dir + '/' + file.originalname, function(err) {
                if (err)
                    res.status(500).send('delete error');
                callback();
            });
        }, function() {
            res.send('{}');
            getDir('./root', function(resp) {
            });
        });
    } else
       res.status(404).send('Y U bein wierd?'); 
});

http.listen(4000, function () {
    console.log('Server listening on port 4000!');
});
