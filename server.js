/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */
require('dotenv').config()
var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');
const { request } = require('http');
const Movies = require('./Movies');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();
const SECRET = process.env.SECRET_KEY

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

function getUsername(req){
    const token = req.headers.authorization.split(' ')[1]

    return jwt.verify(token, SECRET, (error, decoded) => {
        return decoded.username
    })
}

router.route('/movies')
    .all(passport.authenticate('jwt', { session: false }))
    .get( function(req,res)  {
        const title = req.query.title
        if(req.query.reviews === 'true')
        {
            Movies.aggregate([
                {$match: {title}},
                {
                    $lookup: {
                        from: 'reviews',
                        localField: '_id',
                        foreignField: 'movieId',
                        as: 'reviews'
                    }
                }
            ]).exec(function(err, result){
                if(err){
                    return res.status(500).json(JSON.stringify(err))
                }else{
                    res.json(result[0])
                }
            })
            
        }else{
            Movie.find({title}, (err,result) => {
                console.log(err, result)
                if(err){
                    res.status(500).json(JSON.stringify(err))
                }else{
                    res.json(result[0])
                }
            })
        }
    })
    
    .post( function(req,res) {
        
        const json = req.body
        const movie = new Movie({...json})
        movie.save((err) => {
            if(err){
                res.status(500).json(JSON.stringify(err))
            }
            else{
                return res.json({message: 'Success!'})
            }
        })

    })

    .delete(authController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200).json({

            status: 200,
            message: 'movie deleted',
            headers: req.headers,
            query: req.query,
            env: process.env.UNIQUE_KEY
        });;
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        res.json(o);
    }
    )

    .put(authJwtController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200).json({

            status: 200,
            message: 'movie updated',
            headers: req.headers,
            query: req.query,
            env: process.env.UNIQUE_KEY
        });
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        res.json(o);
    })

    .all(function(req,res){

        res.status(405).json('Does not support the HTTP method');
    });



router.route("/reviews")
.all(passport.authenticate('jwt', { session: false }))
.post(function (req, res){
    const username = getUsername(req)
    const json = req.body
    const reviewObj = new Review({username,
        movieId: json.movieId,
        rating: json.rating,
        review: json.review
    })

    reviewObj.save(() => {
        return res.status(200).json({message: 'Review created!'})
    })
})

.all(function(req,res){

    res.status(405).json('Does not support the HTTP method');
});


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only




